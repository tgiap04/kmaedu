import {
    Controller,
    Req,
    Get,
    Put,
    Body,
} from '@nestjs/common';
import {
    ApiTags,
    ApiResponse,
    ApiOperation,
    ApiCookieAuth,
} from '@nestjs/swagger';
import { Authenticated } from '@kmaedu/auth-jwt';
import { ProfileService } from './profile.service';
import { AuthenticatedRequest } from '../dto/request-with-auth.dto';
import { UpdateProfileDto, ProfileResponseDto } from './dto/profile.dto';

@ApiTags('Profile')
@Controller('profile')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) {}

    @Get()
    @Authenticated()
    @ApiCookieAuth('cookie-auth')
    @ApiOperation({ summary: 'Lấy thông tin hồ sơ người dùng' })
    @ApiResponse({
        status: 200,
        description: 'Thông tin hồ sơ',
        type: ProfileResponseDto,
    })
    async getProfile(@Req() req: AuthenticatedRequest) {
        return this.profileService.getProfile(req.user);
    }

    @Put()
    @Authenticated()
    @ApiCookieAuth('cookie-auth')
    @ApiOperation({ summary: 'Cập nhật hồ sơ người dùng' })
    @ApiResponse({
        status: 200,
        description: 'Hồ sơ đã được cập nhật',
        type: ProfileResponseDto,
    })
    async updateProfile(
        @Req() req: AuthenticatedRequest,
        @Body() dto: UpdateProfileDto
    ) {
        return this.profileService.updateProfile(req.user, dto);
    }
}
