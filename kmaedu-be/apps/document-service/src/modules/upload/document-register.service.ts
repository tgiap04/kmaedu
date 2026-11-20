import { Injectable } from '@nestjs/common';
import { GenerateIdService, ownedR2Key } from '@kmaedu/common';
import { PrismaService, UserStorage } from '../../prisma';
import { AI_UPLOAD_AREAS, DocumentStatus, MAX_UPLOAD_BYTES } from '../../config/document.constants';
import { DocumentErrorCode, documentError } from './document-errors';
import { DocumentProcessingService } from './document-processing.service';
import { DocumentQueueService } from './document-queue.service';
import { DocumentRepository } from './document.repository';
import { detectDocumentType } from './file-signature';
import { R2ObjectInspector } from './r2-object-inspector';
import type { RegisterUploadDto } from './dto/upload.dto';

/**
 * `POST /ai/upload`: registers an object the client already stored in R2 under its own key, then queues
 * its OCR. Size and type are read from the stored object (never from the request) and the row keeps no url.
 */
@Injectable()
export class DocumentRegisterService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly repo: DocumentRepository,
        private readonly queue: DocumentQueueService,
        private readonly processing: DocumentProcessingService,
        private readonly ids: GenerateIdService,
        private readonly objects: R2ObjectInspector
    ) {}

    async register(userId: string, dto: RegisterUploadDto) {
        if (!ownedR2Key(dto.keyR2, AI_UPLOAD_AREAS, userId)) {
            throw documentError(400, DocumentErrorCode.VALIDATION_FAILED, 'keyR2 không hợp lệ');
        }
        const existing = await this.repo.findByKey(dto.keyR2);
        if (existing) return this.resume(existing, userId);

        const object = await this.inspectObject(dto.keyR2);

        // Signed before the row exists: an r2 outage answers 503 and the client simply registers again.
        const downloadUrl = await this.queue.downloadUrl({ keyR2: dto.keyR2 });
        let doc: UserStorage;
        try {
            doc = await this.prisma.$transaction(async (tx) => {
                const row = await this.repo.insert(tx, {
                    id: this.ids.generateId(),
                    userId,
                    filename: dto.filename,
                    url: '',
                    mimetype: object.mimetype,
                    size: object.size,
                    keyR2: dto.keyR2,
                    processingStatus: DocumentStatus.PENDING,
                    queuedAt: new Date(),
                });
                await this.queue.recordUploaded(tx, row, downloadUrl);
                return row;
            });
        } catch (error) {
            // Lost a race on the unique key: the winner's row is the one to continue.
            if ((error as { code?: string })?.code !== 'P2002') throw error;
            const winner = await this.repo.findByKey(dto.keyR2);
            if (!winner) throw error;
            return this.resume(winner, userId);
        }
        return this.registered(doc.id, doc.processingStatus);
    }

    /** The stored object must exist, be 1 byte to 50 MB and be an allowed document type (by magic bytes). */
    private async inspectObject(keyR2: string): Promise<{ size: number; mimetype: string }> {
        let found;
        try {
            found = await this.objects.inspect(keyR2);
        } catch {
            throw documentError(503, DocumentErrorCode.STORAGE_UNAVAILABLE, 'Không thể truy cập kho lưu trữ lúc này.');
        }
        if (!found) throw documentError(400, DocumentErrorCode.VALIDATION_FAILED, 'Chưa có file nào tại keyR2');
        const detected = detectDocumentType(found.head);
        if (found.size <= 0 || found.size > MAX_UPLOAD_BYTES || !detected) {
            throw documentError(400, DocumentErrorCode.VALIDATION_FAILED, 'File rỗng, quá 50MB hoặc không phải PDF, DOCX, TXT');
        }
        return { size: found.size, mimetype: detected.mime };
    }

    /** A second `POST /ai/upload` for the same key is the same upload: same id; a FAILED one is re-queued. */
    private async resume(existing: UserStorage, userId: string) {
        if (existing.userId !== userId) {
            throw documentError(409, DocumentErrorCode.STORAGE_KEY_TAKEN, 'Khóa lưu trữ đã tồn tại');
        }
        const current =
            existing.processingStatus === DocumentStatus.FAILED
                ? await this.processing.ensureProcessed(userId, existing.id)
                : existing;
        return this.registered(current.id, current.processingStatus);
    }

    private registered(id: string, status: string) {
        return { id, status, message: 'File đã được upload, đang xử lý OCR' };
    }
}
