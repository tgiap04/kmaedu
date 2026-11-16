import { posix } from 'path';
import {
    BeforeApplicationShutdown,
    Injectable,
    Logger,
    OnApplicationBootstrap,
} from '@nestjs/common';
import { ownedR2Key } from '@kmaedu/common';
import { OutboxService, R2DeleteTaskWriter } from '@kmaedu/messaging';
import { R2Client } from '../../clients/r2.client';
import { Prisma, PrismaService, UserStorage } from '../../prisma';
import {
    AI_UPLOAD_AREAS,
    DocumentStatus,
    UPLOAD_BACKOFF_SECONDS,
    UPLOAD_CONCURRENCY,
    UPLOAD_DEADLINE_MS,
    UPLOAD_FAILED_STORAGE_UNAVAILABLE,
    UPLOAD_LEASE_SECONDS,
    UPLOAD_MAX_ATTEMPTS,
    UPLOAD_POLL_MS,
} from '../../config/document.constants';
import { DocumentQueueService } from './document-queue.service';
import { DocumentRepository } from './document.repository';
import { StagingClaim, UploadStagingRepository } from './upload-staging.repository';

const ERROR_MAX_CHARS = 500;

/**
 * Worker role: stores the bytes `CreateUpload` staged into R2 and hands the document to ai-service.
 *
 * Per staged row: claim (lease) -> upload under the key fixed at accept time (long deadline) ->
 * presign -> ONE tx: UPLOADING -> PENDING, staging dropped, `document.uploaded`. An error backs off
 * (`UPLOAD_BACKOFF_SECONDS`); after `UPLOAD_MAX_ATTEMPTS` one tx sets FAILED, drops the staging row,
 * queues the key for deletion (a half-finished or orphaned object) and writes `document.upload_failed`.
 * A row deleted meanwhile never gets an event, and a key the worker stored for it is queued for deletion.
 */
@Injectable()
export class DocumentUploadWorker implements OnApplicationBootstrap, BeforeApplicationShutdown {
    private readonly logger = new Logger(DocumentUploadWorker.name);
    private readonly pollMs = Number(process.env.DOCUMENT_UPLOAD_POLL_MS) || UPLOAD_POLL_MS;
    private running = false;
    private loop: Promise<void> | null = null;
    private readonly wakers = new Set<() => void>();

    constructor(
        private readonly prisma: PrismaService,
        private readonly docs: DocumentRepository,
        private readonly staging: UploadStagingRepository,
        private readonly r2: R2Client,
        private readonly queue: DocumentQueueService,
        private readonly r2Deletes: R2DeleteTaskWriter,
        private readonly outbox: OutboxService
    ) {}

    onApplicationBootstrap(): void {
        this.running = true;
        // A slow upload (minutes on a poor link) must not hold every other staged upload back.
        this.loop = Promise.all(Array.from({ length: UPLOAD_CONCURRENCY }, () => this.run())).then(() => undefined);
    }

    async beforeApplicationShutdown(): Promise<void> {
        this.running = false;
        this.wakers.forEach((wake) => wake());
        await this.loop;
    }

    /** Claims and processes one staged upload; false when none is due. */
    async tick(): Promise<boolean> {
        const claim = await this.staging.claimNext(UPLOAD_LEASE_SECONDS);
        if (!claim) return false;
        await this.process(claim);
        return true;
    }

    private async process(claim: StagingClaim): Promise<void> {
        const row = await this.docs.findRaw(this.prisma, claim.storageId);
        if (!row || row.processingStatus !== DocumentStatus.UPLOADING) {
            // Deleted (its staging row cascades away) or already settled: nothing left to upload.
            await this.staging.remove(this.prisma, claim.storageId);
            return;
        }
        if (claim.attempts > UPLOAD_MAX_ATTEMPTS) {
            return this.giveUp(row, claim, 'a previous attempt never finished');
        }
        const data = await this.staging.loadData(claim.storageId);
        if (!data) return;

        let downloadUrl: string;
        try {
            await this.store(row, data);
            downloadUrl = await this.queue.downloadUrl(row);
        } catch (error) {
            return this.failAttempt(row, claim, error);
        }
        await this.complete(row, claim, downloadUrl);
    }

    private async store(row: UserStorage, data: Buffer): Promise<void> {
        const key = await this.r2.uploadFile(
            posix.basename(row.keyR2),
            data,
            row.mimetype,
            posix.dirname(row.keyR2),
            UPLOAD_DEADLINE_MS
        );
        if (key !== row.keyR2) throw new Error(`R2 stored the file under ${key}, expected ${row.keyR2}`);
    }

    private async complete(row: UserStorage, claim: StagingClaim, downloadUrl: string): Promise<void> {
        const outcome = await this.prisma.$transaction(async (tx) => {
            if (await this.docs.markUploaded(tx, row.id)) {
                await this.staging.remove(tx, row.id);
                const queued = { ...row, processingStatus: DocumentStatus.PENDING, queuedAt: new Date() };
                await this.queue.recordUploaded(tx, queued, downloadUrl);
                return 'queued';
            }
            if (await this.docs.findRaw(tx, row.id)) return 'settled';
            await this.enqueueKeyDelete(tx, row);
            return 'deleted';
        });
        if (outcome === 'queued') this.logger.log(`Document ${row.id} stored in R2 (attempt ${claim.attempts}), queued for OCR`);
        else if (outcome === 'settled') this.logger.warn(`Document ${row.id} was already settled by another worker`);
        else this.logger.warn(`Document ${row.id} was deleted during its upload; ${row.keyR2} queued for deletion`);
    }

    private async failAttempt(row: UserStorage, claim: StagingClaim, error: unknown): Promise<void> {
        const message = ((error as Error)?.message ?? String(error)).slice(0, ERROR_MAX_CHARS);
        if (claim.attempts >= UPLOAD_MAX_ATTEMPTS) return this.giveUp(row, claim, message);
        const delay = UPLOAD_BACKOFF_SECONDS[claim.attempts - 1] ?? UPLOAD_BACKOFF_SECONDS[UPLOAD_BACKOFF_SECONDS.length - 1];
        this.logger.warn(
            `Upload of document ${row.id} failed (attempt ${claim.attempts}/${UPLOAD_MAX_ATTEMPTS}), retry in ${delay}s: ${message}`
        );
        if (await this.staging.scheduleRetry(claim, delay, message)) return;
        // The staging row is gone: the document was deleted mid-upload. What reached R2 must not stay there.
        await this.prisma.$transaction(async (tx) => {
            if (!(await this.docs.findRaw(tx, row.id))) await this.enqueueKeyDelete(tx, row);
        });
    }

    private async giveUp(row: UserStorage, claim: StagingClaim, reason: string): Promise<void> {
        const failed = await this.prisma.$transaction(async (tx) => {
            const marked = await this.docs.markUploadFailed(tx, row.id);
            await this.staging.remove(tx, row.id);
            // Only an object nobody owns is deleted: this worker failed the row, or the row is gone. A row
            // another worker completed after this lease expired is PENDING and its object is live.
            if (marked || !(await this.docs.findRaw(tx, row.id))) await this.enqueueKeyDelete(tx, row);
            if (marked) {
                await this.outbox.add(tx, 'document.upload_failed', {
                    storageId: row.id,
                    userId: row.userId,
                    reason: UPLOAD_FAILED_STORAGE_UNAVAILABLE,
                });
            }
            return marked;
        });
        this.logger.error(
            `Upload of document ${row.id} abandoned after ${claim.attempts} attempt(s)${failed ? '' : ' (row already gone)'}: ${reason}`
        );
    }

    private enqueueKeyDelete(tx: Prisma.TransactionClient, row: UserStorage): Promise<number> {
        return this.r2Deletes.enqueue(tx, [ownedR2Key(row.keyR2, AI_UPLOAD_AREAS, row.userId)]);
    }

    private async run(): Promise<void> {
        while (this.running) {
            let claimed = false;
            try {
                claimed = await this.tick();
            } catch (err) {
                this.logger.error(`Upload worker tick failed: ${(err as Error).message}`);
            }
            if (this.running && !claimed) await this.sleep();
        }
    }

    private sleep(): Promise<void> {
        return new Promise<void>((resolve) => {
            const timer = setTimeout(done, this.pollMs);
            const wakers = this.wakers;
            wakers.add(done);
            function done() {
                clearTimeout(timer);
                wakers.delete(done);
                resolve();
            }
        });
    }
}
