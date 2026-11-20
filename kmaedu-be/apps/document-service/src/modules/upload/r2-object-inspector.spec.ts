import { R2ObjectInspector } from './r2-object-inspector';

function build(result: unknown) {
    const r2 = {
        inspectObject: jest.fn(async () => {
            if (result instanceof Error) throw result;
            return result;
        }),
        createPresignedDownload: jest.fn(),
    };
    const fetchMock = jest.spyOn(global, 'fetch');
    return { inspector: new R2ObjectInspector(r2 as never), r2, fetchMock };
}

describe('R2ObjectInspector (what is really stored under a key)', () => {
    afterEach(() => jest.restoreAllMocks());

    it('asks r2-service for the size and the first 64 KiB (document-service has no route to the bucket)', async () => {
        const h = build({ size: 987654, head: Buffer.from('%PDF-1.7 ...') });

        await expect(h.inspector.inspect('ai-uploads/u1/k.pdf')).resolves.toEqual({ size: 987654, head: Buffer.from('%PDF-1.7 ...') });
        expect(h.r2.inspectObject).toHaveBeenCalledWith('ai-uploads/u1/k.pdf', 64 * 1024);
        expect(h.r2.createPresignedDownload).not.toHaveBeenCalled();
        expect(h.fetchMock).not.toHaveBeenCalled();
    });

    it('a missing object is null', async () => {
        await expect(build(null).inspector.inspect('k')).resolves.toBeNull();
    });

    it('a storage error throws (the caller answers 503)', async () => {
        await expect(build(new Error('UNAVAILABLE')).inspector.inspect('k')).rejects.toThrow('UNAVAILABLE');
    });
});
