import { QuizsetService } from './quizset.service';

const user = { id: 'owner' } as never;

function build() {
    let n = 0;
    const tx = {
        quizSet: { findMany: jest.fn().mockResolvedValue([{ id: 'S' }]) },
        quizQuestion: { create: jest.fn().mockResolvedValue({}) },
        detailsQuizQuestion: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
        $transaction: jest.fn(async (work: (t: typeof tx) => unknown) => work(tx)),
        detailsQuizQuestion: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    };
    const repo = {
        findOne: jest.fn().mockResolvedValue({ id: 'S', userId: 'owner' }),
        invalidateUserListCache: jest.fn().mockResolvedValue(undefined),
        invalidateItemCache: jest.fn().mockResolvedValue(undefined),
    };
    const ids = { generateId: jest.fn(() => `id${n++}`) };
    const service = new QuizsetService(prisma as never, repo as never, ids as never, {} as never);
    return { service, prisma, tx };
}

const quiz = (q: string) => ({ question: q, options: ['a', 'b'], answer: 'A' });

describe('QuizsetService.setQuizzsToQuizSet', () => {
    it('returns the ids of the questions it created, in the order they were sent', async () => {
        const { service, tx } = build();
        const res: { createdCount: number; createdQuestionIds?: string[] } = await service.setQuizzsToQuizSet(user, { quizsetIds: ['S'], quizzes: [quiz('1'), quiz('2'), quiz('3')] });

        const created = tx.quizQuestion.create.mock.calls.map(([arg]) => arg.data);
        expect(res.createdCount).toBe(3);
        expect(res.createdQuestionIds).toEqual(created.map((d: { id: string }) => d.id));
        expect(created.map((d: { question: string }) => d.question)).toEqual(['1', '2', '3']);
    });
});

describe('QuizsetService.getQuestionsByLabel', () => {
    it('pages in a stable order: oldest first, then question id (rows created together share a timestamp)', async () => {
        const { service, prisma } = build();
        await service.getQuestionsByLabel('S', null, user, 2, 50);

        expect(prisma.detailsQuizQuestion.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                skip: 50,
                take: 50,
                orderBy: [{ quizQuestion: { createdAt: 'asc' } }, { quizQuestionId: 'asc' }],
            })
        );
    });
});
