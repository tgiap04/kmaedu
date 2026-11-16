import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '../../prisma';

type Db = PrismaService | Prisma.TransactionClient;

/** A staging row claimed by the upload worker. `lease` is the exact lease value (text keeps microseconds). */
export interface StagingClaim {
    storageId: string;
    /** Attempts including this one. */
    attempts: number;
    lease: string;
}

/**
 * Bytes of UPLOADING documents (`upload_staging`, FK to `UserStorage` ON DELETE CASCADE).
 * Claiming follows the r2_delete_tasks worker: one autocommitted statement locks the due row with
 * SKIP LOCKED and pushes its lease ahead; every later write is guarded by that exact lease, so a
 * worker whose lease expired cannot disturb the one that re-claimed the row.
 */
@Injectable()
export class UploadStagingRepository {
    constructor(private readonly prisma: PrismaService) {}

    insert(db: Db, storageId: string, data: Buffer): Promise<unknown> {
        return db.uploadStaging.create({ data: { storageId, data: new Uint8Array(data) } });
    }

    /** Next due, unleased row (oldest first) or null. Counts the attempt up front, so a crash loop is bounded. */
    async claimNext(leaseSeconds: number): Promise<StagingClaim | null> {
        const rows = await this.prisma.$queryRaw<Array<{ storageId: string; attempts: number; lease: string }>>`
            UPDATE upload_staging SET lease_until = now() + make_interval(secs => ${leaseSeconds}::double precision),
                attempts = attempts + 1
            WHERE storage_id = (
                SELECT storage_id FROM upload_staging
                WHERE next_attempt_at <= now() AND (lease_until IS NULL OR lease_until <= now())
                ORDER BY next_attempt_at, created_at LIMIT 1 FOR UPDATE SKIP LOCKED)
            RETURNING storage_id AS "storageId", attempts, lease_until::text AS lease`;
        return rows[0] ?? null;
    }

    async loadData(storageId: string): Promise<Buffer | null> {
        const row = await this.prisma.uploadStaging.findUnique({ where: { storageId }, select: { data: true } });
        return row ? Buffer.from(row.data) : null;
    }

    /** Releases the lease and delays the next attempt; false when the lease is no longer ours. */
    async scheduleRetry(claim: StagingClaim, delaySeconds: number, error: string): Promise<boolean> {
        const count = await this.prisma.$executeRaw`
            UPDATE upload_staging SET lease_until = NULL, last_error = ${error},
                next_attempt_at = now() + make_interval(secs => ${delaySeconds}::double precision)
            WHERE storage_id = ${claim.storageId} AND lease_until = ${claim.lease}::timestamptz`;
        return count === 1;
    }

    remove(db: Db, storageId: string): Promise<unknown> {
        return db.uploadStaging.deleteMany({ where: { storageId } });
    }
}
