import { ImageUploadService } from './image-upload.service';

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const upload = (buffer: Buffer, mimetype = 'image/png', originalname = 'a.png') => ({ buffer, mimetype, originalname }) as Express.Multer.File;

function build() {
    const r2 = {
        uploadFile: jest.fn(async (name: string, _data: Buffer, _mime: string, folder: string) => `${folder}/${name}`),
        getPublicUrl: jest.fn((key: string) => `https://r2.public/${key}`),
    };
    return { service: new ImageUploadService(r2 as never), r2 };
}

describe('ImageUploadService', () => {
    it('stores a public image under images/<userId> with a random key and the DETECTED content type', async () => {
        const h = build();

        const out = await h.service.upload(upload(png, 'image/svg+xml', 'x.svg'), 'u1');

        expect(h.r2.uploadFile).toHaveBeenCalledWith(expect.stringMatching(/^[0-9a-f-]{36}\.png$/), png, 'image/png', 'images/u1');
        expect(out.keyR2).toMatch(/^images\/u1\/[0-9a-f-]{36}\.png$/);
        expect(out.url).toBe(`https://r2.public/${out.keyR2}`);
    });

    it('two uploads of the same name in the same millisecond never share a key', async () => {
        const h = build();
        jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

        const [a, b] = await Promise.all([h.service.upload(upload(png), 'u1'), h.service.upload(upload(png), 'u1')]);

        expect(a.keyR2).not.toBe(b.keyR2);
        jest.restoreAllMocks();
    });

    it('rejects an SVG sent as image/png with 400 and stores nothing', async () => {
        const h = build();

        await expect(h.service.upload(upload(svg), 'u1')).rejects.toMatchObject({ status: 400 });

        expect(h.r2.uploadFile).not.toHaveBeenCalled();
    });
});
