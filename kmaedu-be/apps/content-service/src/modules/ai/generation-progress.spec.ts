import { PermanentEventError } from '@kmaedu/messaging';
import { GenerationEventsHandler } from './generation-events.handler';
import { GenerationJobRepository } from './generation-job.repository';
import { GenerationQueryService } from './generation-query.service';
import { IN_FLIGHT_STATUSES, JobStatus } from './generation.constants';

const envelope = (data: unknown) => ({ id: 'e1', type: 'ai.generation.progress', source: 'ai', data }) as never;

describe('ai.generation.progress (content side)', () => {
    function handler() {
        const jobs = { recordProgress: jest.fn().mockResolvedValue(true) };
        const prisma = { tag: 'prisma' };
        const h = new GenerationEventsHandler(prisma as never, jobs as never, {} as never, {} as never);
        return { h, jobs, prisma };
    }

    it('keeps the stage, its timestamp and the known counters, nothing else', async () => {
        const { h, jobs, prisma } = handler();
        await h.onProgress(envelope({ jobId: 'j1', stage: 'generating', at: 1700, done: 1, total: 3, junk: 'x' }));
        expect(jobs.recordProgress).toHaveBeenCalledWith(prisma, 'j1', { stage: 'generating', at: 1700, done: 1, total: 3 });
    });

    it('passes the graph-wait counters through', async () => {
        const { h, jobs } = handler();
        await h.onProgress(envelope({ jobId: 'j1', stage: 'waiting_graph', at: 5, waited: 2, maxWaits: 40 }));
        expect(jobs.recordProgress.mock.calls[0][2]).toEqual({ stage: 'waiting_graph', at: 5, waited: 2, maxWaits: 40 });
    });

    it.each([
        ['no job id', { stage: 'planning', at: 1 }],
        ['no stage', { jobId: 'j1', at: 1 }],
        ['a negative timestamp', { jobId: 'j1', stage: 'planning', at: -1 }],
        ['an oversized stage', { jobId: 'j1', stage: 'x'.repeat(65), at: 1 }],
        ['a fractional counter', { jobId: 'j1', stage: 'generating', at: 1, done: 1.5 }],
    ])('rejects a payload with %s as permanent', async (_name, data) => {
        const { h, jobs } = handler();
        await expect(h.onProgress(envelope(data))).rejects.toBeInstanceOf(PermanentEventError);
        expect(jobs.recordProgress).not.toHaveBeenCalled();
    });
});

describe('GenerationJobRepository.recordProgress', () => {
    function repo(count: number) {
        const updateMany = jest.fn().mockResolvedValue({ count });
        const db = { generationJob: { updateMany } };
        return { repo: new GenerationJobRepository({} as never), db, updateMany };
    }

    it('writes only an in-flight job, only over an older or missing report, and marks it PROCESSING', async () => {
        const { repo: r, db, updateMany } = repo(1);
        const progress = { stage: 'planning', at: 1700 };
        await expect(r.recordProgress(db as never, 'j1', progress)).resolves.toBe(true);
        const arg = updateMany.mock.calls[0][0];
        expect(arg.where.id).toBe('j1');
        expect(arg.where.status).toEqual({ in: [...IN_FLIGHT_STATUSES] });
        expect(arg.where.OR).toEqual([
            { progress: { equals: expect.anything() } },
            { progress: { path: ['at'], lte: 1700 } },
        ]);
        expect(arg.data).toEqual({ progress, status: JobStatus.PROCESSING });
    });

    it('answers false when the job is settled or a newer report is already stored', async () => {
        const { repo: r, db } = repo(0);
        await expect(r.recordProgress(db as never, 'j1', { stage: 'planning', at: 1 })).resolves.toBe(false);
    });
});

describe('GET job/:id while the job runs', () => {
    const user = { id: 'u1' } as never;
    const base = { id: 'j1', userId: 'u1', storageId: 'd1', filename: 'a.pdf', type: 'quiz', createdAt: new Date(0) };

    function query(job: Record<string, unknown>) {
        const jobs = { findOwned: jest.fn().mockResolvedValue({ ...base, ...job }), latestByStorage: jest.fn() };
        return new GenerationQueryService(jobs as never, {} as never);
    }

    it('returns the stored progress of a PROCESSING job', async () => {
        const progress = { stage: 'generating', at: 9, done: 2, total: 3 };
        const res = await query({ status: JobStatus.PROCESSING, progress }).getJobStatus('j1', user, undefined);
        expect(res).toMatchObject({ jobId: 'j1', status: 'processing', progress });
    });

    it('has no progress key while nothing was reported yet', async () => {
        const res = await query({ status: JobStatus.QUEUED, progress: null }).getJobStatus('j1', user, undefined);
        expect(res).toMatchObject({ status: 'processing' });
        expect(res).not.toHaveProperty('progress');
    });
});
