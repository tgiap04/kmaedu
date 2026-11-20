import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Body of `POST /ai/upload`: an object the client already stored in R2 under its own key. `url`,
 * `mimetype` and `size` are accepted for older clients but ignored: the service reads them from the object.
 */
export const RegisterUploadSchema = z.object({
    filename: z.string().trim().min(1).max(255),
    url: z.string().max(2048).optional(),
    mimetype: z.string().max(255).optional(),
    size: z.number().optional(),
    keyR2: z.string().min(1).max(1024),
});
export class RegisterUploadDto extends createZodDto(RegisterUploadSchema) {}

/** Body of the `POST /ai/upload-image` placeholder (unchanged from the old exam routes). */
export const UploadImageSchema = z.object({
    image: z.string(),
    filename: z.string().optional(),
});
export class UploadImageDto extends createZodDto(UploadImageSchema) {}
