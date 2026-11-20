import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { ImageUploadService } from './image-upload.service';
import { R2ImageController } from './r2-image.controller';

const MB = 1024 * 1024;
const png = (size: number) => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(size - 8)]);

describe('R2ImageController (POST /r2/image)', () => {
    let app: INestApplication;
    const images = { upload: jest.fn() };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [R2ImageController],
            providers: [{ provide: ImageUploadService, useValue: images }],
        }).compile();
        app = moduleRef.createNestApplication();
        app.use((req: { user?: { id: string } }, _res: unknown, next: () => void) => {
            req.user = { id: 'u1' };
            next();
        });
        await app.init();
    });
    afterAll(() => app.close());
    beforeEach(() => images.upload.mockReset().mockResolvedValue({ url: 'https://r2.public/images/u1/x.png', keyR2: 'images/u1/x.png' }));

    const post = (data: Buffer) => request(app.getHttpServer()).post('/r2/image').attach('file', data, { filename: 'a.png', contentType: 'image/png' });

    it('an image over 2 MB is cut off by the multipart parser (413) and never reaches the service', async () => {
        const res = await post(png(2 * MB + 1));

        expect(res.status).toBe(413);
        expect(images.upload).not.toHaveBeenCalled();
    });

    it('an image of exactly 2 MB is accepted', async () => {
        const res = await post(png(2 * MB));

        expect(res.status).toBe(201);
        expect(res.body).toEqual({ url: 'https://r2.public/images/u1/x.png' });
    });
});
