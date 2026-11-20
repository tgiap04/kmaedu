import { Metadata } from '@grpc/grpc-js';
import { setPrincipal } from '@kmaedu/auth-jwt';
import { DocumentGrpcController } from './document.grpc.controller';

const stored = (id: string) => ({
    id,
    userId: 'u1',
    filename: `${id}.pdf`,
    mimetype: 'application/pdf',
    size: 10,
    keyR2: `ai-uploads/u1/${id}.pdf`,
    url: `https://r2.public/ai-uploads/u1/${id}-legacy.pdf`, // a permanent public url stored by an older version
    processingStatus: 'PENDING',
    pageCount: 0,
    createdAt: new Date(1),
    updatedAt: new Date(2),
});

function userMetadata(): Metadata {
    const md = new Metadata();
    const context = { getType: () => 'rpc', switchToRpc: () => ({ getContext: () => md }) };
    setPrincipal(context as never, { kind: 'user', id: 'u1' } as never);
    return md;
}

function build() {
    const urls = { withUrls: jest.fn(async (rows: Array<{ keyR2: string }>) => rows.map((r) => ({ ...r, url: `https://signed/${r.keyR2}` }))) };
    const uploads = { createFromBytes: jest.fn(async () => ({ document: stored('d1'), reused: false })) };
    const queries = {
        getByIds: jest.fn(async () => [stored('d1'), stored('d2')]),
        listRecent: jest.fn(async () => [stored('d1')]),
    };
    const processing = { ensureProcessed: jest.fn(async () => stored('d1')) };
    const controller = new DocumentGrpcController(uploads as never, queries as never, processing as never, {} as never, urls as never);
    return { controller, uploads, queries, processing };
}

const SIGNED = (id: string) => `https://signed/ai-uploads/u1/${id}.pdf`;

describe('DocumentGrpcController: a private document is never described with its permanent public url', () => {
    it('GetDocumentsByIds', async () => {
        const h = build();
        const res = await h.controller.getDocumentsByIds({ ids: ['d1', 'd2'] }, userMetadata());
        expect(res.documents.map((d) => d.url)).toEqual([SIGNED('d1'), SIGNED('d2')]);
    });

    it('ListDocuments', async () => {
        const h = build();
        const res = await h.controller.listDocuments({ page: 1, size: 10 }, userMetadata());
        expect(res.documents.map((d) => d.url)).toEqual([SIGNED('d1')]);
    });

    it('EnsureProcessed and CreateUpload', async () => {
        const h = build();
        expect((await h.controller.ensureProcessed({ id: 'd1' }, userMetadata())).document?.url).toBe(SIGNED('d1'));
        const created = await h.controller.createUpload(
            { filename: 'a.pdf', mimetype: 'application/pdf', data: Buffer.from('%PDF-1.7'), reuseDuplicate: false },
            userMetadata()
        );
        expect(created.document?.url).toBe(SIGNED('d1'));
    });
});
