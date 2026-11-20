import { LeaveAttemptSchema } from './progress.dto';

describe('LeaveAttemptSchema', () => {
    it('takes a missing body as an empty one (a page unload may send none)', () => {
        expect(LeaveAttemptSchema.parse(undefined)).toEqual({});
        expect(LeaveAttemptSchema.parse(null)).toEqual({});
    });

    it('accepts the /progress body', () => {
        const body = { answers: { q_0: 'A' }, currentIndex: 2, markedQuestions: ['q_1'] };
        expect(LeaveAttemptSchema.parse(body)).toEqual(body);
    });

    it('rejects what /progress rejects', () => {
        expect(LeaveAttemptSchema.safeParse({ currentIndex: -1 }).success).toBe(false);
        expect(LeaveAttemptSchema.safeParse({ answers: { q_0: 1 } }).success).toBe(false);
    });
});
