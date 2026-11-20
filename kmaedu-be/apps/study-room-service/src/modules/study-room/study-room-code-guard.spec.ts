import { HttpException } from '@nestjs/common';
import {
    JOIN_CODE_GLOBAL_LIMIT,
    JOIN_CODE_ROOM_LIMIT,
    JOIN_CODE_USER_LIMIT,
    StudyRoomCodeGuard,
} from './study-room-code-guard';

/** In-memory stand-in for the ioredis calls the guard uses, with a fake clock. */
class FakeRedis {
    now = 0;
    broken = false;
    private data = new Map<string, { value: number; expiresAt?: number }>();
    private live(key: string) {
        const e = this.data.get(key);
        if (e?.expiresAt !== undefined && e.expiresAt <= this.now) {
            this.data.delete(key);
            return undefined;
        }
        return e;
    }
    private guard() {
        if (this.broken) throw new Error('redis down');
    }
    async decr(key: string) {
        this.guard();
        const e = this.live(key);
        if (e) e.value -= 1;
    }
    multi() {
        const ops: Array<() => unknown> = [];
        const chain = {
            incr: (key: string) => {
                ops.push(() => {
                    const e = this.live(key) ?? { value: 0 };
                    e.value += 1;
                    this.data.set(key, e);
                    return e.value;
                });
                return chain;
            },
            expire: (key: string, seconds: number, mode: string) => {
                ops.push(() => {
                    const e = this.live(key)!;
                    if (mode === 'NX' && e.expiresAt !== undefined) return 0;
                    e.expiresAt = this.now + seconds * 1000;
                    return 1;
                });
                return chain;
            },
            ttl: (key: string) => {
                ops.push(() => {
                    const e = this.live(key)!;
                    return Math.ceil(((e.expiresAt ?? this.now) - this.now) / 1000);
                });
                return chain;
            },
            exec: async () => {
                this.guard();
                return ops.map((op) => [null, op()] as [null, unknown]);
            },
        };
        return chain;
    }
}

describe('StudyRoomCodeGuard', () => {
    let redis: FakeRedis;
    let guard: StudyRoomCodeGuard;
    const code = async (p: Promise<unknown>) => {
        try {
            await p;
            return 'ok';
        } catch (e) {
            const x = e as HttpException;
            return `${x.getStatus()} ${(x.getResponse() as { code: string }).code}`;
        }
    };
    /** A wrong code: the slot is taken and never given back. */
    const miss = (userId: string, roomId?: string) => code(guard.takeGuess(userId, roomId));

    beforeEach(() => {
        redis = new FakeRedis();
        guard = new StudyRoomCodeGuard({ getClient: () => redis } as never);
    });

    it('documents its limits', () => {
        expect(JOIN_CODE_USER_LIMIT).toBe(10);
        expect(JOIN_CODE_ROOM_LIMIT).toBe(500);
        expect(JOIN_CODE_GLOBAL_LIMIT).toBe(3000);
    });

    it('allows 10 wrong codes per user, then answers 429 CODE_LOCKED', async () => {
        for (let i = 0; i < JOIN_CODE_USER_LIMIT; i++) expect(await miss('u1')).toBe('ok');
        expect(await miss('u1')).toBe('429 CODE_LOCKED');
    });

    it('reports a retry window', async () => {
        for (let i = 0; i < 11; i++) await miss('u1').catch(() => undefined);
        await expect(guard.takeGuess('u1')).rejects.toMatchObject({
            response: expect.objectContaining({
                retryAfterSeconds: expect.any(Number),
            }),
        });
    });

    it('does not lock another user', async () => {
        for (let i = 0; i < 11; i++) await miss('u1');
        expect(await miss('u2')).toBe('ok');
    });

    it('unlocks after the 15 minute window', async () => {
        for (let i = 0; i < 11; i++) await miss('u1');
        redis.now += 901_000;
        expect(await miss('u1')).toBe('ok');
    });

    it('a right code is refunded, so it neither costs a slot nor resets the counter', async () => {
        for (let i = 0; i < 9; i++) await miss('u1');
        const refund = await guard.takeGuess('u1');
        await refund();
        // An attacker owning one valid code cannot use it to reset: still only 10 misses.
        expect(await miss('u1')).toBe('ok');
        expect(await miss('u1')).toBe('429 CODE_LOCKED');
    });

    it('counts per room across users when a room id is given', async () => {
        for (let u = 0; u < JOIN_CODE_ROOM_LIMIT; u++) expect(await miss(`u${u}`, 'room1')).toBe('ok');
        expect(await miss('fresh', 'room1')).toBe('429 CODE_LOCKED');
        expect(await miss('fresh', 'room2')).toBe('ok');
    });

    it('caps wrong codes across the whole service per minute', async () => {
        for (let u = 0; u < JOIN_CODE_GLOBAL_LIMIT; u++) expect(await miss(`g${u}`)).toBe('ok');
        expect(await miss('fresh')).toBe('429 CODE_LOCKED');
        redis.now += 61_000;
        expect(await miss('fresh')).toBe('ok');
    });

    it('does not let a locked user burn the shared budget', async () => {
        for (let i = 0; i < 400; i++) await miss('spammer');
        expect(await miss('fresh')).toBe('ok');
    });

    it('fails closed with 503 when Redis errors', async () => {
        redis.broken = true;
        expect(await miss('u1')).toBe('503 CODE_CHECK_UNAVAILABLE');
    });
});
