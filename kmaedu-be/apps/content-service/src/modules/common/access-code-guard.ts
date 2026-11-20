import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { BadRequestException, HttpException, Logger } from '@nestjs/common';
import type Redis from 'ioredis';

export const CODE_FAIL_LIMIT = 5;
export const CODE_FAIL_WINDOW_SECONDS = 900;
/** Wrong or in-flight guesses ALL users together may spend on one resource per window. */
// Sized for a guessing campaign, not for a class mistyping once (a few hundred students must not lock an exam):
// ~500 shared misses per window keeps a 6-digit code at well under a 0.1 % chance per window.
export const CODE_RESOURCE_FAIL_LIMIT = 500;
const ACCESS_CODE_PATTERN = /^\d{6}$/;

const logger = new Logger('AccessCodeGuard');

/** The one place a new 6-digit invite code is made (CSPRNG, zero-padded, so 000000-999999 are all possible). */
export const generateAccessCode = (): string =>
    randomInt(0, 1_000_000).toString().padStart(6, '0');

/** Failure counter key: per resource AND per user, so an attacker only locks themselves. */
export const codeFailKey = (resourceId: string, userId: string): string =>
    `content:codefail:${resourceId}:${userId}`;

/**
 * Shared budget for one resource across every user, so an account farm cannot
 * multiply the per-user limit (5 guesses x N accounts).
 */
export const codeResourceFailKey = (resourceId: string): string =>
    `content:codefail-res:${resourceId}`;

export interface VerifyAccessCodeInput {
    resourceId: string;
    userId: string;
    /** The resource's stored 6-digit code (null/empty = no code set). */
    stored: string | null | undefined;
    /** Whatever the client sent; validated here as well as in the DTO. */
    given: unknown;
}

type CodeRedis = Pick<Redis, 'decr' | 'del' | 'multi'>;

const sha256 = (value: string): Buffer =>
    createHash('sha256').update(value, 'utf8').digest();

function error(
    status: number,
    code: string,
    message: string,
    extra: object = {}
): HttpException {
    return new HttpException(
        { statusCode: status, code, message, ...extra },
        status
    );
}

const locked = (retryAfterSeconds: number): HttpException =>
    error(429, 'CODE_LOCKED', 'Too many wrong codes, try again later', {
        retryAfterSeconds: Math.max(retryAfterSeconds, 1),
    });

const unavailable = (cause: unknown): HttpException => {
    logger.warn(
        `Code check unavailable: ${cause instanceof Error ? cause.message : String(cause)}`
    );
    return error(
        503,
        'CODE_CHECK_UNAVAILABLE',
        'Code check is temporarily unavailable'
    );
};

/** Atomic INCR (EXPIRE on the first) -> [count, ttl]; any Redis problem is a 503. */
async function bump(redis: CodeRedis, key: string): Promise<[number, number]> {
    try {
        const results = await redis
            .multi()
            .incr(key)
            .expire(key, CODE_FAIL_WINDOW_SECONDS, 'NX')
            .ttl(key)
            .exec();
        if (!results || results.some(([e]) => e))
            throw new Error('INCR transaction failed');
        return [Number(results[0][1]), Number(results[2][1])];
    } catch (err) {
        throw unavailable(err);
    }
}

/**
 * The single place an access code is compared (flashcard sets, exam sessions,
 * exam attempts, and the quiz `unlock` later). Fail-closed and race-free:
 * 1. a malformed code is a 400 and is NOT counted;
 * 2. EVERY evaluated attempt first does an atomic INCR (EXPIRE on the first),
 *    so parallel guesses each get a distinct count; above `CODE_FAIL_LIMIT`
 *    the call is refused with 429 BEFORE comparing (a correct code too), which
 *    caps the guesses that are ever evaluated at the limit per window;
 * 3. the comparison is `timingSafeEqual` over sha256 digests (fixed length);
 * 4. success clears the counter; a wrong code at the limit answers 429, below it
 *    400; any Redis error is a 503;
 * 5. a second counter per resource, shared by all users, takes one slot per
 *    evaluated attempt and gives it back on success. Above
 *    `CODE_RESOURCE_FAIL_LIMIT` every attempt on that resource is 429 for the
 *    rest of the window, a CORRECT code included: otherwise the lock would
 *    not stop a farm of accounts, which only needs to be right once. The cost
 *    is that a crowd of wrong guesses can briefly keep honest users out. A
 *    user already locked by (2) is refused before this counter is touched, so
 *    one account cannot burn the shared budget alone.
 */
export async function verifyAccessCodeOrThrow(
    redis: CodeRedis,
    { resourceId, userId, stored, given }: VerifyAccessCodeInput
): Promise<void> {
    if (typeof given !== 'string' || !ACCESS_CODE_PATTERN.test(given)) {
        throw new BadRequestException({
            statusCode: 400,
            code: 'INVALID_CODE_FORMAT',
            message: 'Access code must be 6 digits',
        });
    }

    const key = codeFailKey(resourceId, userId);
    const [count, ttl] = await bump(redis, key);
    if (count > CODE_FAIL_LIMIT) throw locked(ttl);

    const resourceKey = codeResourceFailKey(resourceId);
    const [resourceCount, resourceTtl] = await bump(redis, resourceKey);
    if (resourceCount > CODE_RESOURCE_FAIL_LIMIT) throw locked(resourceTtl);

    if (stored && timingSafeEqual(sha256(stored), sha256(given))) {
        try {
            await redis.del(key);
            // A right code is not a guess: give the shared slot back.
            await redis.decr(resourceKey);
        } catch (err) {
            // The code was right; stale counters only expire on their own.
            logger.warn(
                `Could not clear ${key}: ${err instanceof Error ? err.message : String(err)}`
            );
        }
        return;
    }

    if (count >= CODE_FAIL_LIMIT || resourceCount >= CODE_RESOURCE_FAIL_LIMIT)
        throw locked(count >= CODE_FAIL_LIMIT ? ttl : resourceTtl);
    throw error(400, 'INVALID_CODE', 'Access code is incorrect');
}

/**
 * Drop a resource's shared failure budget. Called when the owner rotates the code: the guesses were against
 * the old code, and rotating is how a host unlocks a resource that a guessing campaign locked. Best effort.
 */
export async function clearResourceCodeFailures(redis: Pick<Redis, 'del'>, resourceId: string): Promise<void> {
    try {
        await redis.del(codeResourceFailKey(resourceId));
    } catch (cause) {
        logger.warn(`Could not clear the code budget of ${resourceId}: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
}
