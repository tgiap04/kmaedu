import { ExamSessionService } from './examsession.service';

// GET /examsessions/study/:id/stats: what the waiting page shows before an attempt.

const STUDENT = 'student-1';

function build(session: Record<string, unknown> = {}) {
    const row = {
        id: 's1',
        status: 1,
        startTime: new Date('2026-11-20T10:00:00.000Z'),
        endTime: new Date('2026-11-20T12:00:00.000Z'),
        passingScore: 50,
        allowRetake: false,
        maxAttempts: 1,
        questionCount: null,
        questionSelectionMode: 0,
        shuffleQuestions: false,
        quizSnapshotHash: 'h1',
        durationMinutes: 45,
        antiCheatEnabled: false,
        allowLeaveMidway: true,
        examRoom: { id: 'room-1', title: 'Phòng thi test 1', description: null, hostId: 'host-1', quizSetTitle: 'Bộ đề test 3' },
        ...session,
    };
    const prisma = {
        examSession: { findUnique: jest.fn(async () => row) },
        examAttempt: { findMany: jest.fn(async () => []) },
    };
    const users = {
        withHost: jest.fn(async <T extends object>(r: T) => ({ ...r, host: { id: 'host-1', username: 'admin', name: 'Admin' } })),
    };
    const service = new ExamSessionService(
        prisma as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        users as never,
        {} as never,
        { load: async () => ({ questions: new Array(18).fill({ labelId: null }) }) } as never,
        {} as never,
        {} as never
    );
    jest.spyOn(service as never, 'checkAccess').mockResolvedValue({ hasAccess: true } as never);
    jest.spyOn(service as never, 'assertStudyAccess').mockReturnValue(undefined as never);
    return { service, prisma, users };
}

describe('ExamSessionService.getExamSessionStatsForStudent', () => {
    it('adds the room, quiz set, organizer and the three attempt rules', async () => {
        const { service } = build();
        const stats = await service.getExamSessionStatsForStudent('s1', STUDENT);
        expect(stats).toMatchObject({
            examRoomId: 'room-1',
            quizSetTitle: 'Bộ đề test 3',
            host: { name: 'Admin', username: 'admin' },
            attemptDurationMinutes: 45,
            antiCheatEnabled: false,
            allowLeaveMidway: true,
            totalQuestions: 18,
        });
    });

    it('keeps the old fields: durationMinutes is still the session window', async () => {
        const { service } = build();
        const stats = await service.getExamSessionStatsForStudent('s1', STUDENT);
        expect(stats.durationMinutes).toBe(120);
    });

    it('sends null for an attempt without a time limit, and a null host when auth has no profile', async () => {
        const { service, users } = build({ durationMinutes: null });
        users.withHost.mockImplementationOnce(async <T extends object>(r: T) => ({ ...r, host: null }));
        const stats = await service.getExamSessionStatsForStudent('s1', STUDENT);
        expect(stats.attemptDurationMinutes).toBeNull();
        expect(stats.host).toBeNull();
    });

    it('counts the questions one attempt gets, by the selection mode', async () => {
        const total = async (session: Record<string, unknown>) =>
            (await build(session).service.getExamSessionStatsForStudent('s1', STUDENT)).totalQuestions;
        expect(await total({ questionSelectionMode: 1, questionCount: 10 })).toBe(10);
        expect(await total({ questionSelectionMode: 1, questionCount: 30 })).toBe(18);
        // ALL ignores a count left over from an earlier random setting.
        expect(await total({ questionSelectionMode: 0, questionCount: 10 })).toBe(18);
        expect(await total({ questionSelectionMode: 2, labelQuestionConfig: [{ labelId: 'unlabeled', count: 4 }] })).toBe(4);
    });

    it('never sends the host id or other host fields beyond the public profile', async () => {
        const { service } = build();
        const stats = await service.getExamSessionStatsForStudent('s1', STUDENT);
        expect(stats).not.toHaveProperty('hostId');
        expect(JSON.stringify(stats)).not.toContain('accessCode');
    });
});

describe('ExamSessionService.getExamSessionById: totalQuestions for the host', () => {
    function buildHost(
        questionCount: number | null,
        load: () => Promise<unknown> = async () => ({ questions: new Array(18).fill({ labelId: null }) }),
        mode = questionCount === null ? 0 : 1
    ) {
        const session = { id: 's1', examRoomId: 'room-1', questionSelectionMode: mode, labelQuestionConfig: null, questionCount, quizSnapshotHash: 'h1', examRoom: { hostId: 'host-1', quizSetId: 'q', quizSetTitle: 'B', sourceDeleted: false } };
        const service = new ExamSessionService(
            { examAttempt: { count: async () => 0 } } as never,
            { findOne: async () => session } as never,
            {} as never,
            {} as never,
            {} as never,
            { withRoomHost: async <T>(s: T) => s } as never,
            {} as never,
            { load } as never,
            { annotate: async (_room: unknown, rows: unknown[]) => rows } as never,
            {} as never
        );
        return service;
    }

    it('ignores a leftover count when the session takes every question', async () => {
        const view = await buildHost(10, undefined, 0).getExamSessionById('s1', { id: 'host-1' } as never, {} as never);
        expect(view).toMatchObject({ totalQuestions: 18 });
    });

    it('is the snapshot size when the session takes every question', async () => {
        const view = await buildHost(null).getExamSessionById('s1', { id: 'host-1' } as never, {} as never);
        expect(view).toMatchObject({ totalQuestions: 18 });
    });

    it('is the drawn count when the session picks a subset', async () => {
        const view = await buildHost(10).getExamSessionById('s1', { id: 'host-1' } as never, {} as never);
        expect(view).toMatchObject({ totalQuestions: 10 });
    });

    it('never exceeds the snapshot size', async () => {
        const view = await buildHost(30).getExamSessionById('s1', { id: 'host-1' } as never, {} as never);
        expect(view).toMatchObject({ totalQuestions: 18 });
    });

    it('is null, not a failed page, when the snapshot cannot be read', async () => {
        const broken = async () => {
            throw new Error('Đề thi của phiên này không hợp lệ');
        };
        const view = await buildHost(null, broken).getExamSessionById('s1', { id: 'host-1' } as never, {} as never);
        expect(view).toMatchObject({ id: 's1', totalQuestions: null });
    });
});
