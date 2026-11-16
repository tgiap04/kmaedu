import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Metadata } from '@grpc/grpc-js';
import type { AuthUser } from '@kmaedu/auth-jwt';
import { DocumentClient, requireUserToken, rethrowAsDocumentHttp, userMetadata } from '@kmaedu/grpc';
import { processingStatusName } from './document-mapper';
import { GenerationJobService, GenerationOptions } from './generation-job.service';
import { GenerationLockService } from './generation-lock.service';
import { GenerationStarted, UploadWaitService } from './upload-wait.service';
import { DEFAULT_GENERATE_ITEMS, generationTypeOf, needsReprocessing, parseGenerateQuantity } from './generation-request-rules';
import { GenerationType, MAX_GENERATE_FILE_BYTES } from './generation.constants';
import { GenerateFromFileDto, RegenerateDto } from './dto/ai.dto';


/** What `generate-from-file` tells the user it started. */
function generateFromFileMessage(reused: boolean, reprocessing: boolean): string {
    if (!reused) return 'File đã được upload, đang xử lý OCR và tạo nội dung';
    return reprocessing ? 'Đang xử lý lại file cũ...' : 'File đã tồn tại, đang tạo nội dung mới...';
}

/** HTTP-facing generation flows. Queueing lives in `GenerationJobService`. */
@Injectable()
export class AIService {
    constructor(
        private readonly documents: DocumentClient,
        private readonly generation: GenerationJobService,
        private readonly locks: GenerationLockService,
        private readonly uploadWait: UploadWaitService
    ) {}

    /** Upload (or reuse) the file in document-service and queue the generation. Returns at once. */
    async generateFromFile(
        user: AuthUser,
        file: Express.Multer.File,
        dto: GenerateFromFileDto,
        userToken?: string
    ): Promise<GenerationStarted> {
        if (!file || !file.buffer) throw new BadRequestException('No file provided');
        if (file.size > MAX_GENERATE_FILE_BYTES) {
            throw new BadRequestException(
                `File quá lớn. Tối đa 5MB, file của bạn: ${(file.size / (1024 * 1024)).toFixed(2)}MB`
            );
        }
        const metadata = userMetadata(requireUserToken(userToken));
        const type = generationTypeOf(dto.typeResult);
        const quizItems = parseGenerateQuantity(dto.quantityQuizz, 'câu hỏi quiz');
        const flashcardItems = parseGenerateQuantity(dto.quantityFlashcard, 'flashcard');
        const options: GenerationOptions = {
            numItems: type === 'flashcard' ? flashcardItems : quizItems,
            isNarrowSearch: dto.isNarrowSearch === 'true',
            keyword: dto.keyword?.trim() || undefined,
        };

        await this.locks.acquire(user.id, type);
        try {
            const upload = await this.documents
                .createUpload(
                    {
                        filename: file.originalname,
                        mimetype: file.mimetype,
                        data: file.buffer,
                        reuseDuplicate: true,
                    },
                    metadata
                )
                .catch(rethrowAsDocumentHttp);
            const doc = upload.document;
            if (!doc) throw new NotFoundException('Upload không tồn tại');

            const status = processingStatusName(doc);
            if (upload.reused && (status === 'PROCESSING' || status === 'UPLOADING')) {
                const running = await this.uploadWait.reuseRunning(doc.id, user.id, type);
                if (running) return running;
            }
            // Still going to the storage (a new upload, or a reused one that is not there yet): park the job.
            if (status === 'UPLOADING') {
                return await this.uploadWait.waitForUpload(user.id, doc, type, options, dto.modelType, metadata);
            }

            // A new upload was queued for OCR with its row; a reused FAILED / PENDING one is re-queued here.
            const reprocessing = upload.reused && needsReprocessing(doc);
            if (reprocessing) await this.ensureProcessed(doc.id, metadata);
            const download = await this.uploadWait.signedDownload(doc, metadata);

            const submitted = await this.generation.submit({
                userId: user.id,
                storageId: doc.id,
                filename: doc.filename,
                type,
                options,
                model: dto.modelType,
                download,
            });
            return {
                jobId: submitted.jobId,
                status: upload.reused ? 'processing' : 'PENDING',
                message: generateFromFileMessage(upload.reused, reprocessing),
            };
        } catch (error) {
            await this.locks.release(user.id, type);
            throw error;
        }
    }

    /** New generation from a document the caller already uploaded. */
    async regenerate(uploadId: string, user: AuthUser, dto: RegenerateDto, userToken?: string): Promise<GenerationStarted> {
        const metadata = userMetadata(requireUserToken(userToken));
        const [doc] = await this.documents.getDocumentsByIds([uploadId], metadata).catch(rethrowAsDocumentHttp);
        if (!doc) throw new NotFoundException('Upload không tồn tại');

        const type: GenerationType =
            generationTypeOf(dto.typeResult) === 'flashcard' || dto.outputType === 'flashcard' ? 'flashcard' : 'quiz';
        const numItems =
            (type === 'flashcard' ? dto.quantityFlashcard : dto.quantityQuizz) || dto.count || DEFAULT_GENERATE_ITEMS;
        const options: GenerationOptions = {
            numItems,
            isNarrowSearch: dto.isNarrowSearch ?? false,
            keyword: dto.keyword?.trim() || undefined,
        };

        await this.locks.acquire(user.id, type);
        try {
            if (processingStatusName(doc) === 'UPLOADING') {
                const running = await this.uploadWait.reuseRunning(doc.id, user.id, type);
                return running ?? (await this.uploadWait.waitForUpload(user.id, doc, type, options, dto.modelType, metadata));
            }
            if (needsReprocessing(doc)) await this.ensureProcessed(doc.id, metadata);
            const submitted = await this.generation.submit({
                userId: user.id,
                storageId: doc.id,
                filename: doc.filename,
                type,
                options,
                model: dto.modelType,
                download: await this.uploadWait.signedDownload(doc, metadata),
            });
            return {
                jobId: submitted.jobId,
                status: 'processing',
                message: type === 'flashcard' ? 'Đang tạo flashcard mới...' : 'Đang tạo câu hỏi trắc nghiệm mới...',
            };
        } catch (error) {
            await this.locks.release(user.id, type);
            throw error;
        }
    }

    private async ensureProcessed(id: string, metadata: Metadata): Promise<void> {
        await this.documents.ensureProcessed(id, metadata).catch(rethrowAsDocumentHttp);
    }
}
