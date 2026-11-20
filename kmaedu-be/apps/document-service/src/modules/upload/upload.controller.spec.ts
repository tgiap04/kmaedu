import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { UploadController } from './upload.controller';
import { DocumentDeleteService } from './document-delete.service';
import { DocumentQueryService } from './document-query.service';
import { DocumentRegisterService } from './document-register.service';
import { DocumentUploadService } from './document-upload.service';
import { DocumentUrlService } from './document-url.service';

const MB = 1024 * 1024;
const pdf = (size: number) => Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(size - 9, 7)]);
const row = { id: 'd1', userId: 'u1', filename: 'a.pdf', keyR2: 'ai-teacher/u1/k.pdf', url: '', mimetype: 'application/pdf', size: 10, processingStatus: 'PENDING', pageCount: 0, createdAt: new Date(), updatedAt: new Date() };

describe('UploadController (HTTP limits and URLs)', () => {
    let app: INestApplication;
    const uploads = { quick: jest.fn() };
    const queries = { getOwned: jest.fn() };
    const urls = { withUrl: jest.fn(async (r: { keyR2: string }) => ({ ...r, url: `https://signed/${r.keyR2}` })) };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [UploadController],
            providers: [
                { provide: DocumentUploadService, useValue: uploads },
                { provide: DocumentRegisterService, useValue: {} },
                { provide: DocumentQueryService, useValue: queries },
                { provide: DocumentDeleteService, useValue: {} },
                { provide: DocumentUrlService, useValue: urls },
            ],
        }).compile();
        app = moduleRef.createNestApplication();
        app.use((req: { user?: { id: string } }, _res: unknown, next: () => void) => {
            req.user = { id: 'u1' };
            next();
        });
        await app.init();
    });
    afterAll(() => app.close());
    beforeEach(() => {
        uploads.quick.mockReset().mockResolvedValue(row);
        queries.getOwned.mockReset().mockResolvedValue({ ...row, url: 'https://r2.public/legacy-public-url' });
    });

    const quick = (data: Buffer) => request(app.getHttpServer()).post('/ai/quick-upload').attach('file', data, { filename: 'a.pdf', contentType: 'application/pdf' });

    it('an upload over 5 MB is cut off by the multipart parser (413) and never reaches the service', async () => {
        const res = await quick(pdf(5 * MB + 1));

        expect(res.status).toBe(413);
        expect(uploads.quick).not.toHaveBeenCalled();
    });

    it('a file of exactly 5 MB is accepted and answered with a presigned url, not the stored one', async () => {
        const res = await quick(pdf(5 * MB));

        expect(res.status).toBe(201);
        expect(res.body).toEqual({ success: true, userStorageId: 'd1', filename: 'a.pdf', url: 'https://signed/ai-teacher/u1/k.pdf' });
        expect(uploads.quick).toHaveBeenCalledWith('u1', expect.objectContaining({ filename: 'a.pdf' }));
    });

    it('GET /ai/upload/:id never returns the stored (legacy public) url', async () => {
        const res = await request(app.getHttpServer()).get('/ai/upload/d1');

        expect(res.status).toBe(200);
        expect(res.body.url).toBe('https://signed/ai-teacher/u1/k.pdf');
    });
});
