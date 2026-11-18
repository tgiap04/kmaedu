import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

/** Rule for every password a user sets: sign-up, reset and change share it. */
export const NewPasswordSchema = z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .max(100, { message: 'Password must not exceed 100 characters' });

/** The emailed code (6 digits today); the cap only stops oversized bodies. */
const CodeSchema = z.string().min(1, { message: 'Code must not be empty' }).max(16, { message: 'Code is too long' });

// Not .strict(): the handlers read only these fields, so extra keys from older clients are dropped, not refused.
export const ResetPasswordSchema = z.object({
    email: z.string().min(1, { message: 'Email must not be empty' }).max(254, { message: 'Email is too long' }),
    code: CodeSchema,
    newPassword: NewPasswordSchema,
});

export const ChangePasswordSchema = z.object({
    code: CodeSchema,
    // The current password is only compared with the stored hash: an older, shorter (or, set before
    // these endpoints were validated, longer) one must still work.
    currentPassword: z
        .string()
        .min(1, { message: 'Current password must not be empty' })
        .max(200, { message: 'Current password is too long' }),
    newPassword: NewPasswordSchema,
});

export class ResetPasswordDto extends createZodDto(ResetPasswordSchema) {
    @ApiProperty({ example: 'example@gmail.com' })
    email: string;

    @ApiProperty({ description: 'Code sent by email', example: '123456' })
    code: string;

    @ApiProperty({ description: '8–100 characters', example: 'new-password' })
    newPassword: string;
}

export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) {
    @ApiProperty({ description: 'Code sent by email', example: '123456' })
    code: string;

    @ApiProperty({ example: 'old-password' })
    currentPassword: string;

    @ApiProperty({ description: '8–100 characters', example: 'new-password' })
    newPassword: string;
}
