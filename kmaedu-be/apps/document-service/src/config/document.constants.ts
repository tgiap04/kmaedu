/** Document-service tunables (code constants, not env). */

/** `UserStorage.processingStatus` values. */
export const DocumentStatus = {
    UPLOADING: 'UPLOADING',
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
} as const;
export type DocumentStatusValue = (typeof DocumentStatus)[keyof typeof DocumentStatus];

/** R2 areas of server-issued uploads; every key is `<area>/<ownerUserId>/<random>-<name>`. */
export const AI_UPLOAD_AREAS = ['ai-uploads', 'ai-teacher'] as const;

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_QUICK_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** Validity of the `downloadUrl` handed to ai-service. */
export const DOWNLOAD_URL_TTL_SECONDS = 3600;

/** A PENDING row whose `document.uploaded` is older than this may be re-emitted by EnsureProcessed. */
export const REQUEUE_AFTER_MS = 15 * 60 * 1000;

/**
 * Upload worker (CreateUpload stages the bytes, the worker role stores them in R2).
 * The claim lease must outlast the longest attempt (upload deadline + presign) or a second worker
 * re-claims a row that is still in flight.
 */
export const UPLOAD_DEADLINE_MS = 5 * 60 * 1000;
export const UPLOAD_LEASE_SECONDS = 7 * 60;
export const UPLOAD_MAX_ATTEMPTS = 6;
/** Wait before attempt n+1 after attempt n failed (seconds); the last attempt has no successor. */
export const UPLOAD_BACKOFF_SECONDS = [30, 60, 120, 300, 600] as const;
export const UPLOAD_POLL_MS = 2000;
/** Parallel upload loops per worker process (claims are SKIP LOCKED, so loops never share a row). */
export const UPLOAD_CONCURRENCY = 3;
/** `document.upload_failed.reason` when the object could not be stored in R2. */
export const UPLOAD_FAILED_STORAGE_UNAVAILABLE = 'STORAGE_UNAVAILABLE';

/** ListDocuments paging (the old `recent-uploads` defaults: page 1, size 10, size at most 100). */
export const DEFAULT_LIST_SIZE = 10;
export const MAX_LIST_SIZE = 100;

export const MAX_DELETE_IDS = 1000;
export const MAX_QUERY_IDS = 1000;
