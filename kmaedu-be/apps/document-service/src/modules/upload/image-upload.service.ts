import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { R2Client } from '../../clients/r2.client';
import { detectImageType } from './file-signature';

@Injectable()
export class ImageUploadService {
    private readonly logger = new Logger(ImageUploadService.name);

    constructor(private readonly r2: R2Client) {}

    /**
     * Stores an image under `images/<userId>` and returns its public URL and key. The type is read from
     * the bytes (PNG, JPEG, WebP, GIF; never SVG) and is the Content-Type R2 serves; the key is a random id.
     */
    async upload(file: Express.Multer.File, userId: string): Promise<{ url: string; keyR2: string }> {
        const detected = detectImageType(file.buffer);
        if (!detected) throw new BadRequestException('Only PNG, JPEG, WebP or GIF images are allowed');
        const keyR2 = await this.r2.uploadFile(`${randomUUID()}.${detected.ext}`, file.buffer, detected.mime, `images/${userId}`);
        const url = this.r2.getPublicUrl(keyR2);
        this.logger.log(`Image uploaded: ${keyR2}`);
        return { url, keyR2 };
    }
}
