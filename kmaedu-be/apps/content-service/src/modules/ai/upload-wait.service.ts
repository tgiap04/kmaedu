import { Injectable, Logger } from '@nestjs/common';
import { Metadata } from '@grpc/grpc-js';
import { DocumentClient } from '@kmaedu/grpc';
import { processingStatusName } from './document-mapper';
import { GenerationJobRepository } from './generation-job.repository';
import { GenerationJobService, GenerationOptions } from './generation-job.service';
import { GenerationLockService } from './generation-lock.service';
import { GenerationType } from './generation.constants';

/** The HTTP answer of a generation request. */
export interface GenerationStarted {
    jobId: string;
    status: string;
    message: string;
}

/** What the API answers while the document is still going to the storage. */
export const WAITING_UPLOAD_MESSAGE = 'Đang tải tài liệu lên, sẽ tạo ngay khi xong';
const RUNNING_MESSAGE = 'File này đang được xử lý, vui lòng chờ hoàn tất.';

/**
 * The part of a generation request that depends on the document still being UPLOADING in document-service:
 * reuse an open job of the document, or park a new one WAITING_UPLOAD until `document.uploaded`.
 */
@Injectable()
export class UploadWaitService {
    private readonly logger = new Logger(UploadWaitService.name);

    constructor(
        private readonly documents: DocumentClient,
        private readonly generation: GenerationJobService,
        private readonly jobs: GenerationJobRepository,
        private readonly locks: GenerationLockService
    ) {}

    /** The user's open job of this document and type, answered as-is (the lock is freed: that job holds its own). */
    async reuseRunning(storageId: string, userId: string, type: GenerationType): Promise<GenerationStarted | null> {
        const running = await this.jobs.activeByStorage(storageId, userId, type);
        if (!running) return null;
        await this.locks.release(userId, type);
        return { jobId: running.id, status: 'processing', message: RUNNING_MESSAGE };
    }

    /**
     * The document is UPLOADING: insert the job WAITING_UPLOAD (no event, no presign, no OCR request) and
     * answer at once; `document.uploaded` queues it later. The upload may have finished between the
     * CreateUpload answer and this insert (its event then found no job), so the document is read once more.
     */
    async waitForUpload(
        userId: string,
        doc: { id: string; filename: string },
        type: GenerationType,
        options: GenerationOptions,
        model: string | undefined,
        metadata: Metadata
    ): Promise<GenerationStarted> {
        const { jobId } = await this.generation.submitWaitingForUpload({
            userId,
            storageId: doc.id,
            filename: doc.filename,
            type,
            options,
            model,
        });
        await this.startIfAlreadyUploaded(userId, doc.id, metadata);
        return { jobId, status: 'processing', message: WAITING_UPLOAD_MESSAGE };
    }

    /**
     * A presigned GET handed to ai-service with the request, so it can process a document that has no chunks
     * yet instead of waiting for the OCR pipeline. Best effort: without it ai-service falls back to waiting.
     */
    async signedDownload(
        doc: { id: string; mimetype: string },
        metadata: Metadata
    ): Promise<{ url: string; mimetype: string } | undefined> {
        try {
            const { downloadUrl } = await this.documents.getDownloadUrl(doc.id, metadata);
            return downloadUrl ? { url: downloadUrl, mimetype: doc.mimetype } : undefined;
        } catch (error) {
            this.logger.warn(`No download URL for document ${doc.id}, generation waits for the OCR: ${(error as Error).message}`);
            return undefined;
        }
    }

    /**
     * Best effort (the watchdog is the backstop): a document already stored (PENDING and later) queues the
     * jobs waiting for it now. FAILED is left to `document.upload_failed`: it also covers a failed OCR, which
     * does not stop a generation that carries the download URL.
     */
    private async startIfAlreadyUploaded(userId: string, storageId: string, metadata: Metadata): Promise<void> {
        try {
            const [fresh] = await this.documents.getDocumentsByIds([storageId], metadata);
            if (!fresh) return;
            const status = processingStatusName(fresh);
            if (status === 'UPLOADING' || status === 'FAILED') return;
            await this.generation.startWaitingForUpload(userId, storageId, await this.signedDownload(fresh, metadata));
        } catch (error) {
            this.logger.warn(`Could not re-check the upload of ${storageId}, waiting for document.uploaded: ${(error as Error).message}`);
        }
    }
}
