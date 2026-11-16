import { DocumentUploadService } from './document-upload.service';

const file = { filename: 'a.pdf', mimetype: 'application/pdf', data: Buffer.alloc(1024, 7) };

function build() {
    const tx = { tag: 'tx' };
    const prisma = { $transaction: jest.fn(async (fn: (db: unknown) => unknown) => fn(tx)) };
    const repo = {
        findDuplicate: jest.fn().mockResolvedValue(null),
        insert: jest.fn(async (_db: unknown, data: Record<string, unknown>) => ({ ...data, createdAt: new Date(), updatedAt: new Date() })),
    };
    const queue = {
        downloadUrl: jest.fn().mockResolvedValue('https://r2.test/signed'),
        recordUploaded: jest.fn().mockResolvedValue(undefined),
    };
    const r2 = {
        uploadFile: jest.fn().mockResolvedValue('ai-uploads/u1/1-a.pdf'),
        getPublicUrl: jest.fn((key: string) => `https://r2/${key}`),
    };
    const r2Deletes = { enqueue: jest.fn().mockResolvedValue(undefined) };
    const ids = { generateId: () => 'd1' };
    const staging = { insert: jest.fn().mockResolvedValue(undefined) };
    const service = new DocumentUploadService(
        prisma as never,
        repo as never,
        queue as never,
        r2 as never,
        r2Deletes as never,
        ids as never,
        staging as never
    );
    return { service, tx, prisma, repo, queue, r2, r2Deletes, staging };
}

describe('DocumentUploadService (async CreateUpload, no monthly quota, no charge)', () => {
    it('CreateUpload accepts the file without touching R2: one tx with the UPLOADING row (key and url precomputed, not queued) and its staged bytes', async () => {
        const h = build();

        const outcome = await h.service.createFromBytes('u1', file, { reuseDuplicate: false });

        expect(outcome).toEqual({ document: expect.objectContaining({ id: 'd1', processingStatus: 'UPLOADING' }), reused: false });
        const inserted = h.repo.insert.mock.calls[0][1] as { keyR2: string; url: string; queuedAt?: Date };
        expect(h.repo.insert).toHaveBeenCalledWith(h.tx, expect.objectContaining({ processingStatus: 'UPLOADING', size: 1024 }));
        expect(inserted.queuedAt).toBeUndefined();
        expect(inserted.keyR2).toMatch(/^ai-uploads\/u1\/\d+-a\.pdf$/);
        expect(inserted.url).toBe(`https://r2/${inserted.keyR2}`);
        expect(h.staging.insert).toHaveBeenCalledWith(h.tx, 'd1', file.data);
        expect(h.prisma.$transaction).toHaveBeenCalledTimes(1);
        expect(h.r2.uploadFile).not.toHaveBeenCalled();
        expect(h.queue.downloadUrl).not.toHaveBeenCalled();
        expect(h.queue.recordUploaded).not.toHaveBeenCalled();
    });

    it('a failed staging insert fails the call and leaves no R2 object to clean up (nothing was uploaded)', async () => {
        const h = build();
        h.staging.insert.mockRejectedValue(new Error('db down'));

        await expect(h.service.createFromBytes('u1', file, { reuseDuplicate: false })).rejects.toThrow('db down');

        expect(h.r2.uploadFile).not.toHaveBeenCalled();
        expect(h.r2Deletes.enqueue).not.toHaveBeenCalled();
    });

    it.each([
        ['empty', Buffer.alloc(0)],
        ['over 50 MB', { length: 50 * 1024 * 1024 + 1 } as Buffer],
    ])('rejects a %s file before staging anything', async (_name, data) => {
        const h = build();

        await expect(h.service.createFromBytes('u1', { ...file, data }, { reuseDuplicate: false })).rejects.toMatchObject({ status: 400 });

        expect(h.prisma.$transaction).not.toHaveBeenCalled();
    });

    it('quick-upload is never quota-checked and is not queued for OCR', async () => {
        const h = build();

        await expect(h.service.quick('u1', file)).resolves.toMatchObject({ success: true, userStorageId: 'd1' });

        expect(h.queue.recordUploaded).not.toHaveBeenCalled();
    });

    it('a duplicate is reused without storing again', async () => {
        const h = build();
        h.repo.findDuplicate.mockResolvedValue({ id: 'old' });
        await expect(h.service.createFromBytes('u1', file, { reuseDuplicate: true })).resolves.toEqual({ document: { id: 'old' }, reused: true });
        expect(h.repo.insert).not.toHaveBeenCalled();
    });

    it('quick-upload still stores synchronously and queues the stored object for deletion when the row insert fails', async () => {
        const h = build();
        h.repo.insert.mockRejectedValue(new Error('db down'));
        await expect(h.service.quick('u1', file)).rejects.toThrow('db down');
        expect(h.r2.uploadFile).toHaveBeenCalled();
        expect(h.r2Deletes.enqueue).toHaveBeenCalledWith(h.tx, ['ai-uploads/u1/1-a.pdf']);
    });
});
