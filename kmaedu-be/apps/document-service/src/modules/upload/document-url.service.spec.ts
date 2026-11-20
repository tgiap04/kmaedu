import { DocumentUrlService } from './document-url.service';

const row = (over: Record<string, unknown> = {}) => ({ id: 'd1', keyR2: 'ai-uploads/u1/k.pdf', url: 'https://r2.public/ai-uploads/u1/old.pdf', ...over });

function build() {
    const r2 = { createPresignedDownload: jest.fn(async (key: string, ttl: number) => `https://signed/${key}?ttl=${ttl}`) };
    return { service: new DocumentUrlService(r2 as never), r2 };
}

describe('DocumentUrlService (private documents never get a permanent public URL)', () => {
    it('replaces the stored url, legacy public ones included, with a short-lived presigned GET of the key', async () => {
        const h = build();

        const [out] = await h.service.withUrls([row()]);

        expect(out.url).toBe('https://signed/ai-uploads/u1/k.pdf?ttl=3600');
        expect(out).toMatchObject({ id: 'd1', keyR2: 'ai-uploads/u1/k.pdf' });
    });

    it('signs every row of a page and keeps their order', async () => {
        const h = build();

        const out = await h.service.withUrls([row({ keyR2: 'ai-uploads/u1/a.pdf' }), row({ keyR2: 'ai-teacher/u1/b.pdf' })]);

        expect(out.map((r) => r.url)).toEqual(['https://signed/ai-uploads/u1/a.pdf?ttl=3600', 'https://signed/ai-teacher/u1/b.pdf?ttl=3600']);
    });

    it('an r2 outage degrades to an empty url instead of failing the read, and never falls back to the public url', async () => {
        const h = build();
        h.r2.createPresignedDownload.mockRejectedValue(new Error('r2 down'));

        const [out] = await h.service.withUrls([row()]);

        expect(out.url).toBe('');
    });
});
