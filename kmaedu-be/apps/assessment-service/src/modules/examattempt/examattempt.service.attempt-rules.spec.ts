import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ExamAttemptService } from './examattempt.service';
import { buildSnapshot } from '../snapshot/snapshot.fixture';

// Session attempt rules: deadline (durationMinutes / endTime), anti-cheat flag, leave-midway hand-in.

const OWNER = 'u1';
const ATTEMPT = 'att-1';
const owner = { id: OWNER } as never;
const T0 = new Date('2026-11-20T10:00:00.000Z');
const MIN = 60_000;
const at = (ms: number) => new Date(T0.getTime() + ms);

const session = (over: Record<string, unknown> = {}) => ({
    id: 's1',
    startTime: at(-60 * MIN),
    endTime: null as Date | null,
    durationMinutes: null as number | null,
    antiCheatEnabled: true,
    allowLeaveMidway: true,
    showAnswersAfterSubmit: false,
    passingScore: 0,
    quizSnapshotHash: 'hash-1',
    ...over,
});

const attemptRow = (over: Record<string, unknown> = {}, sessionOver: Record<string, unknown> = {}) => ({
    id: ATTEMPT,
    examSessionId: 's1',
    userId: OWNER,
    status: 0,
    startedAt: T0,
    answers: {} as Record<string, string>,
    currentIndex: 0,
    markedQuestions: [] as string[],
    totalQuestions: 2,
    selectedQuestionIds: ['q1', 'q2'], // answer letters: q1 A, q2 B
    examSession: session(sessionOver),
    ...over,
});

function build(row: ReturnType<typeof attemptRow>) {
    const prisma = {
        examAttempt: {
            // Same filter as the service: id AND owner, so another user's id finds nothing.
            findFirst: jest.fn(async ({ where }: any) =>
                where.id === row.id && where.userId === row.userId ? row : null
            ),
            update: jest.fn(async ({ data }: any) => ({ ...row, ...data })),
            count: jest.fn(async () => 0),
        },
        examSession: {
            findUnique: jest.fn(async () => row.examSession),
        },
    };
    const repo = {
        invalidateUserListCache: jest.fn(async () => undefined),
        invalidateItemCache: jest.fn(async () => undefined),
    };
    const crypto = {
        signQuestionToken: jest.fn(() => 'tok'),
        calculateExpirySeconds: jest.fn(() => 86400),
        verifyQuestionToken: jest.fn(() => ({ qid: 'q1', aid: ATTEMPT, uid: OWNER, t: 'question', i: 0 })),
    };
    const snapshots = { load: jest.fn(async () => buildSnapshot()) };
    const service = new ExamAttemptService(
        prisma as never,
        repo as never,
        {} as never,
        {} as never,
        {} as never,
        crypto as never,
        {} as never,
        {} as never,
        {} as never,
        snapshots as never
    );
    return { service, prisma, repo, crypto };
}

const now = (ms: number) => jest.useFakeTimers().setSystemTime(at(ms));

describe('ExamAttemptService attempt rules', () => {
    afterEach(() => jest.useRealTimers());

    describe('getSecureQuizQuestions', () => {
        it('returns the duration deadline, the flags and tokens that die at deadline + 30 s', async () => {
            now(5 * MIN);
            const { service, crypto } = build(
                attemptRow({}, { durationMinutes: 45, antiCheatEnabled: false, allowLeaveMidway: false })
            );
            const result = await service.getSecureQuizQuestions(ATTEMPT, owner);
            expect(result).toMatchObject({
                deadline: at(45 * MIN).toISOString(),
                timeLimitMinutes: 45,
                antiCheatEnabled: false,
                allowLeaveMidway: false,
            });
            expect(crypto.calculateExpirySeconds).not.toHaveBeenCalled();
            expect(crypto.signQuestionToken).toHaveBeenCalledWith(expect.anything(), 40 * 60 + 30);
        });

        it('caps the deadline at the session end and counts minutes from the attempt start', async () => {
            now(0);
            const { service } = build(attemptRow({}, { durationMinutes: 45, endTime: at(30 * MIN) }));
            const result = await service.getSecureQuizQuestions(ATTEMPT, owner);
            // The session started an hour before the attempt: the countdown is still 30, not 90.
            expect(result).toMatchObject({ deadline: at(30 * MIN).toISOString(), timeLimitMinutes: 30 });
        });

        it('has a null deadline and the old token expiry when the session has no limit', async () => {
            now(0);
            const { service, crypto } = build(attemptRow());
            const result = await service.getSecureQuizQuestions(ATTEMPT, owner);
            expect(result).toMatchObject({
                deadline: null,
                timeLimitMinutes: null,
                antiCheatEnabled: true,
                allowLeaveMidway: true,
            });
            expect(crypto.calculateExpirySeconds).toHaveBeenCalledWith(null);
            expect(crypto.signQuestionToken).toHaveBeenCalledWith(expect.anything(), 86400);
        });
    });

    describe('updateExamAttemptProgress', () => {
        it('answers 409 ATTEMPT_DEADLINE_PASSED after deadline + grace and writes nothing', async () => {
            now(10 * MIN + 30_001);
            const { service, prisma } = build(attemptRow({}, { durationMinutes: 10 }));
            const error = await service
                .updateExamAttemptProgress(ATTEMPT, owner, { answers: { q_0: 'A' } })
                .catch((e) => e);
            expect(error).toBeInstanceOf(ConflictException);
            expect(error.getStatus()).toBe(409);
            expect(error.getResponse()).toMatchObject({ code: 'ATTEMPT_DEADLINE_PASSED' });
            expect(prisma.examAttempt.update).not.toHaveBeenCalled();
        });

        it('refuses to write once another hand-in completed the attempt (no overwrite of a graded attempt)', async () => {
            const { service, prisma } = build(attemptRow());
            prisma.examAttempt.update.mockRejectedValueOnce(Object.assign(new Error('not found'), { code: 'P2025' }));
            await expect(
                service.updateExamAttemptProgress(ATTEMPT, owner, { answers: { q_0: 'A' } })
            ).rejects.toBeInstanceOf(BadRequestException);
            expect(prisma.examAttempt.update.mock.calls[0][0].where).toEqual({ id: ATTEMPT, status: 0 });
        });

        it('still saves inside the grace window', async () => {
            now(10 * MIN + 30_000);
            const { service, prisma } = build(attemptRow({}, { durationMinutes: 10 }));
            await service.updateExamAttemptProgress(ATTEMPT, owner, { answers: { q_0: 'A' } });
            expect(prisma.examAttempt.update).toHaveBeenCalledWith({
                where: { id: ATTEMPT, status: 0 },
                data: { answers: { q_0: 'A' } },
            });
        });
    });

    describe('submitExamAttempt (shared hand-in path)', () => {
        it('grades q_<index> keys and stores answers by question id', async () => {
            const { service, prisma, repo } = build(attemptRow({ answers: { q_0: 'A', q_1: 'C' } }));
            const result = await service.submitExamAttempt(ATTEMPT, owner);
            expect(result).toMatchObject({ score: 50, correctAnswers: 1, totalQuestions: 2, showAnswers: false });
            expect(prisma.examAttempt.update.mock.calls[0][0].data).toMatchObject({
                status: 1,
                answers: { q1: 'A', q2: 'C' },
                score: 50,
            });
            expect(repo.invalidateUserListCache).toHaveBeenCalledWith(OWNER);
            expect(repo.invalidateItemCache).toHaveBeenCalledWith(OWNER, ATTEMPT);
        });

        it('refuses an attempt already handed in', async () => {
            const { service } = build(attemptRow({ status: 1 }));
            await expect(service.submitExamAttempt(ATTEMPT, owner)).rejects.toBeInstanceOf(BadRequestException);
        });

        it('hands in only while the attempt is still in progress, so a concurrent hand-in wins once', async () => {
            const { service, prisma } = build(attemptRow({ answers: { q_0: 'A' } }));
            // Another hand-in (leave, secure-submit) completed the attempt between the read and this write.
            prisma.examAttempt.update.mockRejectedValueOnce(Object.assign(new Error('not found'), { code: 'P2025' }));
            await expect(service.submitExamAttempt(ATTEMPT, owner)).rejects.toBeInstanceOf(BadRequestException);
            expect(prisma.examAttempt.update.mock.calls[0][0].where).toEqual({ id: ATTEMPT, status: 0 });
        });
    });

    describe('submitSecureExamAttempt', () => {
        it('after deadline + grace ignores the answers sent and grades only what was saved in time', async () => {
            now(10 * MIN + 31_000);
            const { service, prisma, crypto } = build(
                attemptRow({ answers: { q_0: 'A' } }, { durationMinutes: 10 })
            );
            // A token fetched late (1 s lifetime) would otherwise carry a fresh, late answer.
            crypto.verifyQuestionToken.mockReturnValue({ qid: 'q2', aid: ATTEMPT, uid: OWNER, t: 'question', i: 1 });
            const result = await service.submitSecureExamAttempt(ATTEMPT, owner, [{ token: 'late', chosen_option: 'B' }]);
            expect(result).toMatchObject({ score: 50, correctAnswers: 1, totalQuestions: 2 });
            expect(prisma.examAttempt.update.mock.calls[0][0].data.answers).toEqual({ q1: 'A' });
        });

        it('answers late in the secure shape: the chosen answers per question, no raw attempt row', async () => {
            now(10 * MIN + 31_000);
            const { service } = build(
                attemptRow({ answers: { q_0: 'A' } }, { durationMinutes: 10, showAnswersAfterSubmit: true })
            );
            const result: any = await service.submitSecureExamAttempt(ATTEMPT, owner, []);
            expect(Object.keys(result.examAttempt).sort()).toEqual(['finishedAt', 'id', 'score', 'status']);
            expect(result.showAnswers).toBe(true);
            expect(result.questions.map((q: any) => [q.id, q.userAnswer])).toEqual([
                ['q1', 'A'],
                ['q2', null],
            ]);
        });

        it('hands in only while the attempt is still in progress, so a concurrent hand-in wins once', async () => {
            const { service, prisma } = build(attemptRow());
            prisma.examAttempt.update.mockRejectedValueOnce(Object.assign(new Error('not found'), { code: 'P2025' }));
            await expect(
                service.submitSecureExamAttempt(ATTEMPT, owner, [{ token: 'tok', chosen_option: 'A' }])
            ).rejects.toBeInstanceOf(BadRequestException);
            expect(prisma.examAttempt.update.mock.calls[0][0].where).toEqual({ id: ATTEMPT, status: 0 });
        });
    });

    describe('startExamAttempt: maxAttempts is the total number of attempts', () => {
        const retake = { allowRetake: true, maxAttempts: 3, assessType: 0, startTime: at(-60 * MIN), endTime: null };

        it('refuses a fourth attempt when the session allows 3 in total', async () => {
            now(0);
            const { service, prisma } = build(attemptRow({}, retake));
            prisma.examAttempt.findFirst.mockResolvedValue(null);
            prisma.examAttempt.count.mockResolvedValue(3);
            const error = await service.startExamAttempt(owner, { examSessionId: 's1' } as never).catch((e) => e);
            expect(error).toBeInstanceOf(BadRequestException);
            expect(error.message).toBe('Bạn đã đạt số lần thi tối đa (3 lần)');
        });
    });

    describe('leaveExamAttempt', () => {
        const strict = { allowLeaveMidway: false };

        it("answers 404 for somebody else's attempt and writes nothing", async () => {
            const { service, prisma } = build(attemptRow({}, strict));
            await expect(service.leaveExamAttempt(ATTEMPT, { id: 'intruder' } as never, {})).rejects.toBeInstanceOf(
                NotFoundException
            );
            expect(prisma.examAttempt.update).not.toHaveBeenCalled();
        });

        it('does not hand in when the session allows leaving midway', async () => {
            const { service, prisma } = build(attemptRow({ answers: { q_0: 'A' } }));
            await expect(service.leaveExamAttempt(ATTEMPT, owner, { answers: { q_0: 'B' } })).resolves.toEqual({
                handedIn: false,
            });
            expect(prisma.examAttempt.update).not.toHaveBeenCalled();
        });

        it('does nothing for an attempt already handed in', async () => {
            const { service, prisma } = build(attemptRow({ status: 1 }, strict));
            await expect(service.leaveExamAttempt(ATTEMPT, owner, {})).resolves.toEqual({ handedIn: false });
            expect(prisma.examAttempt.update).not.toHaveBeenCalled();
        });

        it('hands in and grades the saved q_<index> answers when leaving is not allowed', async () => {
            const { service, prisma, repo } = build(attemptRow({ answers: { q_0: 'A', q_1: 'C' } }, strict));
            await expect(service.leaveExamAttempt(ATTEMPT, owner, {})).resolves.toEqual({
                handedIn: true,
                score: 50,
                correctAnswers: 1,
                totalQuestions: 2,
            });
            expect(prisma.examAttempt.update).toHaveBeenCalledTimes(1);
            expect(prisma.examAttempt.update.mock.calls[0][0]).toMatchObject({
                where: { id: ATTEMPT },
                data: { status: 1, answers: { q1: 'A', q2: 'C' }, correctAnswers: 1, totalQuestions: 2 },
            });
            expect(repo.invalidateUserListCache).toHaveBeenCalledWith(OWNER);
            expect(repo.invalidateItemCache).toHaveBeenCalledWith(OWNER, ATTEMPT);
        });

        it('reports nothing handed in when a concurrent hand-in completed the attempt first', async () => {
            const { service, prisma, repo } = build(attemptRow({ answers: { q_0: 'A' } }, strict));
            prisma.examAttempt.update.mockRejectedValueOnce(Object.assign(new Error('not found'), { code: 'P2025' }));
            await expect(service.leaveExamAttempt(ATTEMPT, owner, {})).resolves.toEqual({ handedIn: false });
            expect(prisma.examAttempt.update.mock.calls[0][0].where).toEqual({ id: ATTEMPT, status: 0 });
            expect(repo.invalidateItemCache).not.toHaveBeenCalled();
        });

        it('saves the body first, then grades it', async () => {
            const { service, prisma } = build(attemptRow({ answers: { q_0: 'B' } }, strict));
            const result = await service.leaveExamAttempt(ATTEMPT, owner, {
                answers: { q_0: 'A', q_1: 'B' },
                currentIndex: 1,
                markedQuestions: ['q_1'],
            });
            expect(result).toEqual({ handedIn: true, score: 100, correctAnswers: 2, totalQuestions: 2 });
            expect(prisma.examAttempt.update.mock.calls[0][0].data).toMatchObject({
                answers: { q1: 'A', q2: 'B' },
                currentIndex: 1,
                markedQuestions: ['q_1'],
            });
        });

        it('ignores body answers sent after deadline + grace and grades what was saved', async () => {
            now(10 * MIN + 31_000);
            const { service, prisma } = build(
                attemptRow({ answers: { q_0: 'A' } }, { ...strict, durationMinutes: 10 })
            );
            const result = await service.leaveExamAttempt(ATTEMPT, owner, { answers: { q_0: 'B', q_1: 'B' } });
            expect(result).toEqual({ handedIn: true, score: 50, correctAnswers: 1, totalQuestions: 2 });
            expect(prisma.examAttempt.update.mock.calls[0][0].data.answers).toEqual({ q1: 'A' });
        });
    });
});
