import { DocumentProcessingService } from './document-processing.service';

const row = (over: Record<string, unknown> = {}) => ({
    id: 'd1',
    userId: 'u1',
    keyR2: 'ai-uploads/u1/a.pdf',
    processingStatus: 'PENDING',
    queuedAt: null as Date | null,
    ...over,
});

function build(found: ReturnType<typeof row>) {
    const tx = { tag: 'tx' };
    const prisma = { $transaction: jest.fn(async (fn: (db: unknown) => unknown) => fn(tx)) };
    const repo = { claimRequeue: jest.fn().mockResolvedValue(true), findRaw: jest.fn().mockResolvedValue(found) };
    const query = { getOwned: jest.fn().mockResolvedValue(found) };
    const queue = {
        downloadUrl: jest.fn().mockResolvedValue('https://r2.test/signed'),
        recordUploaded: jest.fn().mockResolvedValue(undefined),
    };
    const service = new DocumentProcessingService(prisma as never, repo as never, query as never, queue as never);
    return { service, repo, queue, prisma };
}

describe('DocumentProcessingService.ensureProcessed', () => {
    it('never re-emits document.uploaded for an UPLOADING row (the object is not in R2 yet) and touches nothing', async () => {
        const h = build(row({ processingStatus: 'UPLOADING' }));

        await expect(h.service.ensureProcessed('u1', 'd1')).resolves.toMatchObject({ processingStatus: 'UPLOADING' });

        expect(h.queue.downloadUrl).not.toHaveBeenCalled();
        expect(h.prisma.$transaction).not.toHaveBeenCalled();
        expect(h.repo.claimRequeue).not.toHaveBeenCalled();
    });

    it('a FAILED row that never reached R2 (upload gave up: queuedAt still null) is not re-queued either', async () => {
        const h = build(row({ processingStatus: 'FAILED', queuedAt: null }));

        await h.service.ensureProcessed('u1', 'd1');

        expect(h.queue.recordUploaded).not.toHaveBeenCalled();
        expect(h.repo.claimRequeue).not.toHaveBeenCalled();
    });

    it('a FAILED row that was queued before (OCR failed) is re-queued as before', async () => {
        const h = build(row({ processingStatus: 'FAILED', queuedAt: new Date(1_700_000_000_000) }));

        await h.service.ensureProcessed('u1', 'd1');

        expect(h.queue.recordUploaded).toHaveBeenCalledTimes(1);
    });

    it('a quick-upload PENDING row that was never queued is queued on first use', async () => {
        const h = build(row({ processingStatus: 'PENDING', queuedAt: null }));

        await h.service.ensureProcessed('u1', 'd1');

        expect(h.queue.recordUploaded).toHaveBeenCalledTimes(1);
    });
});
