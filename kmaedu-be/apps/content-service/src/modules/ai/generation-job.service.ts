import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { GenerateIdService } from '@kmaedu/common';
import { OutboxService } from '@kmaedu/messaging';
import { GenerationJob, PrismaService } from '../../prisma';
import { GenerationJobRepository } from './generation-job.repository';
import { GenerationLockService } from './generation-lock.service';
import { buildGenerationRequested } from './generation-requested-payload';
import {
    GenerationType,
    JobStatus,
    OPEN_STATUSES,
    IN_FLIGHT_STATUSES,
    resolveJobTimeoutMs,
    REAPER_BATCH,
    UPLOAD_FAILED_ERROR,
} from './generation.constants';

export interface GenerationOptions {
    numItems: number;
    isNarrowSearch: boolean;
    keyword?: string;
}

export interface SubmitJobInput {
    userId: string;
    storageId: string;
    filename: string;
    type: GenerationType;
    options: GenerationOptions;
    /** Model id from the registry; empty = ai-service default. */
    model?: string;
    /**
     * Presigned GET of the document, so ai-service can process a document that has no chunks yet instead
     * of waiting for the OCR pipeline. Best effort: absent when document-service could not sign one.
     */
    download?: { url: string; mimetype: string };
}

export interface SubmittedJob {
    jobId: string;
}

/** What one reaper pass settled. */
export interface ReapResult {
    timedOut: number;
}

const notCancellable = () =>
    new ConflictException({ statusCode: 409, code: 'JOB_NOT_CANCELLABLE', message: 'Không thể hủy job đã hoàn thành hoặc thất bại' });

/**
 * The lifecycle of one generation job. A document still UPLOADING parks the job WAITING_UPLOAD (no event)
 * until `document.uploaded` queues it. `submit` inserts the job QUEUED together with its
 * `content.generation.requested` outbox row in ONE transaction, so a job never exists without the event
 * that makes ai-service work on it. Every later status change is conditional (see the repository), so the
 * result event, a cancel and the watchdog settle a job exactly once.
 */
@Injectable()
export class GenerationJobService {
    private readonly logger = new Logger(GenerationJobService.name);
    private readonly jobTimeoutMs = resolveJobTimeoutMs(process.env, this.logger);

    constructor(
        private readonly prisma: PrismaService,
        private readonly jobs: GenerationJobRepository,
        private readonly locks: GenerationLockService,
        private readonly outbox: OutboxService,
        private readonly ids: GenerateIdService
    ) {}

    async submit(input: SubmitJobInput): Promise<SubmittedJob> {
        const id = this.ids.generateId();
        await this.prisma.$transaction(async (tx) => {
            await this.jobs.insert(tx, {
                id,
                userId: input.userId,
                storageId: input.storageId,
                filename: input.filename,
                type: input.type,
                status: JobStatus.QUEUED,
                options: { ...input.options },
                model: input.model || undefined,
            });
            await this.outbox.add(
                tx,
                'content.generation.requested',
                buildGenerationRequested({ jobId: id, ...input })
            );
        });
        return { jobId: id };
    }

    /**
     * The document is still UPLOADING in document-service: the job is inserted WAITING_UPLOAD with NO outbox
     * row (ai-service has nothing to download yet). `startWaitingForUpload` / `failWaitingForUpload` move it on.
     */
    async submitWaitingForUpload(input: Omit<SubmitJobInput, 'download'>): Promise<SubmittedJob> {
        const id = this.ids.generateId();
        await this.jobs.insert(this.prisma, {
            id,
            userId: input.userId,
            storageId: input.storageId,
            filename: input.filename,
            type: input.type,
            status: JobStatus.WAITING_UPLOAD,
            options: { ...input.options },
            model: input.model || undefined,
        });
        return { jobId: id };
    }

    /**
     * `document.uploaded`: every WAITING_UPLOAD job of the user for that document -> QUEUED, each with the
     * `content.generation.requested` row in ONE transaction. The conditional transition is the guard (a
     * replay or a racing second path finds the job QUEUED and writes no second event). Returns the count promoted.
     */
    async startWaitingForUpload(userId: string, storageId: string, download?: { url: string; mimetype: string }): Promise<number> {
        let started = 0;
        for (const job of await this.jobs.findWaitingForUpload(userId, storageId)) {
            const promoted = await this.prisma.$transaction(async (tx) => {
                if (!(await this.jobs.transition(tx, job.id, [JobStatus.WAITING_UPLOAD], JobStatus.QUEUED))) return false;
                await this.outbox.add(
                    tx,
                    'content.generation.requested',
                    buildGenerationRequested({
                        jobId: job.id,
                        userId: job.userId,
                        storageId: job.storageId,
                        type: job.type,
                        options: job.options as unknown as GenerationOptions,
                        model: job.model,
                        download,
                    })
                );
                return true;
            });
            if (promoted) started += 1;
        }
        return started;
    }

    /** `document.upload_failed`: the WAITING_UPLOAD jobs of the document -> FAILED `UPLOAD_FAILED`, locks released after the commit. */
    async failWaitingForUpload(userId: string, storageId: string): Promise<number> {
        let failed = 0;
        for (const job of await this.jobs.findWaitingForUpload(userId, storageId)) {
            if (!(await this.jobs.transition(this.prisma, job.id, [JobStatus.WAITING_UPLOAD], JobStatus.FAILED, { error: UPLOAD_FAILED_ERROR }))) continue;
            failed += 1;
            await this.locks.releaseAfterTerminal(job);
        }
        return failed;
    }

    /** `DELETE job/:id`. CANCELLED is idempotent (a second call answers 200); COMPLETED / FAILED jobs are 409. */
    async cancel(job: GenerationJob): Promise<void> {
        if (await this.jobs.transition(this.prisma, job.id, OPEN_STATUSES, JobStatus.CANCELLED)) {
            await this.locks.releaseAfterTerminal(job);
            return;
        }
        const current = await this.jobs.findById(this.prisma, job.id);
        if (current?.status !== JobStatus.CANCELLED) throw notCancellable();
    }

    /**
     * Worker, every minute (the watchdog): a QUEUED / PROCESSING job nobody answered must not stay open
     * forever. A result that arrives later finds the job FAILED and is ignored by the conditional consumers.
     */
    async reap(now = new Date()): Promise<ReapResult> {
        let timedOut = 0;
        const silent = await this.jobs.findStuckInFlight(new Date(now.getTime() - this.jobTimeoutMs), REAPER_BATCH);
        for (const job of silent) {
            if (!(await this.jobs.transition(this.prisma, job.id, IN_FLIGHT_STATUSES, JobStatus.FAILED, { error: 'GENERATION_TIMEOUT' }))) continue;
            timedOut += 1;
            await this.locks.releaseAfterTerminal(job);
        }
        return { timedOut };
    }
}
