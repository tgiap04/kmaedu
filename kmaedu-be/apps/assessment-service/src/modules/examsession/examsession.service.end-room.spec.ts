import { Logger, NotFoundException } from '@nestjs/common';
import { ExamSessionService } from './examsession.service';

const HOST = 'host-1';
const ROOM = 'room-1';
const NOW = new Date('2026-11-19T10:00:00.000Z');
const min = (m: number) => new Date(NOW.getTime() + m * 60_000);

type Row = { id: string; examRoomId: string; startTime: Date; endTime: Date | null };
type Attempt = {
    id: string;
    userId: string;
    examSessionId: string;
    status: number;
    answers: Record<string, string>;
    selectedQuestionIds: string[];
    score?: number;
    finishedAt?: Date | null;
    correctAnswers?: number;
    totalQuestions?: number;
};

/** Every session's quiz: two questions, q1 → A and q2 → B. */
const QUIZ = { questions: [{ id: 'q1', answer: 'A' }, { id: 'q2', answer: 'B' }] };

/** Fake prisma that applies the same where-clause the service sends, over in-memory sessions. */
function build(rows: Row[], roomHost: string | null = HOST, attempts: Attempt[] = []) {
    const matches = (r: Row, where: Record<string, any>) => {
        if (where.examRoomId && r.examRoomId !== where.examRoomId) return false;
        if (where.id?.in && !where.id.in.includes(r.id)) return false;
        if (where.startTime?.lte && !(r.startTime <= where.startTime.lte)) return false;
        if (where.OR) {
            const ok = where.OR.some((c: Record<string, any>) =>
                'endTime' in c && c.endTime === null
                    ? r.endTime === null
                    : r.endTime !== null && r.endTime > c.endTime.gt
            );
            if (!ok) return false;
        }
        return true;
    };
    const prisma = {
        examRoom: {
            findFirst: jest.fn(async ({ where }: any) =>
                roomHost && where.id === ROOM && where.hostId === roomHost ? { id: ROOM } : null
            ),
        },
        examSession: {
            findMany: jest.fn(async ({ where }: any) =>
                rows.filter((r) => matches(r, where)).map((r) => ({ id: r.id, quizSnapshotHash: `hash-${r.id}` }))
            ),
            updateMany: jest.fn(async ({ where, data }: any) => {
                const hit = rows.filter((r) => matches(r, where));
                hit.forEach((r) => (r.endTime = data.endTime));
                return { count: hit.length };
            }),
        },
        examAttempt: {
            findMany: jest.fn(async ({ where }: any) =>
                attempts.filter((a) => where.examSessionId.in.includes(a.examSessionId) && a.status === where.status)
            ),
            updateMany: jest.fn(async ({ where, data }: any) => {
                const hit = attempts.filter((a) => a.id === where.id && a.status === where.status);
                hit.forEach((a) => Object.assign(a, data));
                return { count: hit.length };
            }),
        },
        $transaction: jest.fn(async (work: (tx: unknown) => Promise<unknown>) => work(prisma)),
    };
    const snapshots = { load: jest.fn(async (_id: string, _hash: string): Promise<unknown> => QUIZ) };
    const attemptRepo = {
        invalidateItemCache: jest.fn(async (_user: string, _id: string): Promise<void> => undefined),
        invalidateUserListCache: jest.fn(async (_user: string): Promise<void> => undefined),
    };
    const sessionRepo = {
        invalidateItemCache: jest.fn(async (_host: string, _id: string): Promise<void> => undefined),
        invalidateUserListCache: jest.fn(async () => undefined),
    };
    const roomRepo = {
        invalidateItemCache: jest.fn(async () => undefined),
        invalidateUserListCache: jest.fn(async () => undefined),
    };
    const service = new ExamSessionService(
        prisma as never,
        sessionRepo as never,
        roomRepo as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        snapshots as never,
        {} as never,
        attemptRepo as never
    );
    return { service, prisma, sessionRepo, roomRepo, rows, snapshots, attemptRepo, attempts };
}

const user = { id: HOST } as never;

describe('ExamSessionService.endRoom', () => {
    beforeEach(() => {
        jest.useFakeTimers().setSystemTime(NOW);
    });
    afterEach(() => jest.useRealTimers());

    const sessions = (): Row[] => [
        { id: 'open-ended', examRoomId: ROOM, startTime: min(-60), endTime: null },
        { id: 'running', examRoomId: ROOM, startTime: min(-10), endTime: min(50) },
        { id: 'upcoming', examRoomId: ROOM, startTime: min(30), endTime: min(90) },
        { id: 'finished', examRoomId: ROOM, startTime: min(-120), endTime: min(-60) },
        { id: 'elsewhere', examRoomId: 'room-2', startTime: min(-10), endTime: null },
    ];

    it('closes only the sessions running now and leaves the rest alone', async () => {
        const { service, rows } = build(sessions());
        const result = await service.endRoom(ROOM, user);
        expect(result).toEqual({ ended: 2, closedAttempts: 0, endedAt: NOW.toISOString() });
        const end = (id: string) => rows.find((r) => r.id === id)!.endTime;
        expect(end('open-ended')).toEqual(NOW);
        expect(end('running')).toEqual(NOW);
        expect(end('upcoming')).toEqual(min(90));
        expect(end('finished')).toEqual(min(-60));
        expect(end('elsewhere')).toBeNull();
    });

    it('a session starting exactly now counts as running', async () => {
        const { service } = build([{ id: 'edge', examRoomId: ROOM, startTime: NOW, endTime: null }]);
        expect((await service.endRoom(ROOM, user)).ended).toBe(1);
    });

    it('drops the item cache of each ended session, the user list cache and the room cache', async () => {
        const { service, sessionRepo, roomRepo } = build(sessions());
        await service.endRoom(ROOM, user);
        expect(sessionRepo.invalidateItemCache.mock.calls.map((c: unknown[]) => c[1]).sort()).toEqual([
            'open-ended',
            'running',
        ]);
        expect(sessionRepo.invalidateItemCache).toHaveBeenCalledWith(HOST, 'running');
        expect(sessionRepo.invalidateUserListCache).toHaveBeenCalledWith(HOST);
        expect(roomRepo.invalidateItemCache).toHaveBeenCalledWith(HOST, ROOM);
        expect(roomRepo.invalidateUserListCache).toHaveBeenCalledWith(HOST);
    });

    it('nothing running: ended 0, no write, no cache drop, and calling again is safe', async () => {
        const { service, prisma, sessionRepo } = build([
            { id: 'upcoming', examRoomId: ROOM, startTime: min(30), endTime: null },
        ]);
        const first = await service.endRoom(ROOM, user);
        const second = await service.endRoom(ROOM, user);
        expect(first).toEqual({ ended: 0, closedAttempts: 0, endedAt: NOW.toISOString() });
        expect(second.ended).toBe(0);
        expect(prisma.examSession.updateMany).not.toHaveBeenCalled();
        expect(sessionRepo.invalidateItemCache).not.toHaveBeenCalled();
    });

    it('ending twice: the second call finds nothing left to end', async () => {
        const { service } = build(sessions());
        expect((await service.endRoom(ROOM, user)).ended).toBe(2);
        jest.setSystemTime(min(1));
        expect((await service.endRoom(ROOM, user)).ended).toBe(0);
    });

    it("another host's room, or a missing one, is 404 and nothing is written", async () => {
        const { service, prisma } = build(sessions());
        await expect(service.endRoom(ROOM, { id: 'intruder' } as never)).rejects.toBeInstanceOf(NotFoundException);
        await expect(service.endRoom('nope', user)).rejects.toThrow('Phòng thi không tồn tại');
        expect(prisma.examSession.updateMany).not.toHaveBeenCalled();
    });

    it('one failing session cache drop still drops the others and the user list cache', async () => {
        const { service, sessionRepo } = build(sessions());
        sessionRepo.invalidateItemCache.mockImplementation(async (_host: string, id: string) => {
            if (id === 'running') throw new Error('redis down');
        });
        jest.spyOn(Logger.prototype, 'warn').mockImplementation();
        await service.endRoom(ROOM, user);
        expect(sessionRepo.invalidateItemCache).toHaveBeenCalledTimes(2);
        expect(sessionRepo.invalidateUserListCache).toHaveBeenCalledWith(HOST);
    });

    it('records who ended which sessions of which room', async () => {
        const { service } = build(sessions());
        const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
        await service.endRoom(ROOM, user);
        const line = String(log.mock.calls.at(-1)?.[0]);
        expect(line).toContain(ROOM);
        expect(line).toContain(HOST);
        expect(line).toContain('running');
    });

    describe('attempts still open in the ended sessions', () => {
        const IN_PROGRESS = 0;
        const COMPLETED = 1;
        const open = (id: string, sessionId: string, answers: Record<string, string>, status = IN_PROGRESS): Attempt => ({
            id,
            userId: `user-${id}`,
            examSessionId: sessionId,
            status,
            answers,
            selectedQuestionIds: [],
        });

        it('are handed in now, graded on the answers they saved', async () => {
            const attempts = [
                open('half', 'running', { q1: 'A', q2: 'C' }),
                open('blank', 'open-ended', {}),
                open('later', 'upcoming', { q1: 'A' }),
                open('done', 'running', { q1: 'A', q2: 'B' }, COMPLETED),
            ];
            const { service } = build(sessions(), HOST, attempts);

            const result = await service.endRoom(ROOM, user);

            expect(result).toMatchObject({ ended: 2, closedAttempts: 2 });
            expect(attempts[0]).toMatchObject({ status: COMPLETED, score: 50, correctAnswers: 1, totalQuestions: 2, finishedAt: NOW });
            expect(attempts[1]).toMatchObject({ status: COMPLETED, score: 0, correctAnswers: 0, totalQuestions: 2 });
            expect(attempts[2].status).toBe(IN_PROGRESS); // its session has not started: untouched
            expect(attempts[3]).not.toHaveProperty('score'); // already handed in: untouched
        });

        it('grade answers the quiz page saved under q_<index> keys and store them by question id', async () => {
            // the quiz page keys answers by position: q_0 is q1 (answer A), q_1 is q2 (answer B)
            const attempts = [open('paged', 'running', { q_0: 'A', q_1: 'C' })];
            const { service } = build(sessions(), HOST, attempts);

            await service.endRoom(ROOM, user);

            expect(attempts[0]).toMatchObject({ status: COMPLETED, score: 50, correctAnswers: 1, totalQuestions: 2 });
            expect(attempts[0].answers).toEqual({ q1: 'A', q2: 'C' });
        });

        it("drop the closed attempts' caches for their candidates", async () => {
            const attempts = [open('half', 'running', { q1: 'A' })];
            const { service, attemptRepo } = build(sessions(), HOST, attempts);
            await service.endRoom(ROOM, user);
            expect(attemptRepo.invalidateItemCache).toHaveBeenCalledWith('user-half', 'half');
            expect(attemptRepo.invalidateUserListCache).toHaveBeenCalledWith('user-half');
        });

        it('leave the room as it was when a quiz cannot be read: nothing is ended or graded', async () => {
            const attempts = [open('half', 'running', { q1: 'A' })];
            const { service, snapshots, rows } = build(sessions(), HOST, attempts);
            snapshots.load.mockRejectedValue(new Error('snapshot unreadable'));
            await expect(service.endRoom(ROOM, user)).rejects.toThrow('snapshot unreadable');
            expect(rows.find((r) => r.id === 'running')?.endTime).toEqual(min(50));
            expect(attempts[0].status).toBe(IN_PROGRESS);
        });
    });

    it('a failing cache drop does not fail the already-written end', async () => {
        const { service, sessionRepo, roomRepo } = build(sessions());
        sessionRepo.invalidateItemCache.mockRejectedValue(new Error('redis down'));
        roomRepo.invalidateItemCache.mockRejectedValue(new Error('redis down'));
        jest.spyOn(Logger.prototype, 'warn').mockImplementation();
        await expect(service.endRoom(ROOM, user)).resolves.toMatchObject({ ended: 2 });
    });
});
