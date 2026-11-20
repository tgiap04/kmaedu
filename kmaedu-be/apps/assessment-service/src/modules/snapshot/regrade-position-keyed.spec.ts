import { buildSnapshot } from './snapshot.fixture';
import { hasPositionKeys, regradePositionKeyed } from './regrade-position-keyed';

// Answer letters: q1 A, q2 B, q3 C, q4 D, q5 A
const snapshot = buildSnapshot();

describe('hasPositionKeys', () => {
    it('is true only when some key is a q_<index> key', () => {
        expect(hasPositionKeys({ q_0: 'A' })).toBe(true);
        expect(hasPositionKeys({ q1: 'A', q_3: 'B' })).toBe(true);
        expect(hasPositionKeys({ q1: 'A' })).toBe(false);
        expect(hasPositionKeys({})).toBe(false);
        expect(hasPositionKeys(null)).toBe(false);
        expect(hasPositionKeys(['q_0'])).toBe(false);
    });
});

describe('regradePositionKeyed', () => {
    it('regrades an attempt graded on q_<index> keys and rekeys its answers by question id', () => {
        const result = regradePositionKeyed(snapshot, {
            answers: { q_0: 'C', q_1: 'B' },
            selectedQuestionIds: ['q3', 'q1'],
        });
        expect(result).toEqual({
            answers: { q3: 'C', q1: 'B' },
            correctAnswers: 1,
            totalQuestions: 2,
            score: 50,
        });
    });

    it('uses every snapshot question when the attempt stored no selection', () => {
        const result = regradePositionKeyed(snapshot, {
            answers: { q_0: 'A', q_1: 'B', q_2: 'C', q_3: 'D', q_4: 'A' },
            selectedQuestionIds: [],
        });
        expect(result).toMatchObject({ correctAnswers: 5, totalQuestions: 5, score: 100 });
    });

    it('leaves an attempt already keyed by question id alone (null), so a second run changes nothing', () => {
        expect(regradePositionKeyed(snapshot, { answers: { q1: 'A' }, selectedQuestionIds: ['q1'] })).toBeNull();
        expect(regradePositionKeyed(snapshot, { answers: {}, selectedQuestionIds: ['q1'] })).toBeNull();
    });
});
