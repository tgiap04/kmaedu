import { HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import * as crypto from 'crypto';
import { RedisService } from '@kmaedu/redis';

/** Verification, reset-password and change-password codes are limited separately. */
export type CodeKind = 'verify' | 'reset' | 'change';

/** Minimum gap between two codes of the same kind for one account. */
export const CODE_RESEND_COOLDOWN_SECONDS = 60;
/** Codes of one kind one account can be issued in a rolling hour (counted from the first of the hour). */
export const MAX_CODES_PER_HOUR = 5;
/** Past the hourly cap of a reset, the live code is mailed again at most once per this gap. */
export const RESEND_GAP_SECONDS = 300;
const WINDOW_MS = 60 * 60 * 1000;

const tooMany = (retryAfterSeconds: number, message: string) =>
    new HttpException(
        { statusCode: 429, code: 'CODE_RATE_LIMITED', message, retryAfterSeconds },
        429
    );

/** `throw` (default): past the hourly cap the claim is a 429. `resend`: it resolves `resend` instead. */
export interface ClaimOptions {
    overCap?: 'throw' | 'resend';
}
/** `fresh`: a new code may be issued. `resend`: the cap is reached, only the current code may be sent again. */
export type ClaimResult = 'fresh' | 'resend';

const waitText = (seconds: number) =>
    seconds < 90 ? `${seconds} giây` : `${Math.ceil(seconds / 60)} phút`;

/**
 * Caps how many 6-digit codes ONE ACCOUNT can be sent, whatever IP asks: a fresh code resets the per-code
 * guess budget, so without this cap an attacker could loop [ask for a code, guess 5 times] forever.
 * Counters live in Redis (cooldown key + hourly counter, both with a TTL). If Redis fails the code is NOT
 * issued (503): failing open would silently remove the cap.
 */
@Injectable()
export class CodeIssueLimiter {
    constructor(private readonly redis: RedisService) {}

    /**
     * Takes one issue slot for (`kind`, `subject`) or throws 429 `CODE_RATE_LIMITED` (with `retryAfterSeconds`)
     * / 503 `SERVICE_UNAVAILABLE`. `subject` is a user id, or the normalised e-mail for a reset by e-mail
     * (counted for unknown e-mails too, so a 429 does not reveal whether an account exists). With
     * `overCap: 'resend'` a claim past the hourly cap resolves `resend` instead of 429; the cooldown still applies.
     */
    async claim(kind: CodeKind, subject: string, options: ClaimOptions = {}): Promise<ClaimResult> {
        const id = crypto.createHash('sha256').update(subject).digest('hex').slice(0, 32);
        const cooldownKey = `auth:code-issue:${kind}:cooldown:${id}`;
        const hourKey = `auth:code-issue:${kind}:hour:${id}`;
        try {
            const client = this.redis.getClient();

            const first = await client.set(cooldownKey, '1', 'PX', CODE_RESEND_COOLDOWN_SECONDS * 1000, 'NX');
            if (first === null) {
                const seconds = this.seconds(await client.pttl(cooldownKey), CODE_RESEND_COOLDOWN_SECONDS);
                throw tooMany(
                    seconds,
                    `Bạn vừa yêu cầu mã, vui lòng thử lại sau ${waitText(seconds)}`
                );
            }

            const count = await client.incr(hourKey);
            let ttl = await client.pttl(hourKey);
            if (count === 1 || ttl < 0) {
                // A counter without an expiry would block the account for good.
                await client.pexpire(hourKey, WINDOW_MS);
                ttl = WINDOW_MS;
            }
            if (count > MAX_CODES_PER_HOUR) {
                // Reset by e-mail: anyone can spend the cap of someone else's address, so past it the owner may
                // still get the code that is already live (the caller re-sends it, never a fresh one).
                if (options.overCap === 'resend') {
                    // Spaced out so pinging the address cannot flood its owner (about 12 mails an hour at most).
                    const resendKey = `auth:code-issue:${kind}:resend:${id}`;
                    const allowed = await client.set(resendKey, '1', 'PX', RESEND_GAP_SECONDS * 1000, 'NX');
                    if (allowed !== null) return 'resend';
                    const seconds = this.seconds(await client.pttl(resendKey), RESEND_GAP_SECONDS);
                    throw tooMany(seconds, `Bạn đã yêu cầu quá nhiều mã, vui lòng thử lại sau ${waitText(seconds)}`);
                }
                const seconds = this.seconds(ttl, WINDOW_MS / 1000);
                throw tooMany(
                    seconds,
                    `Bạn đã yêu cầu quá nhiều mã, vui lòng thử lại sau ${waitText(seconds)}`
                );
            }
            return 'fresh';
        } catch (error) {
            if (error instanceof HttpException) throw error;
            console.error('[CodeIssueLimiter] Redis error:', (error as Error)?.message);
            throw new ServiceUnavailableException({
                statusCode: 503,
                code: 'SERVICE_UNAVAILABLE',
                message: 'Hệ thống tạm thời chưa gửi được mã, vui lòng thử lại sau ít phút',
            });
        }
    }

    private seconds(ttlMs: number, fallback: number): number {
        return ttlMs > 0 ? Math.ceil(ttlMs / 1000) : fallback;
    }
}
