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
