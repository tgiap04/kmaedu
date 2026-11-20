import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { GenerateIdService, ownedR2Key, ownerKeyFolder } from '@kmaedu/common';
import { R2DeleteTaskWriter } from '@kmaedu/messaging';
import { PrismaService, UserStorage } from '../../prisma';
import { R2Client } from '../../clients/r2.client';
import { AI_UPLOAD_AREAS, DocumentStatus, MAX_UPLOAD_BYTES } from '../../config/document.constants';
import { DocumentErrorCode, documentError } from './document-errors';
import { DocumentQueueService } from './document-queue.service';
import { DocumentRepository } from './document.repository';
import { DetectedType, detectDocumentType } from './file-signature';
import { UploadStagingRepository } from './upload-staging.repository';

export interface UploadBytes {
    filename: string;
    mimetype: string;
    data: Buffer;
}

export interface UploadBytesOptions {
    /** Return the caller's existing `(filename, size)` upload instead of storing again. */
    reuseDuplicate: boolean;
}

export interface UploadOutcome {
    document: UserStorage;
    reused: boolean;
}

/** Writing up to 50 MB of bytea can outlast Prisma's 5 s interactive-transaction default. */
const STAGING_TX_TIMEOUT_MS = 30_000;

const storageUnavailable = () =>
    documentError(500, DocumentErrorCode.STORAGE_UNAVAILABLE, 'Không thể tải file lên lưu trữ, vui lòng thử lại.');

/** Size and type gate: the type comes from the bytes (magic numbers), never from the client's mimetype. */
function inspectUpload(file: UploadBytes): DetectedType {
    if (file.data.length === 0 || file.data.length > MAX_UPLOAD_BYTES) {
        throw documentError(400, DocumentErrorCode.VALIDATION_FAILED, 'File rỗng hoặc vượt quá 50MB');
    }
    const detected = detectDocumentType(file.data);
    if (!detected) {
        throw documentError(400, DocumentErrorCode.VALIDATION_FAILED, 'Chỉ hỗ trợ file PDF, DOCX hoặc văn bản thuần (TXT)');
    }
    return detected;
}

/**
 * The last key segment: a random id plus the extension of the detected type. The key is the only
 * thing protecting a private object's URL and must not be guessable (no timestamp, no file name), and
 * two uploads can never collide.
 */
const storageName = (detected: DetectedType): string => `${randomUUID()}.${detected.ext}`;

/**
 * Accepting files. quick-upload: the R2 object, then a PENDING row that is not queued for OCR.
 * CreateUpload: an UPLOADING row plus staged bytes (see `createFromBytes`).
 */
@Injectable()
export class DocumentUploadService {
    private readonly logger = new Logger(DocumentUploadService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly repo: DocumentRepository,
        private readonly queue: DocumentQueueService,
        private readonly r2: R2Client,
        private readonly r2Deletes: R2DeleteTaskWriter,
        private readonly ids: GenerateIdService,
        private readonly staging: UploadStagingRepository
    ) {}

    /** `POST /ai/quick-upload`: no OCR until the first chat message. */
    async quick(userId: string, file: UploadBytes): Promise<UserStorage> {
        const detected = inspectUpload(file);
        const keyR2 = await this.store('ai-teacher', userId, file, detected);
        return this.discardOnFailure(userId, keyR2, () =>
            this.repo.insert(this.prisma, {
                ...this.newRow(userId, file, detected, keyR2),
                processingStatus: DocumentStatus.PENDING,
            })
        );
    }

    /**
     * gRPC `CreateUpload`: the bytes arrive over gRPC but are NOT sent to R2 here (a slow link would
     * outlast the call's deadline). One transaction commits the UPLOADING row, with its key and url
     * already fixed, and the staged bytes; the worker role stores them and then queues OCR.
     */
    async createFromBytes(userId: string, file: UploadBytes, options: UploadBytesOptions): Promise<UploadOutcome> {
        const detected = inspectUpload(file);
        if (options.reuseDuplicate) {
            const dup = await this.repo.findDuplicate(userId, file.filename, file.data.length);
            if (dup) return { document: dup, reused: true };
        }
        const keyR2 = `${ownerKeyFolder('ai-uploads', userId)}/${storageName(detected)}`;
        const base = this.newRow(userId, file, detected, keyR2);
        const doc = await this.prisma.$transaction(async (tx) => {
            const row = await this.repo.insert(tx, { ...base, processingStatus: DocumentStatus.UPLOADING });
            await this.staging.insert(tx, row.id, file.data);
            return row;
        }, { timeout: STAGING_TX_TIMEOUT_MS });
        return { document: doc, reused: false };
    }

    /** `url` stays empty: a private object is only ever served through a short-lived presigned URL. */
    private newRow(userId: string, file: UploadBytes, detected: DetectedType, keyR2: string) {
        return {
            id: this.ids.generateId(),
            userId,
            filename: file.filename,
            url: '',
            mimetype: detected.mime,
            size: file.data.length,
            keyR2,
        };
    }

    private async store(
        area: (typeof AI_UPLOAD_AREAS)[number],
        userId: string,
        file: UploadBytes,
        detected: DetectedType
    ): Promise<string> {
        try {
            return await this.r2.uploadFile(storageName(detected), file.data, detected.mime, ownerKeyFolder(area, userId));
        } catch (error) {
            this.logger.error(`R2 upload failed: ${(error as Error).message}`);
            throw storageUnavailable();
        }
    }

    /** Runs `step`; when it fails the already-stored object is queued for deletion (best effort). */
    private async discardOnFailure<T>(userId: string, keyR2: string, step: () => Promise<T>): Promise<T> {
        try {
            return await step();
        } catch (error) {
            try {
                await this.prisma.$transaction((tx) =>
                    this.r2Deletes.enqueue(tx, [ownedR2Key(keyR2, AI_UPLOAD_AREAS, userId)])
                );
            } catch (enqueueError) {
                this.logger.error(`Orphaned R2 object ${keyR2}: ${(enqueueError as Error).message}`);
            }
            throw error;
        }
    }
}
