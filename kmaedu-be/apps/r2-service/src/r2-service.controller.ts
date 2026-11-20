import { Controller, Logger } from '@nestjs/common';
import { Metadata, status } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { r2V1 } from '@kmaedu/contracts';
import { R2ServiceService } from './r2-service.service';
import { RequirePermissionsOrService, ServiceOnly, assertSelfOrService } from '@kmaedu/auth-jwt';

const MAX_DELETE_KEYS = 10_000;
const DEFAULT_PRESIGN_SECONDS = 3600;
const MAX_PRESIGN_SECONDS = 24 * 3600;
/** Leading bytes InspectObject returns at most (enough for every magic-number check). */
const MAX_INSPECT_BYTES = 64 * 1024;
const inspectBytes = (requested: number): number =>
    requested > 0 ? Math.min(requested, MAX_INSPECT_BYTES) : MAX_INSPECT_BYTES;

/** Default 1 h when absent or not positive, never more than 24 h. */
const clampPresignSeconds = (requested: number): number =>
    Math.min(requested > 0 ? requested : DEFAULT_PRESIGN_SECONDS, MAX_PRESIGN_SECONDS);

@Controller()
@r2V1.R2ServiceControllerMethods()
export class R2ServiceController implements r2V1.R2ServiceController {
    private readonly logger = new Logger(R2ServiceController.name);

    constructor(private readonly r2Service: R2ServiceService) {}

    @ServiceOnly('auth', 'document', 'content')
    async uploadFile(
        data: r2V1.UploadFileRequest
    ): Promise<r2V1.UploadFileResponse> {
        this.logger.log(
            `UploadFile request: filename=${data.filename}, mimetype=${data.mimetype}, folder=${data.folder}, contentSize=${data.content?.length || 0}`
        );

        try {
            const key = await this.r2Service.uploadFile(
                data.filename,
                Buffer.from(data.content),
                data.mimetype,
                data.folder
            );

            this.logger.log(`UploadFile success: key=${key}`);

            return {
                success: true,
                fileId: key,
                url: await this.r2Service.resolveUrl(key),
                keyR2: key,
                message: 'File uploaded successfully',
            };
        } catch (error) {
            this.logger.error(
                `UploadFile failed: ${error.message}`,
                error.stack
            );
            return {
                success: false,
                fileId: '',
                url: '',
                keyR2: '',
                message: `Upload failed: ${error.message}`,
            };
        }
    }

    // Keyed by a storage key (a capability, not owned by a user id) and nobody
    // but the internal services that wrote the key needs it: service-only.
    @ServiceOnly('auth')
    async getFileUrl(
        data: r2V1.GetFileUrlRequest
    ): Promise<r2V1.GetFileUrlResponse> {
        const expiresIn = clampPresignSeconds(data.expiresInSeconds);
        const url = await this.r2Service.resolveUrl(data.keyR2, expiresIn);
        return {
            url,
            expiresAt: String(Date.now() + expiresIn * 1000),
        };
    }

    @ServiceOnly('auth')
    async deleteFile(
        data: r2V1.DeleteFileRequest
    ): Promise<r2V1.DeleteFileResponse> {
        try {
            await this.r2Service.deleteFile(data.keyR2);
            return {
                success: true,
                message: 'File deleted successfully',
            };
        } catch (error) {
            return {
                success: false,
                message: `Delete failed: ${error.message}`,
            };
        }
    }

    @RequirePermissionsOrService([])
    listUserFiles(data: r2V1.ListUserFilesRequest, metadata: Metadata): never {
        // A user token may only name itself; allowlisted services any user.
        assertSelfOrService(metadata, data.userId);
        throw new RpcException({
            code: status.UNIMPLEMENTED,
            message: 'ListUserFiles is not implemented',
        });
    }

    @ServiceOnly('auth', 'vocabulary', 'document', 'ai-chat', 'content')
    async deleteObjects(
        data: r2V1.DeleteObjectsRequest
    ): Promise<r2V1.DeleteObjectsResponse> {
        const keys = [...new Set(data.keys)];
        if (keys.length > MAX_DELETE_KEYS) {
            throw new RpcException({
                code: status.INVALID_ARGUMENT,
                message: `At most ${MAX_DELETE_KEYS} keys per call`,
            });
        }
        if (keys.some((key) => !key.trim())) {
            throw new RpcException({
                code: status.INVALID_ARGUMENT,
                message: 'Keys must be non-empty',
            });
        }
        try {
            return await this.r2Service.deleteObjects(keys);
        } catch (error) {
            this.logger.error(`DeleteObjects failed: ${error.message}`);
            throw new RpcException({
                code: status.INTERNAL,
                message: 'DeleteObjects failed',
            });
        }
    }

    // Always a signed GET (never the public URL), so the caller can hand a
    // private object to ai-service without exposing the key permanently.
    @ServiceOnly('document')
    async createPresignedDownload(
        data: r2V1.CreatePresignedDownloadRequest
    ): Promise<r2V1.CreatePresignedDownloadResponse> {
        if (!data.key?.trim()) {
            throw new RpcException({
                code: status.INVALID_ARGUMENT,
                message: 'key must be non-empty',
            });
        }
        const expiresIn = clampPresignSeconds(data.expiresInSeconds);
        try {
            const url = await this.r2Service.getSignedUrl(data.key, expiresIn);
            return { url, expiresAt: String(Date.now() + expiresIn * 1000) };
        } catch (error) {
            this.logger.error(`CreatePresignedDownload failed: ${error.message}`);
            throw new RpcException({
                code: status.INTERNAL,
                message: 'CreatePresignedDownload failed',
            });
        }
    }

    // document-service has no route to the bucket; it asks here what a client really stored under a key.
    @ServiceOnly('document')
    async inspectObject(data: r2V1.InspectObjectRequest): Promise<r2V1.InspectObjectResponse> {
        if (!data.key?.trim()) {
            throw new RpcException({ code: status.INVALID_ARGUMENT, message: 'key must be non-empty' });
        }
        try {
            const object = await this.r2Service.inspectObject(data.key, inspectBytes(data.maxBytes));
            if (!object) return { found: false, size: '0', head: Buffer.alloc(0) };
            return { found: true, size: String(object.size), head: object.head };
        } catch (error) {
            this.logger.error(`InspectObject failed: ${(error as Error).message}`);
            throw new RpcException({ code: status.INTERNAL, message: 'InspectObject failed' });
        }
    }
}
