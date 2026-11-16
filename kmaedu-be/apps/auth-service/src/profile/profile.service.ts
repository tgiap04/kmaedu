import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '../prisma';
import { UserRepository } from '../repositories/user.repository';
import { UserProfilePatch, UserUpdateWriter } from '../users-admin/user-update.writer';
import { UpdateProfileDto, ProfileResponseDto } from './dto/profile.dto';

@Injectable()
export class ProfileService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly userUpdates: UserUpdateWriter
    ) {}

    /**
     * Get user profile - O(1) with cache
     */
    async getProfile(user: { id: string }): Promise<ProfileResponseDto> {
        const userData = await this.userRepository.findByIdWithRelations(
            user.id,
            [],
            true
        );

        if (!userData) {
            throw new NotFoundException('Không tìm thấy người dùng');
        }

        return this.sanitizeProfile(userData);
    }

    /**
     * Update user profile - invalidates cache
     */
    async updateProfile(
        user: { id: string },
        dto: UpdateProfileDto
    ): Promise<ProfileResponseDto> {
        const updateData: UserProfilePatch = {};

        if (dto.name !== undefined) {
            updateData.name = dto.name;
        }
        if (dto.bio !== undefined) {
            updateData.bio = dto.bio;
        }

        const result = await this.userUpdates.update(
            user.id,
            updateData,
            user.id
        );
        if (!result) throw new NotFoundException('Không tìm thấy người dùng');

        return this.sanitizeProfile(result.user);
    }

    /**
     * Remove sensitive fields from user data
     */
    private sanitizeProfile(user: User): ProfileResponseDto {
        return {
            id: user.id,
            email: user.email,
            username: user.username,
            name: user.name,
            bio: user.bio,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
}
