import { PermanentEventError } from '@kmaedu/messaging';
import { DocumentUploadEventsHandler } from './document-upload-events.handler';
import { GenerationJobService } from './generation-job.service';
import { GenerationQueryService } from './generation-query.service';
import { IN_FLIGHT_STATUSES, JobStatus, OPEN_STATUSES, UPLOAD_FAILED_MESSAGE } from './generation.constants';
import { buildGenerationRequested } from './generation-requested-payload';

const waiting = (over: Record<string, unknown> = {}) => ({
    id: 'j1',
    userId: 'u1',
    storageId: 'd1',
    filename: 'a.pdf',
    type: 'quiz',
    status: JobStatus.WAITING_UPLOAD,
    options: { numItems: 7, isNarrowSearch: true, keyword: 'k' },
    model: 'm1',
    progress: null,
    createdAt: new Date(1234),
    updatedAt: new Date(1234),
    ...over,
});

function build() {
    const tx = { tag: 'tx' };
    const prisma = { $transaction: jest.fn(async (fn: (db: unknown) => unknown) => fn(tx)) };
    const jobs = {
        insert: jest.fn(async (_db: unknown, row: Record<string, unknown>) => waiting(row)),
        transition: jest.fn().mockResolvedValue(true),
        findWaitingForUpload: jest.fn().mockResolvedValue([]),
    };
    const locks = { releaseAfterTerminal: jest.fn().mockResolvedValue(undefined) };
    const outbox = { add: jest.fn().mockResolvedValue(undefined) };
    const ids = { generateId: () => 'j1' };
    const service = new GenerationJobService(prisma as never, jobs as never, locks as never, outbox as never, ids as never);
    return { service, tx, prisma, jobs, locks, outbox };
}

describe('WAITING_UPLOAD is in flight', () => {
    it('lock, cancel and the watchdog all see it', () => {
        expect(IN_FLIGHT_STATUSES).toContain(JobStatus.WAITING_UPLOAD);
        expect(OPEN_STATUSES).toContain(JobStatus.WAITING_UPLOAD);
    });
});

describe('GenerationJobService.submitWaitingForUpload', () => {
    it('inserts the job WAITING_UPLOAD with its options and model and writes NO outbox row', async () => {
        const h = build();
        const options = { numItems: 7, isNarrowSearch: true, keyword: 'k' };

        await expect(
            h.service.submitWaitingForUpload({ userId: 'u1', storageId: 'd1', filename: 'a.pdf', type: 'quiz', options, model: 'm1' })
        ).resolves.toEqual({ jobId: 'j1' });

        expect(h.jobs.insert).toHaveBeenCalledWith(
            h.prisma, // one insert, nothing to roll back together with
            expect.objectContaining({ id: 'j1', status: JobStatus.WAITING_UPLOAD, options, model: 'm1', storageId: 'd1' })
        );
        expect(h.outbox.add).not.toHaveBeenCalled();
    });
});

describe('GenerationJobService.startWaitingForUpload (document.uploaded)', () => {
    const download = { url: 'https://r2.test/signed', mimetype: 'application/pdf' };

    it('promotes each waiting job in its own transaction with the same payload submit() writes', async () => {
        const h = build();
        const a = waiting({ id: 'j1' });
        const b = waiting({ id: 'j2', type: 'flashcard', model: null, options: { numItems: 3, isNarrowSearch: false } });
        h.jobs.findWaitingForUpload.mockResolvedValue([a, b]);

        await expect(h.service.startWaitingForUpload('u1', 'd1', download)).resolves.toBe(2);

        expect(h.jobs.findWaitingForUpload).toHaveBeenCalledTimes(1); // one batch read, no N+1
        expect(h.prisma.$transaction).toHaveBeenCalledTimes(2);
        expect(h.jobs.transition).toHaveBeenCalledWith(h.tx, 'j1', [JobStatus.WAITING_UPLOAD], JobStatus.QUEUED);

        // the very payload submit() writes for the same job
        const viaSubmit = build();
        await viaSubmit.service.submit({
            userId: 'u1', storageId: 'd1', filename: 'a.pdf', type: 'quiz',
            options: { numItems: 7, isNarrowSearch: true, keyword: 'k' }, model: 'm1', download,
        });
        const submitted = viaSubmit.outbox.add.mock.calls[0][2];
        const promoted = h.outbox.add.mock.calls[0][2];
        expect(h.outbox.add.mock.calls[0][1]).toBe('content.generation.requested');
        expect(Object.keys(promoted).sort()).toEqual(Object.keys(submitted).sort());
        expect(promoted).toEqual(submitted);
        expect(h.outbox.add.mock.calls[1][2]).toEqual(
            buildGenerationRequested({ jobId: 'j2', userId: 'u1', storageId: 'd1', type: 'flashcard', options: { numItems: 3, isNarrowSearch: false }, model: null, download })
        );
        expect(h.outbox.add.mock.calls[1][2].model).toBe('');
    });

    it('a job that is no longer WAITING_UPLOAD (replay, cancel, watchdog) gets no outbox row', async () => {
        const h = build();
        h.jobs.findWaitingForUpload.mockResolvedValue([waiting()]);
        h.jobs.transition.mockResolvedValue(false);
        await expect(h.service.startWaitingForUpload('u1', 'd1', download)).resolves.toBe(0);
        expect(h.outbox.add).not.toHaveBeenCalled();
    });

    it('does nothing when no job waits', async () => {
        const h = build();
        await expect(h.service.startWaitingForUpload('u1', 'd1', download)).resolves.toBe(0);
        expect(h.prisma.$transaction).not.toHaveBeenCalled();
    });

    it('a failed outbox write rolls that job back and is not swallowed', async () => {
        const h = build();
        h.jobs.findWaitingForUpload.mockResolvedValue([waiting()]);
        h.outbox.add.mockRejectedValue(new Error('db down'));
        await expect(h.service.startWaitingForUpload('u1', 'd1', download)).rejects.toThrow('db down');
    });
});

describe('GenerationJobService.failWaitingForUpload (document.upload_failed)', () => {
    it('fails WAITING_UPLOAD jobs with UPLOAD_FAILED and releases their locks after the commit', async () => {
        const h = build();
        const a = waiting({ id: 'j1' });
        const b = waiting({ id: 'j2', type: 'flashcard' });
        h.jobs.findWaitingForUpload.mockResolvedValue([a, b]);

        await expect(h.service.failWaitingForUpload('u1', 'd1')).resolves.toBe(2);

        expect(h.jobs.transition).toHaveBeenCalledWith(expect.anything(), 'j1', [JobStatus.WAITING_UPLOAD], JobStatus.FAILED, { error: 'UPLOAD_FAILED' });
        expect(h.locks.releaseAfterTerminal).toHaveBeenCalledTimes(2);
        expect(h.locks.releaseAfterTerminal).toHaveBeenCalledWith(a);
        expect(h.outbox.add).not.toHaveBeenCalled();
    });

    it('a job already settled is neither counted nor unlocked', async () => {
        const h = build();
        h.jobs.findWaitingForUpload.mockResolvedValue([waiting()]);
        h.jobs.transition.mockResolvedValue(false);
        await expect(h.service.failWaitingForUpload('u1', 'd1')).resolves.toBe(0);
        expect(h.locks.releaseAfterTerminal).not.toHaveBeenCalled();
    });
});

describe('DocumentUploadEventsHandler', () => {
    const envelope = (type: string, data: unknown) => ({ id: 'e1', type, source: 'document', data }) as never;
    function handler() {
        const generation = {
            startWaitingForUpload: jest.fn().mockResolvedValue(1),
            failWaitingForUpload: jest.fn().mockResolvedValue(1),
        };
        return { h: new DocumentUploadEventsHandler(generation as never), generation };
    }

    it('document.uploaded hands the user, document and the event downloadUrl + mimetype to the service', async () => {
        const { h, generation } = handler();
        await h.onUploaded(envelope('document.uploaded', { storageId: 'd1', userId: 'u1', filename: 'a.pdf', mimetype: 'application/pdf', downloadUrl: 'https://r2.test/x', extra: 1 }));
        expect(generation.startWaitingForUpload).toHaveBeenCalledWith('u1', 'd1', { url: 'https://r2.test/x', mimetype: 'application/pdf' });
    });

    it('document.uploaded without a mimetype still promotes, without a download (ai-service waits for the OCR)', async () => {
        const { h, generation } = handler();
        await h.onUploaded(envelope('document.uploaded', { storageId: 'd1', userId: 'u1', downloadUrl: 'https://r2.test/x' }));
        expect(generation.startWaitingForUpload).toHaveBeenCalledWith('u1', 'd1', undefined);
    });

    it.each([
        ['no storage id', { userId: 'u1', downloadUrl: 'https://r2.test/x' }],
        ['no user id', { storageId: 'd1', downloadUrl: 'https://r2.test/x' }],
        ['no download url', { storageId: 'd1', userId: 'u1' }],
    ])('document.uploaded with %s is a permanent error', async (_n, data) => {
        const { h, generation } = handler();
        await expect(h.onUploaded(envelope('document.uploaded', data))).rejects.toBeInstanceOf(PermanentEventError);
        expect(generation.startWaitingForUpload).not.toHaveBeenCalled();
    });

    it('document.upload_failed fails the waiting jobs of that document', async () => {
        const { h, generation } = handler();
        await h.onUploadFailed(envelope('document.upload_failed', { storageId: 'd1', userId: 'u1', reason: 'R2_TIMEOUT' }));
        expect(generation.failWaitingForUpload).toHaveBeenCalledWith('u1', 'd1');
    });

    it('document.upload_failed without ids is a permanent error', async () => {
        const { h, generation } = handler();
        await expect(h.onUploadFailed(envelope('document.upload_failed', { userId: 'u1' }))).rejects.toBeInstanceOf(PermanentEventError);
        expect(generation.failWaitingForUpload).not.toHaveBeenCalled();
    });
});

describe('GET job/:id for a job waiting for its upload', () => {
    const user = { id: 'u1' } as never;
    function query(job: Record<string, unknown>) {
        const jobs = { findOwned: jest.fn().mockResolvedValue(waiting(job)), latestByStorage: jest.fn() };
        return new GenerationQueryService(jobs as never, {} as never);
    }

    it('reports the uploading stage stamped with the job creation time', async () => {
        const res = await query({}).getJobStatus('j1', user, undefined);
        expect(res).toMatchObject({ jobId: 'j1', status: 'processing', progress: { stage: 'uploading', at: 1234 } });
    });

    it('keeps a stored progress when there is one', async () => {
        const progress = { stage: 'generating', at: 9 };
        const res = await query({ progress }).getJobStatus('j1', user, undefined);
        expect(res).toMatchObject({ status: 'processing', progress });
    });

    it('an UPLOAD_FAILED job says the upload failed, not that generation failed', async () => {
        const res = await query({ status: JobStatus.FAILED, error: 'UPLOAD_FAILED' }).getJobStatus('j1', user, undefined);
        expect(res).toMatchObject({ status: 'failed', error: UPLOAD_FAILED_MESSAGE });
    });
});
