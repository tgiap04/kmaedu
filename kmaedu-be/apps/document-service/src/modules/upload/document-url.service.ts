import { Injectable, Logger } from '@nestjs/common';
import { R2Client } from '../../clients/r2.client';
import { DOWNLOAD_URL_TTL_SECONDS } from '../../config/document.constants';

/**
 * What a document's `url` means to a client. The R2 bucket is public, so a user's document must not
 * carry a permanent URL: `url` is a presigned GET minted on every read (valid `DOWNLOAD_URL_TTL_SECONDS`),
 * whatever was stored in the column (rows created before this change hold a public URL, which is
 * never returned).
 */
@Injectable()
export class DocumentUrlService {
    private readonly logger = new Logger(DocumentUrlService.name);

    constructor(private readonly r2: R2Client) {}

    /** The rows with `url` replaced; a row that cannot be signed (r2 down) gets `''`, the read still succeeds. */
    withUrls<T extends { keyR2: string; url: string }>(rows: T[]): Promise<T[]> {
        return Promise.all(rows.map(async (row) => ({ ...row, url: await this.sign(row.keyR2) })));
    }

    async withUrl<T extends { keyR2: string; url: string }>(row: T): Promise<T> {
        return (await this.withUrls([row]))[0];
    }

    private async sign(keyR2: string): Promise<string> {
        try {
            return await this.r2.createPresignedDownload(keyR2, DOWNLOAD_URL_TTL_SECONDS);
        } catch (error) {
            this.logger.warn(`Presigned url unavailable for ${keyR2}: ${(error as Error).message}`);
            return '';
        }
    }
}
