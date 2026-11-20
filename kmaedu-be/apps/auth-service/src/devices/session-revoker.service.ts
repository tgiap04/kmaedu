import { Injectable } from '@nestjs/common';
import type { Prisma } from '../prisma';
import { PrismaService } from '../prisma';
import { GatewayControlClient, sessionRevokeExp } from '../clients/gateway-control.client';
import { SessionRevokedPublisher } from './session-revoked.publisher';

export interface RevokedSession {
    id: string;
    sessionId: string;
    userId: string;
}

/**
 * The one place sessions are revoked on purpose (logout, device logout,
 * logout-all-others, password change/reset). In ONE transaction it deactivates
 * the sessions and writes an `auth.session.revoked` event per session (durable
 * path); after commit it fires `GatewayControl.RevokeSession` (fast path, best
 * effort). Already-inactive sessions are skipped: nothing changed, no event.
 */
@Injectable()
export class SessionRevoker {
    constructor(
        private readonly prisma: PrismaService,
        private readonly publisher: SessionRevokedPublisher,
        private readonly gateway: GatewayControlClient
    ) {}

    /** Logout: select by the token's `sid`. */
    async revokeBySid(sid: string): Promise<RevokedSession[]> {
        const revoked = await this.revoke({ sessionId: sid });
        // Unknown or already inactive: its token may still be alive, so the
        // idempotent fast path runs anyway (there is no row to publish for).
        if (revoked.length === 0) await this.gateway.revokeSession(sid, sessionRevokeExp());
        return revoked;
    }

    /** Device logout: select by the session row id. */
    revokeById(id: string): Promise<RevokedSession[]> {
        return this.revoke({ id });
    }

    /** Password change/reset: every active session of the user. */
    revokeAll(userId: string): Promise<RevokedSession[]> {
        return this.revoke({ userId });
    }

    /**
     * Every active session of the user, inside the caller's transaction (deactivate + durable event), so the
     * revocation commits or rolls back with the caller's own writes. Pass the result to `pushRevoked` after commit.
     */
    revokeAllInTx(tx: Prisma.TransactionClient, userId: string): Promise<RevokedSession[]> {
        return this.revokeIn(tx, { userId }, sessionRevokeExp(), Math.floor(Date.now() / 1000));
    }

    /** Fast path after commit (best effort): tell the gateway about sessions revoked by `revokeAllInTx`. */
    async pushRevoked(revoked: RevokedSession[]): Promise<void> {
        const exp = sessionRevokeExp();
        await Promise.all(revoked.map((s) => this.gateway.revokeSession(s.sessionId, exp)));
    }

    /** "Log out other devices": every active session except the current one. */
    revokeAllOthers(userId: string, currentSid: string): Promise<RevokedSession[]> {
        return this.revoke({ userId, sessionId: { not: currentSid } });
    }

    private async revoke(where: Prisma.UserSessionWhereInput): Promise<RevokedSession[]> {
        const exp = sessionRevokeExp();
        const revokedAt = Math.floor(Date.now() / 1000);
        const revoked = await this.prisma.$transaction((tx) => this.revokeIn(tx, where, exp, revokedAt));
        await Promise.all(revoked.map((s) => this.gateway.revokeSession(s.sessionId, exp)));
        return revoked;
    }

    private async revokeIn(
        tx: Prisma.TransactionClient,
        where: Prisma.UserSessionWhereInput,
        exp: number,
        revokedAt: number
    ): Promise<RevokedSession[]> {
        const sessions = await tx.userSession.findMany({
            where: { ...where, isActive: true },
            select: { id: true, sessionId: true, userId: true },
        });
        if (sessions.length === 0) return [];
        await tx.userSession.updateMany({
            where: { id: { in: sessions.map((s) => s.id) } },
            data: { isActive: false },
        });
        for (const s of sessions) {
            await this.publisher.publish(tx, { userId: s.userId, sid: s.sessionId, exp }, revokedAt);
        }
        return sessions;
    }
}
