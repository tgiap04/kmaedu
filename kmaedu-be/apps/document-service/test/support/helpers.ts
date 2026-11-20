import * as request from 'supertest';
import type { FakeR2 } from './fake-r2';
import type { Server } from 'http';
import type { PrismaService } from '../../src/prisma';
import { rid, type TestUser } from './document-test-app';

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

/** One request against the app; no token = anonymous. Paths are under `/api/v1`. */
export function call(server: Server, method: Method, path: string, token?: string, body?: object): request.Test {
    let req = request(server)[method](`/api/v1${path}`);
    if (token) req = req.set('Authorization', `Bearer ${token}`);
    return body ? req.send(body) : req;
}

export const MB = 1024 * 1024;

/** `size` bytes that start like a PDF: the type check reads magic bytes, never the client's Content-Type. */
export const pdf = (size: number, fill = 7): Buffer => Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(size - 9, fill)]);

/** A PNG header followed by zeros. */
export const png = (size: number): Buffer =>
    Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(size - 8)]);

/** A valid `POST /ai/upload` body: an object the user already stored under their own key. */
export function registerBody(user: TestUser, sizeBytes = 3 * MB) {
    const keyR2 = `ai-uploads/${user.id}/${rid()}-lecture.pdf`;
    return { filename: `lecture-${rid()}.pdf`, url: `https://r2.test/${keyR2}`, mimetype: 'application/pdf', size: sizeBytes, keyR2 };
}

export const outbox = (prisma: PrismaService, type: string) =>
    prisma.outboxEvent.findMany({ where: { type }, orderBy: { seq: 'asc' } });

export const outboxFor = async (prisma: PrismaService, type: string, storageId: string) =>
    (await outbox(prisma, type)).filter((row) => JSON.stringify(row.envelope).includes(storageId));

export const queuedKeys = async (prisma: PrismaService, keys: string[]): Promise<string[]> =>
    (
        await prisma.$queryRaw<Array<{ key: string }>>`
            SELECT key FROM r2_delete_tasks WHERE key = ANY(${keys}::text[]) ORDER BY key`
    ).map((r) => r.key);

/**
 * `POST /ai/upload` registers an object the client stored itself, and the service reads its size and type
 * back through a ranged GET on a presigned URL. This answers those GETs from the fake r2's objects
 * (`https://r2.test/signed/<key>?ttl=..`) and lets every other request through.
 */
export function stubStoredObjects(r2: FakeR2): jest.SpyInstance {
    const real = global.fetch;
    return jest.spyOn(global, 'fetch').mockImplementation((async (input: string | URL | Request, init?: RequestInit) => {
        const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
        if (url.origin !== 'https://r2.test' || !url.pathname.startsWith('/signed/')) return real(input as never, init);
        const object = r2.uploaded.get(decodeURIComponent(url.pathname.slice('/signed/'.length)));
        if (!object) return new Response(null, { status: 404 });
        const head = object.subarray(0, 64 * 1024);
        return new Response(new Uint8Array(head), {
            status: 206,
            headers: { 'content-range': `bytes 0-${head.length - 1}/${object.length}` },
        });
    }) as never);
}

/** A `POST /ai/upload` body whose object really sits in the fake r2 (the client's size/url/mimetype are ignored anyway). */
export function storedRegisterBody(r2: FakeR2, user: TestUser, sizeBytes = 3 * MB) {
    const body = registerBody(user, sizeBytes);
    r2.uploaded.set(body.keyR2, pdf(sizeBytes));
    return body;
}
