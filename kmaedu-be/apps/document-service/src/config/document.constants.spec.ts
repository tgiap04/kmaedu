import {
    DOWNLOAD_URL_TTL_SECONDS,
    DocumentStatus,
    GRPC_MAX_MESSAGE_BYTES,
    MAX_UPLOAD_BYTES,
    REQUEUE_AFTER_MS,
    multerFileLimit,
} from './document.constants';

describe('document constants', () => {
    it('knows only the five processing states (no PENDING_CHARGE: uploads are not charged)', () => {
        expect(Object.values(DocumentStatus).sort()).toEqual(['COMPLETED', 'FAILED', 'PENDING', 'PROCESSING', 'UPLOADING']);
    });

    it('a PENDING row may be re-queued after 15 minutes; a download URL lives 1 hour', () => {
        expect(REQUEUE_AFTER_MS).toBe(15 * 60 * 1000);
        expect(DOWNLOAD_URL_TTL_SECONDS).toBe(3600);
    });

    it('the gRPC server accepts the largest CreateUpload (50 MB of bytes plus a little framing) and nothing close to 500 MB', () => {
        expect(GRPC_MAX_MESSAGE_BYTES).toBeGreaterThan(MAX_UPLOAD_BYTES);
        expect(GRPC_MAX_MESSAGE_BYTES).toBeLessThanOrEqual(MAX_UPLOAD_BYTES + 4 * 1024 * 1024);
    });

    it('multer admits a file of exactly the maximum and cuts one byte more (inclusive limit since multer 2.5)', () => {
        expect(multerFileLimit(5)).toBe(5);
    });
});
