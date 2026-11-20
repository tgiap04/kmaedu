import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { UserSession } from '../../prisma';
import { RefreshTokenCipherService } from '@kmaedu/common';

@Injectable()
export class UserSessionRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly refreshTokenCipher: RefreshTokenCipherService
    ) {}

    /**
     * Refresh tokens are encrypted at rest (deterministic AES-256-GCM via
     * RefreshTokenCipherService). Every write stores `seal(plaintext)`,
     * every lookup queries by `seal(incoming)` — the raw token is never
     * persisted and never used directly in a `where` clause.
     */
    async create(data: {
        id: string;
        userId: string;
        sessionId: string;
        refreshToken: string;
        deviceId: string;
        deviceName?: string | null;
        browser?: string | null;
        os?: string | null;
        ipAddress?: string | null;
        country?: string | null;
        city?: string | null;
        expiresAt: Date;
    }): Promise<UserSession> {
        return this.prisma.userSession.create({
            data: {
                ...data,
                refreshToken: this.refreshTokenCipher.seal(data.refreshToken),
            },
        });
    }

    async findByRefreshToken(
        refreshToken: string
    ): Promise<UserSession | null> {
        // Match the current token, or the previous token while it is still
        // inside its grace window. This keeps concurrent tabs/requests that
        // hold the just-rotated token from being treated as invalid.
        const now = new Date();
        const sealed = this.refreshTokenCipher.seal(refreshToken);
        return this.prisma.userSession.findFirst({
            where: {
                OR: [
                    { refreshToken: sealed },
                    {
                        previousRefreshToken: sealed,
                        previousTokenExpiresAt: { gt: now },
                    },
                ],
            },
        });
    }

    /**
     * The active session whose PREVIOUS (rotated-out) token is `refreshToken`, whatever its grace deadline.
     * Seeing that token after the grace window means two parties hold the same session: reuse detection.
     */
    async findByRotatedOutToken(refreshToken: string): Promise<UserSession | null> {
        return this.prisma.userSession.findFirst({
            where: {
                previousRefreshToken: this.refreshTokenCipher.seal(refreshToken),
                isActive: true,
            },
        });
    }

    async findBySessionId(sessionId: string): Promise<UserSession | null> {
        return this.prisma.userSession.findUnique({
            where: { sessionId },
        });
    }

    async findActiveSessionsByUserId(userId: string): Promise<UserSession[]> {
        return this.prisma.userSession.findMany({
            where: {
                userId,
                isActive: true,
            },
            orderBy: { lastActivity: 'desc' },
        });
    }

    async updateLastActivity(sessionId: string): Promise<void> {
        await this.prisma.userSession.update({
            where: { sessionId },
            data: { lastActivity: new Date() },
        });
    }

    async rotateRefreshToken(
        sessionId: string,
        refreshToken: string
    ): Promise<void> {
        await this.prisma.userSession.update({
            where: { sessionId },
            data: {
                refreshToken: this.refreshTokenCipher.seal(refreshToken),
                lastActivity: new Date(),
            },
        });
    }

    // Cửa sổ ân hạn cho refresh token cũ sau khi rotate (mili giây).
    private static readonly REFRESH_GRACE_MS = 60 * 1000;

    /**
     * Rotate refresh token theo cơ chế grace-period.
     *
     * - `currentRefreshToken` là token hiện hành: rotate sang `nextRefreshToken`, giữ token cũ làm
     *   `previousRefreshToken` trong REFRESH_GRACE_MS → `{ rotated: true, refreshToken: next }`.
     * - `currentRefreshToken` là `previousRefreshToken` còn trong grace window (tab khác cùng trình
     *   duyệt vừa rotate): chấp nhận nhưng KHÔNG rotate lại và KHÔNG trả token hiện hành →
     *   `{ rotated: false }`. Trình duyệt đã nhận cookie mới từ response của tab kia; người cầm token
     *   cũ (bị lộ) chỉ lấy được access token ngắn hạn, không lấy được refresh token đang sống.
     *
     * @returns kết quả rotate, hoặc null nếu token không khớp.
     */
    async rotateRefreshTokenIfCurrent(
        sessionId: string,
        currentRefreshToken: string,
        nextRefreshToken: string
    ): Promise<{ rotated: true; refreshToken: string } | { rotated: false } | null> {
        const now = new Date();
        const graceUntil = new Date(
            now.getTime() + UserSessionRepository.REFRESH_GRACE_MS
        );
        const sealedCurrent = this.refreshTokenCipher.seal(currentRefreshToken);
        const sealedNext = this.refreshTokenCipher.seal(nextRefreshToken);

        // Trường hợp 1: token hiện hành → rotate. `nextRefreshToken` is the caller's own freshly
        // generated value, never something read back from the sealed column.
        const rotated = await this.prisma.userSession.updateMany({
            where: {
                sessionId,
                refreshToken: sealedCurrent,
                isActive: true,
                expiresAt: { gt: now },
            },
            data: {
                refreshToken: sealedNext,
                previousRefreshToken: sealedCurrent,
                previousTokenExpiresAt: graceUntil,
                lastActivity: now,
            },
        });

        if (rotated.count === 1) {
            return { rotated: true, refreshToken: nextRefreshToken };
        }

        // Trường hợp 2: token nằm trong grace window (đã rotate ở request khác).
        const session = await this.prisma.userSession.findFirst({
            where: {
                sessionId,
                previousRefreshToken: sealedCurrent,
                previousTokenExpiresAt: { gt: now },
                isActive: true,
                expiresAt: { gt: now },
            },
            select: { id: true },
        });

        return session ? { rotated: false } : null;
    }

    /**
     * The browser whose rotating response was lost still holds the rotated-out token. For that same device
     * (checked by the caller) hand it a fresh token: rotate the session to `nextRefreshToken`, keep the presented
     * token as the previous one for another grace window. The undelivered current token is dropped.
     *
     * @returns whether the session still had `presentedRefreshToken` as its previous token.
     */
    async reissueForRotatedOutToken(
        sessionId: string,
        presentedRefreshToken: string,
        nextRefreshToken: string
    ): Promise<boolean> {
        const now = new Date();
        const { count } = await this.prisma.userSession.updateMany({
            where: {
                sessionId,
                previousRefreshToken: this.refreshTokenCipher.seal(presentedRefreshToken),
                isActive: true,
                expiresAt: { gt: now },
            },
            data: {
                refreshToken: this.refreshTokenCipher.seal(nextRefreshToken),
                previousTokenExpiresAt: new Date(now.getTime() + UserSessionRepository.REFRESH_GRACE_MS),
                lastActivity: now,
            },
        });
        return count === 1;
    }

    async deactivateSession(id: string): Promise<void> {
        await this.prisma.userSession.update({
            where: { id },
            data: { isActive: false },
        });
    }

    async deactivateByRefreshToken(refreshToken: string): Promise<void> {
        await this.prisma.userSession.updateMany({
            where: { refreshToken: this.refreshTokenCipher.seal(refreshToken) },
            data: { isActive: false },
        });
    }

    /**
     * Deactivate every active session for a user, including the current
     * one. Used after a password reset/change so a stolen session cannot
     * survive the credential rotation.
     */
    async deactivateAllSessions(userId: string): Promise<number> {
        const result = await this.prisma.userSession.updateMany({
            where: {
                userId,
                isActive: true,
            },
            data: { isActive: false },
        });
        return result.count;
    }

    async deactivateAllOtherSessions(
        userId: string,
        currentSessionId: string
    ): Promise<number> {
        const result = await this.prisma.userSession.updateMany({
            where: {
                userId,
                sessionId: { not: currentSessionId },
                isActive: true,
            },
            data: { isActive: false },
        });
        return result.count;
    }

    async findById(id: string): Promise<UserSession | null> {
        return this.prisma.userSession.findFirst({
            where: { id },
        });
    }

    // Cleanup methods for cron job
    async deleteExpiredSessions(): Promise<number> {
        const result = await this.prisma.userSession.deleteMany({
            where: {
                expiresAt: { lt: new Date() },
            },
        });
        return result.count;
    }

    async deactivateInactiveSessions(inactiveDays: number): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

        const result = await this.prisma.userSession.updateMany({
            where: {
                lastActivity: { lt: cutoffDate },
                isActive: true,
            },
            data: { isActive: false },
        });
        return result.count;
    }

    async deleteOldSessions(retentionDays: number): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const result = await this.prisma.userSession.deleteMany({
            where: {
                createdAt: { lt: cutoffDate },
            },
        });
        return result.count;
    }
}
