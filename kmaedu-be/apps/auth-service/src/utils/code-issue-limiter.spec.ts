import { createHash } from 'crypto';
import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import {
    CodeIssueLimiter,
    CODE_RESEND_COOLDOWN_SECONDS,
    MAX_CODES_PER_HOUR,
    RESEND_GAP_SECONDS,
} from './code-issue-limiter';

const hourId = (subject: string) => createHash('sha256').update(subject).digest('hex').slice(0, 32);

/** Redis stand-in with the few commands the limiter uses and a clock the test moves by hand. */
function fakeRedis() {
    let now = 1_000_000;
    const data = new Map<string, { value: number; expiresAt: number | null }>();
    const live = (key: string) => {
        const entry = data.get(key);
        if (entry && entry.expiresAt !== null && entry.expiresAt <= now) data.delete(key);
        return data.get(key);
    };
    const client = {
        set: jest.fn(async (key: string, _v: string, _px: 'PX', ms: number, _nx: 'NX') => {
            if (live(key)) return null;
            data.set(key, { value: 1, expiresAt: now + ms });
            return 'OK';
        }),
        incr: jest.fn(async (key: string) => {
            const entry = live(key) ?? { value: 0, expiresAt: null };
            entry.value += 1;
            data.set(key, entry);
            return entry.value;
        }),
        pexpire: jest.fn(async (key: string, ms: number) => {
            const entry = live(key);
            if (entry) entry.expiresAt = now + ms;
            return entry ? 1 : 0;
        }),
        pttl: jest.fn(async (key: string) => {
            const entry = live(key);
            if (!entry) return -2;
            return entry.expiresAt === null ? -1 : entry.expiresAt - now;
        }),
    };
    return { client, advance: (ms: number) => (now += ms) };
}

describe('CodeIssueLimiter', () => {
    let redis: ReturnType<typeof fakeRedis>;
    let limiter: CodeIssueLimiter;

    beforeEach(() => {
        redis = fakeRedis();
        limiter = new CodeIssueLimiter({ getClient: () => redis.client } as never);
    });

    const status = async (promise: Promise<unknown>) =>
        promise.then(
            () => 200,
            (e) => (e instanceof HttpException ? e.getStatus() : 0)
        );

    it('lets the first code through', async () => {
        await expect(limiter.claim('verify', 'user-1')).resolves.toBe('fresh');
    });

    it('refuses a second code of the same kind inside the resend cooldown, with 429 and the wait', async () => {
        await limiter.claim('verify', 'user-1');
        redis.advance(10_000);

        const error = await limiter.claim('verify', 'user-1').catch((e) => e);

        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(429);
        expect(error.getResponse()).toMatchObject({ code: 'CODE_RATE_LIMITED', retryAfterSeconds: 50 });
        expect(error.message).toContain('50 giây');
    });

    it('allows the next code once the cooldown is over', async () => {
        await limiter.claim('verify', 'user-1');
        redis.advance(CODE_RESEND_COOLDOWN_SECONDS * 1000 + 1);

        await expect(limiter.claim('verify', 'user-1')).resolves.toBe('fresh');
    });

    it('stops after MAX_CODES_PER_HOUR codes in an hour even when each waits out the cooldown', async () => {
        for (let i = 0; i < MAX_CODES_PER_HOUR; i++) {
            await limiter.claim('reset', 'a@b.c');
            redis.advance(CODE_RESEND_COOLDOWN_SECONDS * 1000 + 1);
        }

        const error = await limiter.claim('reset', 'a@b.c').catch((e) => e);

        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(429);
        expect(error.message).toMatch(/phút/);
        expect(error.getResponse().retryAfterSeconds).toBeGreaterThan(CODE_RESEND_COOLDOWN_SECONDS);
    });

    it('reset by e-mail: past the hourly cap it answers "resend" instead of 429 (no lock-out of the owner)', async () => {
        for (let i = 0; i < MAX_CODES_PER_HOUR; i++) {
            await expect(limiter.claim('reset', 'a@b.c', { overCap: 'resend' })).resolves.toBe('fresh');
            redis.advance(CODE_RESEND_COOLDOWN_SECONDS * 1000 + 1);
        }

        await expect(limiter.claim('reset', 'a@b.c', { overCap: 'resend' })).resolves.toBe('resend');
        // The resend still waits out the cooldown, so the owner's inbox is not flooded.
        expect(await status(limiter.claim('reset', 'a@b.c', { overCap: 'resend' }))).toBe(429);
    });

    it('past the cap, re-sends are spaced RESEND_GAP_SECONDS apart (at most ~12 mails an hour)', async () => {
        for (let i = 0; i < MAX_CODES_PER_HOUR; i++) {
            await limiter.claim('reset', 'a@b.c', { overCap: 'resend' });
            redis.advance(CODE_RESEND_COOLDOWN_SECONDS * 1000 + 1);
        }
        await expect(limiter.claim('reset', 'a@b.c', { overCap: 'resend' })).resolves.toBe('resend');

        redis.advance(CODE_RESEND_COOLDOWN_SECONDS * 1000 + 1); // cooldown over, resend gap not
        const error = await limiter.claim('reset', 'a@b.c', { overCap: 'resend' }).catch((e) => e);
        expect(error.getStatus()).toBe(429);
        expect(error.getResponse().retryAfterSeconds).toBeGreaterThan(CODE_RESEND_COOLDOWN_SECONDS);

        redis.advance(RESEND_GAP_SECONDS * 1000);
        await expect(limiter.claim('reset', 'a@b.c', { overCap: 'resend' })).resolves.toBe('resend');
        expect(RESEND_GAP_SECONDS).toBe(300);
    });

    it('opens again when the hour is over', async () => {
        for (let i = 0; i < MAX_CODES_PER_HOUR; i++) {
            await limiter.claim('reset', 'a@b.c');
            redis.advance(CODE_RESEND_COOLDOWN_SECONDS * 1000 + 1);
        }
        redis.advance(60 * 60 * 1000);

        await expect(limiter.claim('reset', 'a@b.c')).resolves.toBe('fresh');
    });

    it('does not spend the hourly cap on requests the cooldown refused', async () => {
        await limiter.claim('verify', 'user-1');
        for (let i = 0; i < 20; i++) await status(limiter.claim('verify', 'user-1'));
        redis.advance(CODE_RESEND_COOLDOWN_SECONDS * 1000 + 1);

        await expect(limiter.claim('verify', 'user-1')).resolves.toBe('fresh');
    });

    it('counts each kind and each account on its own', async () => {
        await limiter.claim('verify', 'user-1');

        await expect(limiter.claim('reset', 'user-1')).resolves.toBe('fresh');
        await expect(limiter.claim('change', 'user-1')).resolves.toBe('fresh');
        await expect(limiter.claim('verify', 'user-2')).resolves.toBe('fresh');
    });

    it('never stores the subject in the clear (reset is keyed by e-mail)', async () => {
        await limiter.claim('reset', 'victim@example.com');

        const keys = redis.client.set.mock.calls.map((c) => c[0]).concat(redis.client.incr.mock.calls.map((c) => c[0]));
        expect(keys.length).toBeGreaterThan(0);
        expect(keys.join(' ')).not.toContain('victim@example.com');
    });

    it('heals a counter that lost its expiry, so the account is not blocked for good', async () => {
        redis.client.pexpire.mockResolvedValueOnce(0); // first expire lost
        await limiter.claim('verify', 'user-1');
        redis.advance(CODE_RESEND_COOLDOWN_SECONDS * 1000 + 1);

        await limiter.claim('verify', 'user-1');

        expect(redis.client.pexpire).toHaveBeenCalledTimes(2);
        expect(await redis.client.pttl(`auth:code-issue:verify:hour:${hourId('user-1')}`)).toBeGreaterThan(0);
    });

    it('fails safe: Redis down means 503, not unlimited codes', async () => {
        redis.client.set.mockRejectedValue(new Error('ECONNREFUSED'));

        const error = await limiter.claim('verify', 'user-1').catch((e) => e);

        expect(error).toBeInstanceOf(ServiceUnavailableException);
        expect(error.getResponse()).toMatchObject({ statusCode: 503, code: 'SERVICE_UNAVAILABLE' });
    });

    it('fails safe when the counter step fails after the cooldown was set', async () => {
        redis.client.incr.mockRejectedValue(new Error('ECONNRESET'));

        await expect(limiter.claim('verify', 'user-1')).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
});
