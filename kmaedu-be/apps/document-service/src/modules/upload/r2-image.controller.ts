import {
    BadRequestException,
    Controller,
    Post,
    Req,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedRequest } from '@kmaedu/common';
import { RequirePermissions } from '@kmaedu/auth-jwt';
import { MAX_IMAGE_BYTES, multerFileLimit } from '../../config/document.constants';
import { ImageUploadService } from './image-upload.service';

/** `POST /r2/image`, moved from the old exam service: a public image (max 2 MB) under `images/<userId>/`. */
@ApiTags('R2')
@Controller('r2')
export class R2ImageController {
    constructor(private readonly images: ImageUploadService) {}

    @Post('image')
    @RequirePermissions('document:upload')
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: multerFileLimit(MAX_IMAGE_BYTES) } }))
    @ApiCookieAuth('cookie-auth')
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload image to R2 storage' })
    async uploadImage(@Req() req: AuthenticatedRequest, @UploadedFile() file: Express.Multer.File) {
        if (!file || !file.buffer) throw new BadRequestException('No file uploaded');
        const { url } = await this.images.upload(file, req.user.id);
        return { url };
    }
}
