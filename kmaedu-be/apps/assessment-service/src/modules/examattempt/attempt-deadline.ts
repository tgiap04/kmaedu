import { ConflictException } from '@nestjs/common';

type Instant = Date | string;

/** Slack after the deadline for a last auto-save or answer in flight (network, clock skew). */
export const ATTEMPT_DEADLINE_GRACE_MS = 30_000;

/** The session columns that bound an attempt in time. */
export interface AttemptTimeRules {
    durationMinutes: number | null;
    endTime: Instant | null;
}

/**
 * When an attempt must be over: `min(startedAt + durationMinutes, endTime)`, either side optional.
 * `null` when the session has neither (the attempt has no deadline).
 */
export function attemptDeadline(startedAt: Instant, rules: AttemptTimeRules): Date | null {
    const candidates: number[] = [];
    if (rules.durationMinutes != null) {
        candidates.push(new Date(startedAt).getTime() + rules.durationMinutes * 60_000);
    }
    if (rules.endTime != null) {
        candidates.push(new Date(rules.endTime).getTime());
    }
    return candidates.length > 0 ? new Date(Math.min(...candidates)) : null;
}

/** True once `now` is beyond deadline + grace. Never true without a deadline. */
export function isPastDeadline(deadline: Date | null, now: Date = new Date()): boolean {
    return deadline !== null && now.getTime() > deadline.getTime() + ATTEMPT_DEADLINE_GRACE_MS;
}

/** Lifetime of a question token so it dies at deadline + grace (at least 1 s: a JWT needs a positive expiry). */
export function tokenExpirySeconds(deadline: Date, now: Date = new Date()): number {
    const ms = deadline.getTime() + ATTEMPT_DEADLINE_GRACE_MS - now.getTime();
    return Math.max(1, Math.ceil(ms / 1000));
}

/** Whole minutes from the start of the attempt to its deadline (the client's countdown length). */
export function minutesUntilDeadline(startedAt: Instant, deadline: Date): number {
    return Math.max(0, Math.floor((deadline.getTime() - new Date(startedAt).getTime()) / 60_000));
}

/** A write to an attempt after its deadline + grace. */
export class AttemptDeadlinePassedException extends ConflictException {
    constructor() {
        super({
            statusCode: 409,
            code: 'ATTEMPT_DEADLINE_PASSED',
            message: 'Đã hết thời gian làm bài, không thể lưu thêm câu trả lời',
        });
    }
}
