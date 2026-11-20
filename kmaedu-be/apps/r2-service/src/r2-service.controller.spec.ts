import { Test, TestingModule } from '@nestjs/testing';
import { R2ServiceController } from './r2-service.controller';
import { R2ServiceService } from './r2-service.service';

describe('R2ServiceController', () => {
    let controller: R2ServiceController;

    const mockR2ServiceService = {
        uploadFile: jest.fn(),
        getPublicUrl: jest.fn(),
        deleteFile: jest.fn(),
        resolveUrl: jest.fn(async (key: string, ttl: number) => `https://signed/${key}?ttl=${ttl}`),
        inspectObject: jest.fn(),
    };

    beforeEach(async () => {
        const app: TestingModule = await Test.createTestingModule({
            controllers: [R2ServiceController],
            providers: [
                {
                    provide: R2ServiceService,
                    useValue: mockR2ServiceService,
                },
            ],
        }).compile();

        controller = app.get<R2ServiceController>(R2ServiceController);
    });

    it('is defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getFileUrl expiry', () => {
        it.each([
            [0, 3600],
            [-5, 3600],
            [60, 60],
            [24 * 3600, 24 * 3600],
            [99_999_999, 24 * 3600],
        ])('expiresInSeconds %d is served with a lifetime of %d s', async (requested, expected) => {
            const res = await controller.getFileUrl({ keyR2: 'ai-uploads/u1/a.pdf', expiresInSeconds: requested });

            expect(mockR2ServiceService.resolveUrl).toHaveBeenLastCalledWith('ai-uploads/u1/a.pdf', expected);
            expect(res.url).toContain(`ttl=${expected}`);
        });
    });

    describe('inspectObject', () => {
        it('returns size and head, asking for at most 64 KiB whatever the caller wants', async () => {
            mockR2ServiceService.inspectObject.mockResolvedValue({ size: 987654, head: Buffer.from('%PDF') });

            const res = await controller.inspectObject({ key: 'ai-uploads/u1/k.pdf', maxBytes: 10_000_000 });

            expect(mockR2ServiceService.inspectObject).toHaveBeenLastCalledWith('ai-uploads/u1/k.pdf', 64 * 1024);
            expect(res).toEqual({ found: true, size: '987654', head: Buffer.from('%PDF') });
        });

        it('a missing object is found=false', async () => {
            mockR2ServiceService.inspectObject.mockResolvedValue(null);
            await expect(controller.inspectObject({ key: 'k', maxBytes: 0 })).resolves.toEqual({ found: false, size: '0', head: Buffer.alloc(0) });
            expect(mockR2ServiceService.inspectObject).toHaveBeenLastCalledWith('k', 64 * 1024);
        });

        it('rejects an empty key and maps storage errors to INTERNAL', async () => {
            await expect(controller.inspectObject({ key: ' ', maxBytes: 4 })).rejects.toMatchObject({ error: expect.objectContaining({ code: 3 }) });
            mockR2ServiceService.inspectObject.mockRejectedValue(new Error('boom'));
            await expect(controller.inspectObject({ key: 'k', maxBytes: 4 })).rejects.toMatchObject({ error: expect.objectContaining({ code: 13 }) });
        });
    });
});
