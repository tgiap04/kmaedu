import { ExamAttemptService } from './examattempt.service';

// Legacy POST /examattempts must go through the same path as /start: access, time window, end-room, lock,
// and a drawn question list (an attempt without one would be served the whole pool by secure-quiz).
describe('ExamAttemptService.createExamAttempt (legacy route)', () => {
    function build() {
        const attemptRow = { id: 'att-1', examSessionId: 's1', userId: 'u1', status: 0, examSession: { id: 's1', examRoom: { id: 'r1', hostId: 'h1' } } };
        const repo = {
            findOne: jest.fn(async () => attemptRow),
            invalidateUserListCache: jest.fn(),
            invalidateItemCache: jest.fn(),
            countUserAttempts: jest.fn(async () => 0),
        };
        const sessions = { findOne: jest.fn() };
        const prisma = { $transaction: jest.fn(), examAttempt: { create: jest.fn() } };
        const users = { withUser: jest.fn(async (row: unknown) => row) };
        const service = new ExamAttemptService(
            prisma as never,
            repo as never,
            sessions as never,
            {} as never,
            {} as never,
            {} as never,
            users as never,
            {} as never,
            {} as never,
            {} as never
        );
        return { service, prisma, repo, sessions };
    }

    it('delegates to startExamAttempt, so the attempt gets a drawn question list and every start rule', async () => {
        const { service, prisma, sessions } = build();
        const start = jest
            .spyOn(service, 'startExamAttempt')
            .mockResolvedValue({ message: 'x', examAttempt: { id: 'att-1' }, isResume: false } as never);

        const result: any = await service.createExamAttempt({ id: 'u1' } as never, { examSessionId: 's1', accessCode: '123456' } as never);

        expect(start).toHaveBeenCalledWith({ id: 'u1' }, { examSessionId: 's1', accessCode: '123456' });
        // Nothing is created outside the start path.
        expect(prisma.examAttempt.create).not.toHaveBeenCalled();
        expect(sessions.findOne).not.toHaveBeenCalled();
        expect(result.message).toBe('Bắt đầu làm bài thành công');
        expect(result.examAttempt.id).toBe('att-1');
    });
});
