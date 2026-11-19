import { NotFoundException } from '@nestjs/common';
import { ExamAttemptService } from './examattempt.service';

const HOST = 'host-1';
const ROOM = 'room-1';
const user = { id: HOST } as never;
const T0 = new Date('2026-11-19T10:00:00.000Z');
const at = (m: number) => new Date(T0.getTime() + m * 60_000);

const attempt = (userId: string, over: Record<string, unknown> = {}) => ({
    id: `att-${userId}`,
    examSessionId: 's1',
    userId,
    status: 1,
    score: 80,
    startedAt: at(0),
    finishedAt: at(10),
    ...over,
});

function build(attempts: any[], whitelist: string[] = [], profiles: Record<string, { username: string; name: string | null }> = {}) {
    const prisma = {
        examRoom: {
            findFirst: jest.fn(async ({ where }: any) =>
                where.id === ROOM && where.hostId === HOST ? { id: ROOM } : null
            ),
        },
        examAttempt: { findMany: jest.fn(async () => attempts) },
        examSession: {
            findMany: jest.fn(async () => [
                { id: 's1', assessType: whitelist.length ? 1 : 0, whitelist, passingScore: 50 },
            ]),
        },
    };
    const users = {
        // Same parameters as UserEnricher.profileMap, so a test can read the options it got.
        profileMap: jest.fn(async (ids: string[], _metadata?: unknown, _options?: { strict?: boolean }) =>
            new Map(
                ids
                    .filter((id) => profiles[id])
                    .map((id) => [id, { id, ...profiles[id] }] as const)
            )
        ),
    };
    const service = new ExamAttemptService(
        prisma as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        users as never,
        {} as never,
        {} as never,
        {} as never
    );
    return { service, prisma, users };
}

describe('ExamAttemptService room insights', () => {
    describe('ownership', () => {
        it("overview and candidates answer 404 for another host's room, without touching attempts", async () => {
            const { service, prisma } = build([attempt('u1')]);
            const other = { id: 'intruder' } as never;
            await expect(service.getRoomOverview(ROOM, other, { window: '30m' })).rejects.toBeInstanceOf(
                NotFoundException
            );
            await expect(
                service.getRoomCandidates(ROOM, other, { page: 1, limit: 10 })
            ).rejects.toThrow('Phòng thi không tồn tại');
            await expect(service.getRoomOverview('nope', user, { window: '1h' })).rejects.toBeInstanceOf(
                NotFoundException
            );
            expect(prisma.examAttempt.findMany).not.toHaveBeenCalled();
        });
    });

    describe('getRoomOverview', () => {
        it('summarises the room and attaches the timeline of the requested window', async () => {
            jest.useFakeTimers().setSystemTime(at(100));
            try {
                const { service } = build(
                    [attempt('u1', { score: 100, finishedAt: at(95) }), attempt('u2', { status: 0, finishedAt: null, score: 0 })],
                    ['u3']
                );
                const result = await service.getRoomOverview(ROOM, user, { window: '30m' });
                expect(result).toMatchObject({
                    candidates: 3,
                    completed: 1,
                    inProgress: 1,
                    notStarted: 1,
                    cancelled: 0,
                    averageScore: 100,
                    passed: 1,
                });
                expect(result.scoreBuckets[9]).toBe(1);
                expect(result.timeline).toMatchObject({ window: '30m', bucketMinutes: 2, from: at(70).toISOString() });
                expect(result.timeline.counts[12]).toBe(1); // finished 5 min ago: (95-70)/2
            } finally {
                jest.useRealTimers();
            }
        });

        it('an empty room: zeros and a null average', async () => {
            const { service } = build([]);
            const result = await service.getRoomOverview(ROOM, user, { window: '7d' });
            expect(result).toMatchObject({ candidates: 0, averageScore: null, passed: 0 });
            expect(result.timeline.counts).toHaveLength(14);
        });
    });

    describe('getRoomCandidates', () => {
        const many = Array.from({ length: 25 }, (_, i) =>
            attempt(`u${String(i).padStart(2, '0')}`, { startedAt: at(i) })
        );

        it('pages, reports the totals and looks names up only for the page', async () => {
            const { service, users } = build(many, [], { u10: { username: 'ten', name: 'Ten' } });
            const result = await service.getRoomCandidates(ROOM, user, { page: 2, limit: 10 });
            expect(result).toMatchObject({ total: 25, page: 2, limit: 10, totalPages: 3 });
            expect(result.candidates.map((c) => c.userId)).toEqual(
                many.slice(10, 20).map((a) => a.userId)
            );
            expect(users.profileMap).toHaveBeenCalledTimes(1);
            expect(users.profileMap.mock.calls[0][0]).toHaveLength(10);
            expect(result.candidates[0]).toMatchObject({
                user: { id: 'u10', username: 'ten', name: 'Ten' },
                status: 'submitted',
                attemptCount: 1,
            });
            // no profile -> user null, the row stays
            expect(result.candidates[1].user).toBeNull();
        });

        it('a page beyond the end is empty but keeps the totals', async () => {
            const { service } = build(many);
            const result = await service.getRoomCandidates(ROOM, user, { page: 9, limit: 10 });
            expect(result.candidates).toEqual([]);
            expect(result).toMatchObject({ total: 25, totalPages: 3 });
        });

        it('search loads the names of every candidate, matches without diacritics, then pages', async () => {
            const { service, users } = build(many, [], {
                u03: { username: 'duc', name: 'Nguyễn Văn Đức' },
                u07: { username: 'ducanh', name: 'Trần Đức Anh' },
                u09: { username: 'lan', name: 'Lan' },
            });
            const result = await service.getRoomCandidates(ROOM, user, { page: 1, limit: 1, search: 'ĐỨC' });
            expect(users.profileMap.mock.calls[0][0]).toHaveLength(25);
            expect(users.profileMap).toHaveBeenCalledTimes(1); // the page reuses the same lookup
            expect(result).toMatchObject({ total: 2, totalPages: 2 });
            expect(result.candidates.map((c) => c.userId)).toEqual(['u03']);
        });

        it('search asks auth strictly: an unreachable directory is an error, not an empty result', async () => {
            const { service, users } = build(many, [], {});
            await service.getRoomCandidates(ROOM, user, { page: 1, limit: 10, search: 'duc' });
            expect(users.profileMap.mock.calls[0][2]).toEqual({ strict: true });

            await service.getRoomCandidates(ROOM, user, { page: 1, limit: 10 });
            expect(users.profileMap.mock.calls[1][2]).toBeUndefined(); // display only: degrade to null names
        });

        it('status and result narrow the list before names are fetched for a search', async () => {
            const { service, users } = build(
                [attempt('a', { score: 90 }), attempt('b', { score: 10 }), attempt('c', { status: 0, finishedAt: null })],
                ['d']
            );
            const failed = await service.getRoomCandidates(ROOM, user, { page: 1, limit: 10, result: 'failed', search: 'x' });
            expect(users.profileMap.mock.calls[0][0]).toEqual(['b']);
            expect(failed.total).toBe(0);

            const idle = await service.getRoomCandidates(ROOM, user, { page: 1, limit: 10, status: 'not_started' });
            expect(idle.candidates.map((c) => [c.userId, c.status, c.attemptCount])).toEqual([['d', 'not_started', 0]]);
        });
    });
});
