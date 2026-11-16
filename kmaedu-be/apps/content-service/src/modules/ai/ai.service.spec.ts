import { BadRequestException } from '@nestjs/common';
import { documentV1 } from '@kmaedu/contracts';
import { AIService } from './ai.service';
import { UploadWaitService, WAITING_UPLOAD_MESSAGE } from './upload-wait.service';
import { needsReprocessing, parseGenerateQuantity } from './generation-request-rules';

const Status = documentV1.DocumentProcessingStatus;
const MB = 1024 * 1024;
const info = (over: Partial<documentV1.DocumentInfo> = {}): documentV1.DocumentInfo => ({
    id: 'd1',
    userId: 'u1',
    filename: 'a.pdf',
    mimetype: 'application/pdf',
    size: String(MB),
    keyR2: 'k',
    url: 'u',
    processingStatus: Status.DOCUMENT_PROCESSING_STATUS_COMPLETED,
    pageCount: 0,
    createdAt: '1',
    updatedAt: '1',
    ...over,
});

describe('needsReprocessing', () => {
    it('re-queues the OCR of a FAILED or PENDING document only', () => {
        expect(needsReprocessing(info({ processingStatus: Status.DOCUMENT_PROCESSING_STATUS_FAILED }))).toBe(true);
        expect(needsReprocessing(info({ processingStatus: Status.DOCUMENT_PROCESSING_STATUS_PENDING }))).toBe(true);
        expect(needsReprocessing(info({ processingStatus: Status.DOCUMENT_PROCESSING_STATUS_COMPLETED }))).toBe(false);
        expect(needsReprocessing(info({ processingStatus: Status.DOCUMENT_PROCESSING_STATUS_PROCESSING }))).toBe(false);
    });
});

describe('parseGenerateQuantity', () => {
    it('defaults to 10, falls back on junk, accepts up to 50 and refuses more', () => {
        expect(parseGenerateQuantity(undefined, 'x')).toBe(10);
        expect(parseGenerateQuantity('abc', 'x')).toBe(10);
        expect(parseGenerateQuantity('0', 'x')).toBe(10);
        expect(parseGenerateQuantity('50', 'x')).toBe(50);
        expect(() => parseGenerateQuantity('51', 'câu hỏi quiz')).toThrow(BadRequestException);
    });
});

describe('AIService.generateFromFile orchestration', () => {
    const user = { id: 'u1' } as never;
    const file = { originalname: 'a.pdf', mimetype: 'application/pdf', size: MB, buffer: Buffer.alloc(10) } as Express.Multer.File;
    const dto = { typeResult: '1' } as never;

    function build(over: { upload?: Partial<documentV1.CreateUploadResponse>; submit?: jest.Mock; running?: unknown } = {}) {
        const documents = {
            createUpload: jest.fn().mockResolvedValue({ document: info(), reused: false, ...over.upload }),
            ensureProcessed: jest.fn().mockResolvedValue(info()),
            deleteDocuments: jest.fn().mockResolvedValue({ deleted: [], notFoundIds: [] }),
            getDocumentsByIds: jest.fn(),
            getDownloadUrl: jest.fn().mockResolvedValue({ downloadUrl: 'https://r2.test/signed/k', expiresAt: '1' }),
        };
        const generation = {
            submit: over.submit ?? jest.fn().mockResolvedValue({ jobId: 'j1' }),
            submitWaitingForUpload: jest.fn().mockResolvedValue({ jobId: 'w1' }),
            startWaitingForUpload: jest.fn().mockResolvedValue(1),
        };
        const jobs = { activeByStorage: jest.fn().mockResolvedValue(over.running ?? null) };
        const locks = { acquire: jest.fn().mockResolvedValue(undefined), release: jest.fn().mockResolvedValue(undefined) };
        const uploadWait = new UploadWaitService(documents as never, generation as never, jobs as never, locks as never);
        const service = new AIService(documents as never, generation as never, locks as never, uploadWait);
        return { service, documents, generation, jobs, locks };
    }

    it('rejects a request without a token before taking the lock', async () => {
        const { service, locks } = build();
        await expect(service.generateFromFile(user, file, dto, undefined)).rejects.toMatchObject({ status: 401 });
        expect(locks.acquire).not.toHaveBeenCalled();
    });

    it('creates a reusable upload, then submits one job with no charge (no amount, no balance in the answer)', async () => {
        const { service, documents, generation, locks } = build();

        const res = await service.generateFromFile(user, file, dto, 'tok');

        expect(documents.createUpload).toHaveBeenCalledWith(
            { filename: 'a.pdf', mimetype: 'application/pdf', data: file.buffer, reuseDuplicate: true },
            expect.anything()
        );
        expect(generation.submit).toHaveBeenCalledWith(expect.objectContaining({ storageId: 'd1', userId: 'u1', type: 'quiz' }));
        expect(generation.submit.mock.calls[0][0]).not.toHaveProperty('amount');
        expect(res).toEqual({ jobId: 'j1', status: 'PENDING', message: expect.any(String) });
        expect(documents.ensureProcessed).not.toHaveBeenCalled(); // a new upload is queued with its row
        expect(locks.release).not.toHaveBeenCalled(); // held until the job is terminal
    });

    it('a failed submit releases the lock and keeps the upload (a retry reuses it)', async () => {
        const boom = new Error('db down');
        const { service, documents, locks } = build({ submit: jest.fn().mockRejectedValue(boom) });
        await expect(service.generateFromFile(user, file, dto, 'tok')).rejects.toBe(boom);
        expect(documents.deleteDocuments).not.toHaveBeenCalled();
        expect(locks.release).toHaveBeenCalledWith('u1', 'quiz');
    });

    it.each([
        ['FAILED', Status.DOCUMENT_PROCESSING_STATUS_FAILED],
        ['PENDING (quick-upload)', Status.DOCUMENT_PROCESSING_STATUS_PENDING],
    ])('a reused %s document re-queues its OCR before the job', async (_label, processingStatus) => {
        const { service, documents, generation } = build({ upload: { reused: true, document: info({ processingStatus }) } });
        await expect(service.generateFromFile(user, file, dto, 'tok')).resolves.toMatchObject({ status: 'processing' });
        expect(documents.ensureProcessed).toHaveBeenCalledWith('d1', expect.anything());
        expect(documents.ensureProcessed.mock.invocationCallOrder[0]).toBeLessThan(generation.submit.mock.invocationCallOrder[0]);
    });

    it('M2: the job carries a presigned download URL and the mimetype of the document; no URL is not fatal', async () => {
        const { service, generation, documents } = build();
        await service.generateFromFile(user, file, dto, 'tok');
        expect(generation.submit).toHaveBeenCalledWith(
            expect.objectContaining({ download: { url: 'https://r2.test/signed/k', mimetype: 'application/pdf' } })
        );

        documents.getDownloadUrl.mockRejectedValue(new Error('document down'));
        await service.generateFromFile(user, file, dto, 'tok');
        expect(generation.submit).toHaveBeenLastCalledWith(expect.objectContaining({ download: undefined }));
    });

    it('a reused PROCESSING document with a running job returns that job and frees the lock', async () => {
        const { service, generation, locks } = build({
            upload: { reused: true, document: info({ processingStatus: Status.DOCUMENT_PROCESSING_STATUS_PROCESSING }) },
            running: { id: 'running-job' },
        });
        await expect(service.generateFromFile(user, file, dto, 'tok')).resolves.toMatchObject({ jobId: 'running-job', status: 'processing' });
        expect(generation.submit).not.toHaveBeenCalled();
        expect(locks.release).toHaveBeenCalledWith('u1', 'quiz');
    });

    describe('a document still UPLOADING in document-service', () => {
        const uploading = { processingStatus: Status.DOCUMENT_PROCESSING_STATUS_UPLOADING };

        it('parks the job WAITING_UPLOAD and answers at once: no outbox job, no presign, no OCR request', async () => {
            const { service, documents, generation, locks } = build({ upload: { document: info(uploading) } });
            documents.getDocumentsByIds.mockResolvedValue([info(uploading)]); // still UPLOADING on the re-check

            const res = await service.generateFromFile(user, file, { typeResult: '1', modelType: 'm1', keyword: ' k ' } as never, 'tok');

            expect(res).toEqual({ jobId: 'w1', status: 'processing', message: WAITING_UPLOAD_MESSAGE });
            expect(generation.submitWaitingForUpload).toHaveBeenCalledWith({
                userId: 'u1',
                storageId: 'd1',
                filename: 'a.pdf',
                type: 'quiz',
                options: { numItems: 10, isNarrowSearch: false, keyword: 'k' },
                model: 'm1',
            });
            expect(generation.submit).not.toHaveBeenCalled();
            expect(generation.startWaitingForUpload).not.toHaveBeenCalled();
            expect(documents.getDownloadUrl).not.toHaveBeenCalled();
            expect(documents.ensureProcessed).not.toHaveBeenCalled();
            expect(locks.release).not.toHaveBeenCalled(); // the waiting job owns the lock
        });

        it('a reused uploading document with an open job returns that job and frees the lock', async () => {
            const { service, generation, locks, jobs } = build({ upload: { reused: true, document: info(uploading) }, running: { id: 'open-job' } });
            await expect(service.generateFromFile(user, file, dto, 'tok')).resolves.toMatchObject({ jobId: 'open-job', status: 'processing' });
            expect(jobs.activeByStorage).toHaveBeenCalledWith('d1', 'u1', 'quiz');
            expect(generation.submitWaitingForUpload).not.toHaveBeenCalled();
            expect(locks.release).toHaveBeenCalledWith('u1', 'quiz');
        });

        it('a reused uploading document with no open job parks a new waiting job', async () => {
            const { service, generation, documents } = build({ upload: { reused: true, document: info(uploading) } });
            documents.getDocumentsByIds.mockResolvedValue([info(uploading)]);
            await expect(service.generateFromFile(user, file, dto, 'tok')).resolves.toMatchObject({ jobId: 'w1', status: 'processing' });
            expect(generation.submitWaitingForUpload).toHaveBeenCalledTimes(1);
        });

        it('if the upload finished before the job existed (its event found nothing), the job is queued from the re-check', async () => {
            const { service, generation, documents } = build({ upload: { document: info(uploading) } });
            documents.getDocumentsByIds.mockResolvedValue([info({ processingStatus: Status.DOCUMENT_PROCESSING_STATUS_PENDING })]);
            await service.generateFromFile(user, file, dto, 'tok');
            expect(generation.startWaitingForUpload).toHaveBeenCalledWith('u1', 'd1', { url: 'https://r2.test/signed/k', mimetype: 'application/pdf' });
        });

        it('a failing re-check never fails the request (the event or the watchdog settles the job)', async () => {
            const { service, documents } = build({ upload: { document: info(uploading) } });
            documents.getDocumentsByIds.mockRejectedValue(new Error('document down'));
            await expect(service.generateFromFile(user, file, dto, 'tok')).resolves.toMatchObject({ jobId: 'w1' });
        });

        it('a failed insert releases the lock', async () => {
            const { service, generation, locks } = build({ upload: { document: info(uploading) } });
            generation.submitWaitingForUpload.mockRejectedValue(new Error('db down'));
            await expect(service.generateFromFile(user, file, dto, 'tok')).rejects.toThrow('db down');
            expect(locks.release).toHaveBeenCalledWith('u1', 'quiz');
        });
    });

    it('rejects a 6 MB file and a quantity over 50 before any upload', async () => {
        const { service, documents, locks } = build();
        await expect(service.generateFromFile(user, { ...file, size: 6 * MB } as Express.Multer.File, dto, 'tok')).rejects.toBeInstanceOf(BadRequestException);
        await expect(service.generateFromFile(user, file, { typeResult: '1', quantityQuizz: '51' } as never, 'tok')).rejects.toBeInstanceOf(BadRequestException);
        expect(documents.createUpload).not.toHaveBeenCalled();
        expect(locks.acquire).not.toHaveBeenCalled();
    });
});

describe('AIService.regenerate with an UPLOADING document', () => {
    const user = { id: 'u1' } as never;
    const uploading = info({ processingStatus: Status.DOCUMENT_PROCESSING_STATUS_UPLOADING });

    function build(running: unknown = null) {
        const documents = {
            getDocumentsByIds: jest.fn().mockResolvedValue([uploading]),
            ensureProcessed: jest.fn(),
            getDownloadUrl: jest.fn(),
        };
        const generation = {
            submit: jest.fn(),
            submitWaitingForUpload: jest.fn().mockResolvedValue({ jobId: 'w1' }),
            startWaitingForUpload: jest.fn(),
        };
        const jobs = { activeByStorage: jest.fn().mockResolvedValue(running) };
        const locks = { acquire: jest.fn().mockResolvedValue(undefined), release: jest.fn().mockResolvedValue(undefined) };
        const uploadWait = new UploadWaitService(documents as never, generation as never, jobs as never, locks as never);
        return { service: new AIService(documents as never, generation as never, locks as never, uploadWait), documents, generation, locks };
    }

    it('parks a WAITING_UPLOAD job: no submit, no OCR re-queue, no presign', async () => {
        const { service, documents, generation } = build();
        const res = await service.regenerate('d1', user, { typeResult: 2, quantityFlashcard: 4 } as never, 'tok');
        expect(res).toEqual({ jobId: 'w1', status: 'processing', message: WAITING_UPLOAD_MESSAGE });
        expect(generation.submitWaitingForUpload).toHaveBeenCalledWith(
            expect.objectContaining({ storageId: 'd1', type: 'flashcard', options: expect.objectContaining({ numItems: 4 }) })
        );
        expect(generation.submit).not.toHaveBeenCalled();
        expect(documents.ensureProcessed).not.toHaveBeenCalled();
        expect(documents.getDownloadUrl).not.toHaveBeenCalled();
    });

    it('reuses the open job of the document and frees the lock', async () => {
        const { service, generation, locks } = build({ id: 'open-job' });
        await expect(service.regenerate('d1', user, {} as never, 'tok')).resolves.toMatchObject({ jobId: 'open-job' });
        expect(generation.submitWaitingForUpload).not.toHaveBeenCalled();
        expect(locks.release).toHaveBeenCalledWith('u1', 'quiz');
    });
});
