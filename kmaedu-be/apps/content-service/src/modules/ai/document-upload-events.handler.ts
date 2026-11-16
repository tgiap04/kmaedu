import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Envelope, EventHandler, PermanentEventError } from '@kmaedu/messaging';
import { GenerationJobService } from './generation-job.service';

/** `kmaedu.events.v1.DocumentUploaded`; `mimetype` is optional here: without it the job goes out with no download. */
const uploadedSchema = z.object({
    storageId: z.string().min(1),
    userId: z.string().min(1),
    downloadUrl: z.string().min(1),
    mimetype: z.string().min(1).optional(),
});

/** `kmaedu.events.v1.DocumentUploadFailed`. */
const uploadFailedSchema = z.object({ storageId: z.string().min(1), userId: z.string().min(1) });

function parse<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, envelope: Envelope): T {
    const parsed = schema.safeParse(envelope.data);
    if (!parsed.success) throw new PermanentEventError('INVALID_DATA', `${envelope.type} payload is invalid`);
    return parsed.data;
}

/**
 * Consumers of `content.events` for the upload of a document a generation job waits for. No dedupe tx:
 * the conditional WAITING_UPLOAD transition in `GenerationJobService` is the idempotency (a replayed
 * delivery finds the job QUEUED / FAILED and writes nothing), like the `ai.generation.*` consumers.
 */
@Injectable()
export class DocumentUploadEventsHandler {
    constructor(private readonly generation: GenerationJobService) {}

    /** The document is stored: every job waiting for it is queued with the `downloadUrl` of the event. */
    @EventHandler('document.uploaded', { dedupe: false })
    async onUploaded(envelope: Envelope): Promise<void> {
        const { storageId, userId, downloadUrl, mimetype } = parse(uploadedSchema, envelope);
        await this.generation.startWaitingForUpload(userId, storageId, mimetype ? { url: downloadUrl, mimetype } : undefined);
    }

    /** The upload gave up: the jobs waiting for it fail with UPLOAD_FAILED. */
    @EventHandler('document.upload_failed', { dedupe: false })
    async onUploadFailed(envelope: Envelope): Promise<void> {
        const { storageId, userId } = parse(uploadFailedSchema, envelope);
        await this.generation.failWaitingForUpload(userId, storageId);
    }
}
