import { R2ServiceService } from './r2-service.service';

/** The S3 client the service builds must not wait forever on a stalled link, and must retry transient errors. */
describe('R2ServiceService S3 client', () => {
    it('has connection/request timeouts and 3 attempts', async () => {
        const service = new R2ServiceService();
        const { config } = (service as unknown as { s3: { config: Record<string, any> } }).s3;

        await expect(config.maxAttempts()).resolves.toBe(2);
        const handler = await config.requestHandler.configProvider;
        expect(handler).toMatchObject({ connectionTimeout: 10_000, requestTimeout: 4 * 60 * 1000 });
    });
});

describe('R2ServiceService.uploadFile content types (the stored Content-Type is served from the bucket origin)', () => {
    const sent = (service: R2ServiceService) =>
        jest.spyOn((service as unknown as { s3: { send: (c: unknown) => Promise<unknown> } }).s3, 'send').mockResolvedValue({});

    it.each(['image/svg+xml', 'text/html', 'application/xhtml+xml', 'text/xml', 'application/javascript', 'application/octet-stream', ''])(
        'refuses %j and writes nothing',
        async (mimetype) => {
            const service = new R2ServiceService();
            const send = sent(service);

            await expect(service.uploadFile('a.bin', Buffer.from('x'), mimetype, 'images/u1')).rejects.toMatchObject({ status: 400 });

            expect(send).not.toHaveBeenCalled();
        }
    );

    it.each(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])('stores %s inline', async (mimetype) => {
        const service = new R2ServiceService();
        const send = sent(service);

        await service.uploadFile('a.img', Buffer.from('x'), mimetype, 'images/u1');

        const input = (send.mock.calls[0][0] as { input: Record<string, unknown> }).input;
        expect(input).toMatchObject({ ContentType: mimetype, Key: 'images/u1/a.img' });
        expect(input.ContentDisposition).toBeUndefined();
    });

    it.each(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'])(
        'stores %s (parameters stripped) as an attachment, never rendered inline',
        async (mimetype) => {
            const service = new R2ServiceService();
            const send = sent(service);

            await service.uploadFile('a.doc', Buffer.from('x'), `${mimetype}; charset=binary`, 'ai-uploads/u1');

            expect((send.mock.calls[0][0] as { input: Record<string, unknown> }).input).toMatchObject({
                ContentType: mimetype,
                ContentDisposition: 'attachment',
            });
        }
    );
});

describe('R2ServiceService.inspectObject (size + leading bytes, one ranged GET)', () => {
    const { Readable } = require('stream') as typeof import('stream');
    const withSend = (impl: (c: { input: Record<string, unknown> }) => Promise<unknown>) => {
        const service = new R2ServiceService();
        const send = jest
            .spyOn((service as unknown as { s3: { send: (c: unknown) => Promise<unknown> } }).s3, 'send')
            .mockImplementation(impl as never);
        return { service, send };
    };
    const s3Error = (name: string, httpStatusCode: number) => Object.assign(new Error(name), { name, $metadata: { httpStatusCode } });

    it('asks for the first max bytes and reads the total size from ContentRange', async () => {
        const h = withSend(async () => ({ ContentRange: 'bytes 0-3/987654', Body: Readable.from([Buffer.from('%PDF')]) }));

        await expect(h.service.inspectObject('ai-uploads/u1/k.pdf', 4)).resolves.toEqual({ size: 987654, head: Buffer.from('%PDF') });
        expect(h.send.mock.calls[0][0]).toMatchObject({ input: { Key: 'ai-uploads/u1/k.pdf', Range: 'bytes=0-3' } });
    });

    it('never keeps more than max bytes when the store ignores Range', async () => {
        const h = withSend(async () => ({ ContentLength: 10, Body: Readable.from([Buffer.from('abcdef'), Buffer.from('ghij')]) }));
        await expect(h.service.inspectObject('k', 4)).resolves.toEqual({ size: 10, head: Buffer.from('abcd') });
    });

    it('a missing key is null, an empty object has size 0, other errors propagate', async () => {
        await expect(withSend(async () => Promise.reject(s3Error('NoSuchKey', 404))).service.inspectObject('k', 4)).resolves.toBeNull();
        await expect(withSend(async () => Promise.reject(s3Error('InvalidRange', 416))).service.inspectObject('k', 4)).resolves.toEqual({
            size: 0,
            head: Buffer.alloc(0),
        });
        await expect(withSend(async () => Promise.reject(s3Error('InternalError', 500))).service.inspectObject('k', 4)).rejects.toThrow(
            'InternalError'
        );
    });
});
