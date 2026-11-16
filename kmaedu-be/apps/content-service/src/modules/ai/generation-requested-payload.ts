import type { GenerationType } from './generation.constants';

export interface GenerationRequestOptions {
    numItems: number;
    isNarrowSearch: boolean;
    keyword?: string;
}

export interface GenerationRequestedInput {
    jobId: string;
    userId: string;
    storageId: string;
    type: GenerationType | string;
    options: GenerationRequestOptions;
    /** Model id from the registry; empty = ai-service default. */
    model?: string | null;
    /** Presigned GET + mimetype of the document; absent = ai-service waits for the OCR instead. */
    download?: { url: string; mimetype: string };
}

/**
 * The `content.generation.requested` payload (`kmaedu.events.v1.ContentGenerationRequested`). The ONE
 * builder behind both ways a job reaches ai-service: `submit` (document already stored) and the
 * `document.uploaded` promotion of a WAITING_UPLOAD job, so the two payloads can never drift apart.
 */
export function buildGenerationRequested(input: GenerationRequestedInput) {
    const { options, download } = input;
    return {
        jobId: input.jobId,
        userId: input.userId,
        storageId: input.storageId,
        type: input.type,
        options: {
            numItems: options.numItems,
            isNarrowSearch: options.isNarrowSearch,
            ...(options.keyword ? { keyword: options.keyword } : {}),
        },
        model: input.model ?? '',
        ...(download ? { downloadUrl: download.url, mimetype: download.mimetype } : {}),
    };
}
