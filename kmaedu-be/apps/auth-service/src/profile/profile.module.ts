import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { PrismaService } from '../prisma';
import { UserRepository } from '../repositories/user.repository';
import { RedisService } from '@kmaedu/redis';
import { UserUpdateModule } from '../users-admin/user-update.module';

@Module({
    imports: [UserUpdateModule],
    controllers: [ProfileController],
    providers: [
        ProfileService,
        PrismaService,
        UserRepository,
        RedisService,
    ],
    exports: [ProfileService],
})
export class ProfileModule {}
