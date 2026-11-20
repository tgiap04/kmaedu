import {
    ATTEMPT_DEADLINE_GRACE_MS,
    AttemptDeadlinePassedException,
    attemptDeadline,
    isPastDeadline,
    minutesUntilDeadline,
    tokenExpirySeconds,
} from './attempt-deadline';

const T0 = new Date('2026-11-20T10:00:00.000Z');
const at = (ms: number) => new Date(T0.getTime() + ms);
const MIN = 60_000;

describe('attemptDeadline', () => {
    it('is null when the session has neither a duration nor an end time', () => {
        expect(attemptDeadline(T0, { durationMinutes: null, endTime: null })).toBeNull();
    });

    it('is startedAt + duration when only the duration is set', () => {
        expect(attemptDeadline(T0, { durationMinutes: 45, endTime: null })).toEqual(at(45 * MIN));
    });

    it('is the session end when only the end time is set', () => {
        expect(attemptDeadline(T0, { durationMinutes: null, endTime: at(90 * MIN) })).toEqual(at(90 * MIN));
    });

    it('is the earlier of the two when both are set', () => {
        expect(attemptDeadline(T0, { durationMinutes: 45, endTime: at(30 * MIN) })).toEqual(at(30 * MIN));
        expect(attemptDeadline(T0, { durationMinutes: 20, endTime: at(30 * MIN) })).toEqual(at(20 * MIN));
    });

    it('accepts ISO strings (cached rows)', () => {
        expect(
            attemptDeadline(T0.toISOString(), { durationMinutes: 10, endTime: at(5 * MIN).toISOString() })
        ).toEqual(at(5 * MIN));
    });
});

describe('isPastDeadline', () => {
    const deadline = at(10 * MIN);

    it('never passes without a deadline', () => {
        expect(isPastDeadline(null, at(10_000 * MIN))).toBe(false);
    });

    it('allows the 30 s grace after the deadline, inclusive', () => {
        expect(ATTEMPT_DEADLINE_GRACE_MS).toBe(30_000);
        expect(isPastDeadline(deadline, deadline)).toBe(false);
        expect(isPastDeadline(deadline, at(10 * MIN + 30_000))).toBe(false);
        expect(isPastDeadline(deadline, at(10 * MIN + 30_001))).toBe(true);
    });
});

describe('tokenExpirySeconds', () => {
    it('runs to deadline + grace', () => {
        expect(tokenExpirySeconds(at(10 * MIN), T0)).toBe(10 * 60 + 30);
    });

    it('rounds up a partial second', () => {
        expect(tokenExpirySeconds(at(1_500), T0)).toBe(32);
    });

    it('is at least 1 s once the deadline has gone (the token is dead on arrival)', () => {
        expect(tokenExpirySeconds(at(-5 * MIN), T0)).toBe(1);
    });
});

describe('minutesUntilDeadline', () => {
    it('floors the minutes from startedAt to the deadline', () => {
        expect(minutesUntilDeadline(T0, at(45 * MIN + 59_000))).toBe(45);
    });

    it('is 0 for a deadline at or before startedAt', () => {
        expect(minutesUntilDeadline(T0, at(-MIN))).toBe(0);
    });
});

describe('AttemptDeadlinePassedException', () => {
    it('is a 409 with code ATTEMPT_DEADLINE_PASSED', () => {
        const e = new AttemptDeadlinePassedException();
        expect(e.getStatus()).toBe(409);
        expect(e.getResponse()).toMatchObject({ statusCode: 409, code: 'ATTEMPT_DEADLINE_PASSED' });
    });
});
