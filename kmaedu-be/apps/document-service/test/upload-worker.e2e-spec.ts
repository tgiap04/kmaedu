import { lastValueFrom } from 'rxjs';
import { OutboxService, R2DeleteTaskWriter } from '@kmaedu/messaging';
import { R2Client } from '../src/clients/r2.client';
import { DocumentQueueService } from '../src/modules/upload/document-queue.service';
import { DocumentRepository } from '../src/modules/upload/document.repository';
import { DocumentUploadWorker } from '../src/modules/upload/document-upload.worker';
import { UploadStagingRepository } from '../src/modules/upload/upload-staging.repository';
import { UPLOAD_MAX_ATTEMPTS } from '../src/config/document.constants';
import { bootDocumentApp, rid, type DocumentTestApp, type TestUser } from './support/document-test-app';
import { outboxFor, pdf, queuedKeys } from './support/helpers';

/**
 * CreateUpload stages the bytes; the worker role's DocumentUploadWorker stores them in R2 (a real gRPC fake)
 * and hands the document to ai-service. Real Postgres: the claim query (lease, SKIP LOCKED), the FK cascade and
 * the single transaction of every outcome run for real. No RabbitMQ: the outbox rows are inspected.
 */
describe('document upload worker (e2e)', () => {
    let t: DocumentTestApp;
    let worker: DocumentUploadWorker;
    let staging: UploadStagingRepository;

    beforeAll(async () => {
        t = await bootDocumentApp();
        const get = <T>(token: new (...args: never[]) => T): T => t.moduleRef.get(token, { strict: false });
        staging = get(UploadStagingRepository);
        worker = new DocumentUploadWorker(
            t.prisma,
            get(DocumentRepository),
            staging,
            get(R2Client),
            get(DocumentQueueService),
            get(R2DeleteTaskWriter),
            get(OutboxService)
        );
    });
    afterAll(() => t.close());

    /** Creates a staged upload and parks every other staged row, so the worker can only pick this one. */
    const create = async (user: TestUser, data = pdf(4096, 5)) => {
        const res = await lastValueFrom(
            t.grpc.createUpload(
                { filename: `w-${rid()}.pdf`, mimetype: 'application/pdf', data, reuseDuplicate: false },
                await t.md(user)
            )
        );
        const doc = res.document!;
        await t.prisma.uploadStaging.updateMany({
            where: { storageId: { not: doc.id } },
            data: { nextAttemptAt: new Date(Date.now() + 3_600_000) },
        });
        return doc;
    };
    const rowOf = (id: string) => t.prisma.userStorage.findUniqueOrThrow({ where: { id } });
    const stagingOf = (id: string) => t.prisma.uploadStaging.findUnique({ where: { storageId: id } });
    /** Ticks until nothing is due (rows waiting for a retry are not due). */
    const drain = async () => {
        while (await worker.tick()) {
            /* next due row */
        }
    };

    it('stores the bytes under the precomputed key, then PENDING + queuedAt, staging gone, one document.uploaded with the presigned url', async () => {
        const user = t.teacher();
        const doc = await create(user, pdf(5000, 3));

        await drain();

        expect(t.r2.uploaded.get(doc.keyR2)).toEqual(pdf(5000, 3));
        expect(await rowOf(doc.id)).toMatchObject({ processingStatus: 'PENDING', queuedAt: expect.any(Date) });
        expect(await stagingOf(doc.id)).toBeNull();
        const events = await outboxFor(t.prisma, 'document.uploaded', doc.id);
        expect(events).toHaveLength(1);
        expect(events[0].envelope).toMatchObject({
            type: 'document.uploaded',
            data: { storageId: doc.id, userId: user.id, downloadUrl: `https://r2.test/signed/${doc.keyR2}?ttl=3600` },
        });
    });

    it('a failing upload keeps the row UPLOADING and schedules a delayed retry (lease released, attempt counted)', async () => {
        const doc = await create(t.teacher());
        t.r2.failNextUpload.value = true;

        await drain();

        expect(await rowOf(doc.id)).toMatchObject({ processingStatus: 'UPLOADING', queuedAt: null });
        const staged = (await stagingOf(doc.id))!;
        expect(staged).toMatchObject({ attempts: 1, leaseUntil: null, lastError: expect.stringContaining('r2 down') });
        expect(staged.nextAttemptAt.getTime()).toBeGreaterThan(Date.now() + 20_000);
        expect(await outboxFor(t.prisma, 'document.uploaded', doc.id)).toHaveLength(0);

        // once due, the next attempt completes it
        await t.prisma.uploadStaging.update({ where: { storageId: doc.id }, data: { nextAttemptAt: new Date(Date.now() - 1000) } });
        await worker.tick();
        expect((await rowOf(doc.id)).processingStatus).toBe('PENDING');
        expect(await stagingOf(doc.id)).toBeNull();
    });

    it('the last failed attempt: FAILED (queuedAt null), staging dropped, key queued for deletion, one document.upload_failed', async () => {
        const user = t.teacher();
        const doc = await create(user);
        await t.prisma.uploadStaging.update({ where: { storageId: doc.id }, data: { attempts: UPLOAD_MAX_ATTEMPTS - 1 } });
        t.r2.failNextUpload.value = true;

        await drain();

        expect(await rowOf(doc.id)).toMatchObject({ processingStatus: 'FAILED', queuedAt: null });
        expect(await stagingOf(doc.id)).toBeNull();
        expect(await queuedKeys(t.prisma, [doc.keyR2])).toEqual([doc.keyR2]);
        const events = await outboxFor(t.prisma, 'document.upload_failed', doc.id);
        expect(events).toHaveLength(1);
        expect(events[0].envelope).toMatchObject({
            type: 'document.upload_failed',
            source: 'document',
            data: { storageId: doc.id, userId: user.id, reason: 'STORAGE_UNAVAILABLE' },
        });
        expect(await outboxFor(t.prisma, 'document.uploaded', doc.id)).toHaveLength(0);
    });

    it('a FAILED upload is neither a duplicate nor re-queued by EnsureProcessed', async () => {
        const user = t.teacher();
        const doc = await create(user);
        await t.prisma.uploadStaging.update({ where: { storageId: doc.id }, data: { attempts: UPLOAD_MAX_ATTEMPTS - 1 } });
        t.r2.failNextUpload.value = true;
        await drain();

        await lastValueFrom(t.grpc.ensureProcessed({ id: doc.id }, await t.md(user)));
        expect(await outboxFor(t.prisma, 'document.uploaded', doc.id)).toHaveLength(0);
        const again = await lastValueFrom(
            t.grpc.createUpload({ filename: doc.filename, mimetype: 'application/pdf', data: pdf(4096, 5), reuseDuplicate: true }, await t.md(user))
        );
        expect(again.reused).toBe(false);
        expect(again.document!.id).not.toBe(doc.id);
    });

    it('EnsureProcessed on an UPLOADING row changes nothing and emits nothing', async () => {
        const user = t.teacher();
        const doc = await create(user);

        const res = await lastValueFrom(t.grpc.ensureProcessed({ id: doc.id }, await t.md(user)));

        expect(res.document?.processingStatus).toBe(6);
        expect(await rowOf(doc.id)).toMatchObject({ processingStatus: 'UPLOADING', queuedAt: null });
        expect(await outboxFor(t.prisma, 'document.uploaded', doc.id)).toHaveLength(0);
    });

    it('deleting an UPLOADING document drops its staging row (cascade) and queues its key; the worker never uploads it', async () => {
        const user = t.teacher();
        const doc = await create(user);

        await lastValueFrom(t.grpc.deleteDocuments({ ids: [doc.id] }, await t.md(user)));

        expect(await stagingOf(doc.id)).toBeNull();
        expect(await queuedKeys(t.prisma, [doc.keyR2])).toEqual([doc.keyR2]);
        await drain();
        expect(t.r2.calls.filter((c) => c.rpc === 'UploadFile' && c.keys[0] === doc.keyR2)).toHaveLength(0);
    });

    it('the document is deleted while its upload is in flight: the stored key is queued for deletion and nothing is emitted', async () => {
        const user = t.teacher();
        const doc = await create(user);
        const r2 = t.moduleRef.get(R2Client, { strict: false });
        const upload = jest.spyOn(r2, 'uploadFile').mockImplementationOnce(async (name, _data, _type, folder) => {
            await lastValueFrom(t.grpc.deleteDocuments({ ids: [doc.id] }, await t.md(user)));
            return `${folder}/${name}`;
        });

        await drain();
        upload.mockRestore();

        expect(await t.prisma.userStorage.count({ where: { id: doc.id } })).toBe(0);
        // one task from the delete itself, one from the worker that found the row gone after storing the object
        expect(await queuedKeys(t.prisma, [doc.keyR2])).toEqual([doc.keyR2, doc.keyR2]);
        expect(await outboxFor(t.prisma, 'document.uploaded', doc.id)).toHaveLength(0);
        expect(await outboxFor(t.prisma, 'document.upload_failed', doc.id)).toHaveLength(0);
    });

    it('two workers never claim the same staged row (SKIP LOCKED + lease), and a leased row is invisible until the lease ends', async () => {
        const doc = await create(t.teacher());
        // park every other due row far in the future so only `doc` is claimable
        await t.prisma.uploadStaging.updateMany({
            where: { storageId: { not: doc.id } },
            data: { nextAttemptAt: new Date(Date.now() + 3_600_000) },
        });

        const [a, b] = await Promise.all([staging.claimNext(60), staging.claimNext(60)]);

        expect([a, b].filter(Boolean)).toHaveLength(1);
        const claim = (a ?? b)!;
        expect(claim).toMatchObject({ storageId: doc.id, attempts: 1 });
        expect(await staging.claimNext(60)).toBeNull();

        await t.prisma.$executeRaw`UPDATE upload_staging SET lease_until = now() - interval '1 second' WHERE storage_id = ${doc.id}`;
        expect(await staging.claimNext(60)).toMatchObject({ storageId: doc.id, attempts: 2 });
        // the stale first claim can no longer touch the row
        expect(await staging.scheduleRetry(claim, 30, 'late')).toBe(false);
    });
});
