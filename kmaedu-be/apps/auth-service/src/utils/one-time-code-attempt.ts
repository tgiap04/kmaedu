import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';

/** Wrong guesses one 6-digit code survives, per account, whatever IP they come from. */
export const MAX_WRONG_CODE_GUESSES = 5;

interface CodeRow {
    code: string;
    expiresAt: Date;
}

/** One user's row in `VerifyAccountCode` or `ResetPasswordCode` (same columns). */
export interface CodeStore {
    find(): Promise<CodeRow | null>;
    /**
     * Atomically takes one attempt of exactly this `code` while fewer than `max` were used and it is
     * unexpired; returns rows hit (0 when exhausted, expired or replaced by a newer code).
     */
    claimAttempt(max: number, now: Date, code: string): Promise<number>;
    /** Deletes the row only if it still holds `code` and `max` attempts were used; a newer code is never touched. */
    deleteIfExhausted(max: number, code: string): Promise<void>;
}

export interface CodeMessages {
    invalid: string;
    wrong: string;
    expired: string;
}

/** Constant-time comparison, so response timing leaks nothing about how much of the code matched. */
function isCodeMatch(expected: string, provided: string): boolean {
    const expectedBuf = Buffer.from(expected);
    const providedBuf = Buffer.from(String(provided ?? ''));
    if (expectedBuf.length !== providedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

/**
 * Checks `provided` against the stored code, spending one attempt of THAT code BEFORE comparing, so even
 * parallel guesses get at most MAX_WRONG_CODE_GUESSES comparisons. The row is read first and compared from
 * that snapshot, so a parallel guess that deletes the used-up row cannot fail a correct last guess; callers
 * delete the row after success with `deleteMany`. The last wrong guess deletes the code (only that code):
 * the owner asks for a new one (a fresh code resets the count; how often codes are issued is capped by
 * `CodeIssueLimiter`) — there is no account lock to abuse.
 * Throws 404 (no code) / 400 (wrong, expired, used up); resolves when the code matches.
 */
export async function consumeCodeAttempt(
    store: CodeStore,
    provided: string,
    messages: CodeMessages
): Promise<void> {
    const now = new Date();
    const row = await store.find();
    if (!row) throw new NotFoundException(messages.invalid);

    const claimed = await store.claimAttempt(MAX_WRONG_CODE_GUESSES, now, row.code);
    if (claimed === 0) {
        if (now > row.expiresAt) throw new BadRequestException(messages.expired);
        await store.deleteIfExhausted(MAX_WRONG_CODE_GUESSES, row.code);
        // Used up, unless the owner already got a newer code (then this guess was simply wrong).
        const current = await store.find();
        if (current && current.code !== row.code) throw new BadRequestException(messages.wrong);
        throw new BadRequestException(tooManyGuesses(messages.wrong));
    }
    if (isCodeMatch(row.code, provided)) return;

    await store.deleteIfExhausted(MAX_WRONG_CODE_GUESSES, row.code);
    // Gone exactly when this (or a parallel) guess used the last attempt.
    if (!(await store.find())) throw new BadRequestException(tooManyGuesses(messages.wrong));
    throw new BadRequestException(messages.wrong);
}

const tooManyGuesses = (wrong: string) =>
    `${wrong}. Bạn đã nhập sai ${MAX_WRONG_CODE_GUESSES} lần, vui lòng yêu cầu mã mới`;
