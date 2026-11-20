import { DocumentUploadService } from './document-upload.service';

const pdfBytes = (size: number) => Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(size - 9, 7)]);
const file = { filename: 'a.pdf', mimetype: 'application/pdf', data: pdfBytes(1024) };
const svgFile = {
    filename: 'a.pdf',
    mimetype: 'application/pdf',
    data: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
};
const KEY = /^ai-uploads\/u1\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/;

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
        expect(inserted.keyR2).toMatch(KEY);
        expect(inserted.url).toBe(''); // private object: never a permanent public URL
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
        ['over 50 MB', { length: 50 * 1024 * 1024 + 1, subarray: () => Buffer.from('%PDF-') } as unknown as Buffer],
    ])('rejects a %s file before staging anything', async (_name, data) => {
        const h = build();

        await expect(h.service.createFromBytes('u1', { ...file, data }, { reuseDuplicate: false })).rejects.toMatchObject({ status: 400 });

        expect(h.prisma.$transaction).not.toHaveBeenCalled();
    });

    it('the stored mimetype comes from the detected type, never from the client', async () => {
        const h = build();

        await h.service.createFromBytes('u1', { ...file, mimetype: 'text/html' }, { reuseDuplicate: false });

        expect(h.repo.insert).toHaveBeenCalledWith(h.tx, expect.objectContaining({ mimetype: 'application/pdf', filename: 'a.pdf' }));
    });

    it('two uploads of the same name in the same millisecond get different, unguessable keys', async () => {
        const h = build();
        jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

        await h.service.createFromBytes('u1', file, { reuseDuplicate: false });
        await h.service.createFromBytes('u1', file, { reuseDuplicate: false });

        const [first, second] = h.repo.insert.mock.calls.map((call) => (call[1] as { keyR2: string }).keyR2);
        expect(first).not.toEqual(second);
        expect(first).toMatch(KEY);
        expect(first).not.toContain('1700000000000');
        jest.restoreAllMocks();
    });

    it.each(['createFromBytes', 'quick'] as const)('%s rejects bytes that are not an allowed type (SVG with a PDF Content-Type) with 400 and stores nothing', async (method) => {
        const h = build();

        const call =
            method === 'quick' ? h.service.quick('u1', svgFile) : h.service.createFromBytes('u1', svgFile, { reuseDuplicate: false });

        await expect(call).rejects.toMatchObject({ status: 400 });
        expect(h.prisma.$transaction).not.toHaveBeenCalled();
        expect(h.r2.uploadFile).not.toHaveBeenCalled();
        expect(h.staging.insert).not.toHaveBeenCalled();
    });

    it('quick-upload stores under a random key with the detected type, is never quota-checked and is not queued for OCR', async () => {
        const h = build();

        await expect(h.service.quick('u1', { ...file, mimetype: 'text/html' })).resolves.toMatchObject({ id: 'd1', mimetype: 'application/pdf' });

        expect(h.r2.uploadFile).toHaveBeenCalledWith(expect.stringMatching(/^[0-9a-f-]{36}\.pdf$/), file.data, 'application/pdf', 'ai-teacher/u1');

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
