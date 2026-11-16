import {
    UPLOAD_BACKOFF_SECONDS,
    UPLOAD_DEADLINE_MS,
    UPLOAD_LEASE_SECONDS,
    UPLOAD_MAX_ATTEMPTS,
} from '../../config/document.constants';
import { DocumentUploadWorker } from './document-upload.worker';

const KEY = 'ai-uploads/u1/1700000000000-a.pdf';
const bytes = Buffer.alloc(2048, 7);
const claim = (attempts = 1) => ({ storageId: 'd1', attempts, lease: '2026-11-16 10:00:00.123456+00' });
const uploadingRow = (over: Record<string, unknown> = {}) => ({
    id: 'd1',
    userId: 'u1',
    filename: 'a.pdf',
    mimetype: 'application/pdf',
    keyR2: KEY,
    processingStatus: 'UPLOADING',
    queuedAt: null,
    ...over,
});

function build() {
    const tx = { tag: 'tx' };
    const prisma = { $transaction: jest.fn(async (fn: (db: unknown) => unknown) => fn(tx)) };
    const docs = {
        findRaw: jest.fn().mockResolvedValue(uploadingRow()),
        markUploaded: jest.fn().mockResolvedValue(true),
        markUploadFailed: jest.fn().mockResolvedValue(true),
    };
    const staging = {
        claimNext: jest.fn().mockResolvedValue(claim()),
        loadData: jest.fn().mockResolvedValue(bytes),
        scheduleRetry: jest.fn().mockResolvedValue(true),
        remove: jest.fn().mockResolvedValue(undefined),
    };
    const r2 = { uploadFile: jest.fn().mockResolvedValue(KEY) };
    const queue = {
        downloadUrl: jest.fn().mockResolvedValue('https://r2.test/signed'),
        recordUploaded: jest.fn().mockResolvedValue(undefined),
    };
    const r2Deletes = { enqueue: jest.fn().mockResolvedValue(1) };
    const outbox = { add: jest.fn().mockResolvedValue(undefined) };
    const worker = new DocumentUploadWorker(
        prisma as never,
        docs as never,
        staging as never,
        r2 as never,
        queue as never,
        r2Deletes as never,
        outbox as never
    );
    return { worker, tx, prisma, docs, staging, r2, queue, r2Deletes, outbox };
}

describe('DocumentUploadWorker.tick', () => {
    it('does nothing when no staged upload is due', async () => {
        const h = build();
        h.staging.claimNext.mockResolvedValue(null);

        await expect(h.worker.tick()).resolves.toBe(false);

        expect(h.staging.claimNext).toHaveBeenCalledWith(UPLOAD_LEASE_SECONDS);
        expect(h.r2.uploadFile).not.toHaveBeenCalled();
    });

    it('lease outlasts the upload deadline, so a slow upload is never re-claimed mid-flight', () => {
        expect(UPLOAD_LEASE_SECONDS * 1000).toBeGreaterThan(UPLOAD_DEADLINE_MS);
        expect(UPLOAD_BACKOFF_SECONDS).toHaveLength(UPLOAD_MAX_ATTEMPTS - 1);
    });

    describe('success', () => {
        it('uploads under the precomputed key with the long deadline, then in ONE tx: PENDING + queuedAt, staging dropped, document.uploaded with the presigned url', async () => {
            const h = build();

            await expect(h.worker.tick()).resolves.toBe(true);

            expect(h.r2.uploadFile).toHaveBeenCalledWith('1700000000000-a.pdf', bytes, 'application/pdf', 'ai-uploads/u1', UPLOAD_DEADLINE_MS);
            expect(h.queue.downloadUrl).toHaveBeenCalledWith(expect.objectContaining({ keyR2: KEY }));
            expect(h.prisma.$transaction).toHaveBeenCalledTimes(1);
            expect(h.docs.markUploaded).toHaveBeenCalledWith(h.tx, 'd1');
            expect(h.staging.remove).toHaveBeenCalledWith(h.tx, 'd1');
            expect(h.queue.recordUploaded).toHaveBeenCalledWith(
                h.tx,
                expect.objectContaining({ id: 'd1', processingStatus: 'PENDING', queuedAt: expect.any(Date) }),
                'https://r2.test/signed'
            );
            expect(h.r2Deletes.enqueue).not.toHaveBeenCalled();
            expect(h.outbox.add).not.toHaveBeenCalled();
            expect(h.staging.scheduleRetry).not.toHaveBeenCalled();
        });

        it('another worker already completed the row: nothing is emitted and the object is kept', async () => {
            const h = build();
            h.docs.markUploaded.mockResolvedValue(false);
            h.docs.findRaw.mockResolvedValueOnce(uploadingRow()).mockResolvedValueOnce(uploadingRow({ processingStatus: 'PENDING' }));

            await h.worker.tick();

            expect(h.queue.recordUploaded).not.toHaveBeenCalled();
            expect(h.r2Deletes.enqueue).not.toHaveBeenCalled();
        });
    });

    describe('row deleted while uploading', () => {
        it('queues the just-stored key for deletion and emits nothing', async () => {
            const h = build();
            h.docs.markUploaded.mockResolvedValue(false);
            h.docs.findRaw.mockResolvedValueOnce(uploadingRow()).mockResolvedValueOnce(null);

            await h.worker.tick();

            expect(h.r2Deletes.enqueue).toHaveBeenCalledWith(h.tx, [KEY]);
            expect(h.queue.recordUploaded).not.toHaveBeenCalled();
        });

        it('row already gone when claimed: no upload at all', async () => {
            const h = build();
            h.docs.findRaw.mockResolvedValue(null);
            h.staging.loadData.mockResolvedValue(null);

            await expect(h.worker.tick()).resolves.toBe(true);

            expect(h.r2.uploadFile).not.toHaveBeenCalled();
            expect(h.outbox.add).not.toHaveBeenCalled();
        });

        it('deleted during a failed attempt (staging gone, retry cannot be scheduled): the key is queued for deletion', async () => {
            const h = build();
            h.r2.uploadFile.mockResolvedValue(KEY);
            h.queue.downloadUrl.mockRejectedValue(new Error('presign down'));
            h.staging.scheduleRetry.mockResolvedValue(false);
            h.docs.findRaw.mockResolvedValueOnce(uploadingRow()).mockResolvedValueOnce(null);

            await h.worker.tick();

            expect(h.r2Deletes.enqueue).toHaveBeenCalledWith(h.tx, [KEY]);
        });

        it('a row that is no longer UPLOADING is left alone', async () => {
            const h = build();
            h.docs.findRaw.mockResolvedValue(uploadingRow({ processingStatus: 'PENDING' }));

            await h.worker.tick();

            expect(h.r2.uploadFile).not.toHaveBeenCalled();
            expect(h.r2Deletes.enqueue).not.toHaveBeenCalled();
            expect(h.staging.remove).toHaveBeenCalledWith(h.prisma, 'd1');
        });
    });

    describe('upload error', () => {
        it.each([1, 2, 3, 4, 5])('attempt %i failing releases the lease and retries after the scheduled backoff', async (attempt) => {
            const h = build();
            h.staging.claimNext.mockResolvedValue(claim(attempt));
            h.r2.uploadFile.mockRejectedValue(new Error('socket hang up'));

            await expect(h.worker.tick()).resolves.toBe(true);

            expect(h.staging.scheduleRetry).toHaveBeenCalledWith(claim(attempt), UPLOAD_BACKOFF_SECONDS[attempt - 1], expect.stringContaining('socket hang up'));
            expect(h.prisma.$transaction).not.toHaveBeenCalled();
            expect(h.outbox.add).not.toHaveBeenCalled();
        });

        it('a failing presign counts as a failed attempt too (no PENDING row without a download url)', async () => {
            const h = build();
            h.queue.downloadUrl.mockRejectedValue(new Error('presign down'));

            await h.worker.tick();

            expect(h.staging.scheduleRetry).toHaveBeenCalledTimes(1);
            expect(h.docs.markUploaded).not.toHaveBeenCalled();
        });

        it('r2 answering with another key than the row holds is an error, not a success', async () => {
            const h = build();
            h.r2.uploadFile.mockResolvedValue('ai-uploads/u1/other.pdf');

            await h.worker.tick();

            expect(h.staging.scheduleRetry).toHaveBeenCalledTimes(1);
            expect(h.docs.markUploaded).not.toHaveBeenCalled();
        });
    });

    describe('final failure', () => {
        it('after the last attempt, one tx: FAILED, staging dropped, key queued for deletion, document.upload_failed {storageId,userId,reason}', async () => {
            const h = build();
            h.staging.claimNext.mockResolvedValue(claim(UPLOAD_MAX_ATTEMPTS));
            h.r2.uploadFile.mockRejectedValue(new Error('R2 unreachable'));

            await expect(h.worker.tick()).resolves.toBe(true);

            expect(h.staging.scheduleRetry).not.toHaveBeenCalled();
            expect(h.prisma.$transaction).toHaveBeenCalledTimes(1);
            expect(h.docs.markUploadFailed).toHaveBeenCalledWith(h.tx, 'd1');
            expect(h.staging.remove).toHaveBeenCalledWith(h.tx, 'd1');
            expect(h.r2Deletes.enqueue).toHaveBeenCalledWith(h.tx, [KEY]);
            expect(h.outbox.add).toHaveBeenCalledWith(h.tx, 'document.upload_failed', {
                storageId: 'd1',
                userId: 'u1',
                reason: 'STORAGE_UNAVAILABLE',
            });
        });

        it('a claim past the last attempt (the worker crashed on it before) fails without trying again', async () => {
            const h = build();
            h.staging.claimNext.mockResolvedValue(claim(UPLOAD_MAX_ATTEMPTS + 1));

            await h.worker.tick();

            expect(h.r2.uploadFile).not.toHaveBeenCalled();
            expect(h.docs.markUploadFailed).toHaveBeenCalledWith(h.tx, 'd1');
            expect(h.outbox.add).toHaveBeenCalledWith(h.tx, 'document.upload_failed', expect.objectContaining({ storageId: 'd1' }));
        });

        it('the row was deleted meanwhile: no event, but the key is still queued for deletion', async () => {
            const h = build();
            h.staging.claimNext.mockResolvedValue(claim(UPLOAD_MAX_ATTEMPTS));
            h.r2.uploadFile.mockRejectedValue(new Error('R2 unreachable'));
            h.docs.markUploadFailed.mockResolvedValue(false);
            h.docs.findRaw.mockResolvedValueOnce(uploadingRow()).mockResolvedValueOnce(null);

            await h.worker.tick();

            expect(h.outbox.add).not.toHaveBeenCalled();
            expect(h.r2Deletes.enqueue).toHaveBeenCalledWith(h.tx, [KEY]);
        });

        it('another worker completed the row after this lease expired: the live object is NOT deleted', async () => {
            const h = build();
            h.staging.claimNext.mockResolvedValue(claim(UPLOAD_MAX_ATTEMPTS));
            h.r2.uploadFile.mockRejectedValue(new Error('R2 unreachable'));
            h.docs.markUploadFailed.mockResolvedValue(false);
            h.docs.findRaw
                .mockResolvedValueOnce(uploadingRow())
                .mockResolvedValueOnce(uploadingRow({ processingStatus: 'PENDING', queuedAt: new Date() }));

            await h.worker.tick();

            expect(h.outbox.add).not.toHaveBeenCalled();
            expect(h.r2Deletes.enqueue).not.toHaveBeenCalled();
        });
    });
});

describe('DocumentUploadWorker loops', () => {
    it('uploads UPLOAD_CONCURRENCY files at once, so one slow upload does not hold the others back', async () => {
        const { UPLOAD_CONCURRENCY } = await import('../../config/document.constants');
        const h = build();
        const pending: Array<() => void> = [];
        h.r2.uploadFile.mockImplementation(
            () => new Promise((resolve) => pending.push(() => resolve(KEY)))
        );

        h.worker.onApplicationBootstrap();
        await new Promise((resolve) => setImmediate(resolve));

        expect(UPLOAD_CONCURRENCY).toBeGreaterThan(1);
        expect(h.r2.uploadFile).toHaveBeenCalledTimes(UPLOAD_CONCURRENCY);

        h.staging.claimNext.mockResolvedValue(null);
        const stopped = h.worker.beforeApplicationShutdown();
        pending.forEach((finish) => finish());
        await stopped;
    });

    it('shutdown wakes every sleeping loop at once', async () => {
        const h = build();
        h.staging.claimNext.mockResolvedValue(null);
        h.worker.onApplicationBootstrap();
        await new Promise((resolve) => setImmediate(resolve));

        const started = Date.now();
        await h.worker.beforeApplicationShutdown();
        expect(Date.now() - started).toBeLessThan(500); // not one poll interval per loop
    });
});
