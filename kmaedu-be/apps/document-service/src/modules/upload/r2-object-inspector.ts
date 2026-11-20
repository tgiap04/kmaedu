import { Injectable } from '@nestjs/common';
import { R2Client } from '../../clients/r2.client';

/** Enough leading bytes for the magic-number checks of `file-signature`. */
const HEAD_BYTES = 64 * 1024;

export interface InspectedObject {
    /** Real size of the stored object in bytes. */
    size: number;
    /** Up to `HEAD_BYTES` leading bytes. */
    head: Buffer;
}

/**
 * What is really stored under a key: its size and first bytes, asked of r2-service (`InspectObject`).
 * document-service sits on the internal network only, so it never fetches the bucket itself. Used where
 * the client names an object it claims to have stored, so size and type come from the object, never
 * from the request.
 */
@Injectable()
export class R2ObjectInspector {
    constructor(private readonly r2: R2Client) {}

    /** `null` when the object does not exist; throws when the storage cannot be asked. */
    async inspect(keyR2: string): Promise<InspectedObject | null> {
        return this.r2.inspectObject(keyR2, HEAD_BYTES);
    }
}
