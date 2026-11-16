import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

// ================== SCHEMAS ==================

export const UpdateProfileSchema = z.object({
    name: z.string().max(100).optional(),
    bio: z.string().max(500).optional(),
});

// ================== REQUEST DTOs ==================

export class UpdateProfileDto extends createZodDto(UpdateProfileSchema) {
    @ApiProperty({ description: 'Tên hiển thị', required: false })
    name?: string;

    @ApiProperty({ description: 'Giới thiệu bản thân', required: false })
    bio?: string;
}

// ================== RESPONSE DTOs ==================

export class ProfileResponseDto {
    @ApiProperty({ description: 'ID người dùng' })
    id: string;

    @ApiProperty({ description: 'Email' })
    email: string;

    @ApiProperty({ description: 'Tên đăng nhập' })
    username: string;

    @ApiProperty({ description: 'Tên hiển thị' })
    name: string | null;

    @ApiProperty({ description: 'Giới thiệu bản thân' })
    bio: string | null;

    @ApiProperty({ description: 'Đã xác thực email' })
    isVerified: boolean;

    @ApiProperty({ description: 'Ngày tạo tài khoản' })
    createdAt: Date;

    @ApiProperty({ description: 'Ngày cập nhật gần nhất' })
    updatedAt: Date;
}
