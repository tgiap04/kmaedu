import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';
import { INVITE_CODE_PATTERN } from '../study-room.constants';

// Cấu hình Pomodoro dùng chung cho create/update.
const PomodoroConfigSchema = {
    workMinutes: z.number().int().min(1).max(180).optional(),
    breakMinutes: z.number().int().min(1).max(60).optional(),
    longBreakMinutes: z.number().int().min(1).max(60).optional(),
    cyclesBeforeLongBreak: z.number().int().min(1).max(12).optional(),
    maxParticipants: z.number().int().min(2).max(20).optional(),
};

// Cấu hình access + playlist (dùng cho create/update).
const AccessConfigSchema = {
    accessType: z.number().int().min(0).max(2).optional(), // 0 public | 1 code | 2 whitelist
    whitelist: z.array(z.string().min(1)).max(200).optional(),
    playlistAddPermission: z.number().int().min(0).max(2).optional(),
};

export const CreateStudyRoomSchema = z.object({
    name: z.string().min(1, { message: 'Tên phòng không được để trống' }).max(100),
    description: z.string().max(500).optional(),
    ...PomodoroConfigSchema,
    ...AccessConfigSchema,
});

export class CreateStudyRoomDto extends createZodDto(CreateStudyRoomSchema) {
    @ApiProperty({ example: 'Phòng ôn thi cuối kỳ' })
    name: string;

    @ApiProperty({ required: false })
    description?: string;
}

export const UpdateStudyRoomSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    isActive: z.boolean().optional(),
    ...PomodoroConfigSchema,
    ...AccessConfigSchema,
});

export class UpdateStudyRoomDto extends createZodDto(UpdateStudyRoomSchema) {}

// Spaces and dashes are dropped and letters upper-cased, so a code read aloud or copied as `k7m2-q9xa` works.
const InviteCodeSchema = z
    .string()
    .transform((value) => value.replace(/[\s-]/g, '').toUpperCase())
    .pipe(z.string().regex(INVITE_CODE_PATTERN, { message: 'Mã mời gồm 8 ký tự chữ và số' }));

export const JoinByCodeSchema = z.object({
    inviteCode: InviteCodeSchema,
});

export class JoinByCodeDto extends createZodDto(JoinByCodeSchema) {
    @ApiProperty({ example: 'K7M2Q9XA' })
    inviteCode: string;
}

// Join bằng roomId (public/whitelist không cần mã; code thì kèm inviteCode).
export const JoinRoomSchema = z.object({
    inviteCode: InviteCodeSchema.optional(),
});

export class JoinRoomDto extends createZodDto(JoinRoomSchema) {
    @ApiProperty({ required: false, example: 'K7M2Q9XA' })
    inviteCode?: string;
}
