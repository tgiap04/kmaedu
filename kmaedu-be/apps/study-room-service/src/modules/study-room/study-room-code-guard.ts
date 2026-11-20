import { HttpException, Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@kmaedu/redis';
import { StudyRoomKeys } from './study-room.constants';

/** Wrong invite codes one user may try per window (across every room). */
export const JOIN_CODE_USER_LIMIT = 10;
export const JOIN_CODE_USER_WINDOW_SECONDS = 900;
/** Wrong codes all users together may try against ONE room per window (joinById). High enough that a
 * stranger cannot lock honest members out with a few wrong guesses; 8-character codes (31^8 values) keep it far from a guess. */
export const JOIN_CODE_ROOM_LIMIT = 500;
export const JOIN_CODE_ROOM_WINDOW_SECONDS = 900;
/** Wrong codes the whole service tolerates per window on join-by-code (the code is looked up globally, no room known). */
export const JOIN_CODE_GLOBAL_LIMIT = 3000;
export const JOIN_CODE_GLOBAL_WINDOW_SECONDS = 60;

const locked = (retryAfterSeconds: number): HttpException =>
    new HttpException(
        {
            statusCode: 429,
            code: 'CODE_LOCKED',
            message: 'Nhập sai mã mời quá nhiều lần, hãy thử lại sau',
            retryAfterSeconds: Math.max(retryAfterSeconds, 1),
        },
        429
    );

/**
 * Limits guesses of the 8-character study-room invite code (31^8 values).
 * Same idea as the content/assessment access-code guard: every guess takes a
 * slot with an atomic INCR BEFORE the code is compared; a RIGHT code gives its
 * slot back (the returned `refund`), so a valid code can never be used to
 * reset the counter, and honest joins never run the budget down.
 *
 * Counters, checked in this order so a locked user cannot burn a shared budget:
 *  1. per user (JOIN_CODE_USER_LIMIT per 15 min),
 *  2. per room when the room is known (`joinById`), else one service-wide
 *     counter (`joinByCode` looks the code up across all rooms).
 * Above a limit every guess is refused with 429 CODE_LOCKED, a right code too
 * (otherwise the lock would not stop an account farm). Redis errors are 503.
 */
@Injectable()
export class StudyRoomCodeGuard {
    private readonly logger = new Logger(StudyRoomCodeGuard.name);

    constructor(private readonly redis: RedisService) {}

    private async bump(
        key: string,
        windowSeconds: number
    ): Promise<[count: number, ttl: number]> {
        try {
            const results = await this.redis
                .getClient()
                .multi()
                .incr(key)
                .expire(key, windowSeconds, 'NX')
                .ttl(key)
                .exec();
            if (!results || results.some(([e]) => e))
                throw new Error('INCR transaction failed');
            return [Number(results[0][1]), Number(results[2][1])];
        } catch (err) {
            this.logger.warn(
                `Code check unavailable: ${err instanceof Error ? err.message : String(err)}`
            );
            throw new HttpException(
                {
                    statusCode: 503,
                    code: 'CODE_CHECK_UNAVAILABLE',
                    message: 'Kiểm tra mã mời tạm thời không khả dụng',
                },
                503
            );
        }
    }

    /** Takes one guess slot; resolves to `refund`, to call when the code was right. */
    async takeGuess(
        userId: string,
        roomId?: string
    ): Promise<() => Promise<void>> {
        const userKey = StudyRoomKeys.codeFailUser(userId);
        const [userCount, userTtl] = await this.bump(
            userKey,
            JOIN_CODE_USER_WINDOW_SECONDS
        );
        if (userCount > JOIN_CODE_USER_LIMIT) throw locked(userTtl);

        const sharedKey = roomId
            ? StudyRoomKeys.codeFailRoom(roomId)
            : StudyRoomKeys.codeFailGlobal();
        const [sharedCount, sharedTtl] = await this.bump(
            sharedKey,
            roomId
                ? JOIN_CODE_ROOM_WINDOW_SECONDS
                : JOIN_CODE_GLOBAL_WINDOW_SECONDS
        );
        const sharedLimit = roomId
            ? JOIN_CODE_ROOM_LIMIT
            : JOIN_CODE_GLOBAL_LIMIT;
        if (sharedCount > sharedLimit) throw locked(sharedTtl);

        return async () => {
            try {
                const client = this.redis.getClient();
                await client.decr(userKey);
                await client.decr(sharedKey);
            } catch (err) {
                // The code was right; a stale counter only expires on its own.
                this.logger.warn(
                    `Could not refund a code slot: ${err instanceof Error ? err.message : String(err)}`
                );
            }
        };
    }
}
