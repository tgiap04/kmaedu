import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { MessagingModule } from '@kmaedu/messaging';
import { RedisService } from '@kmaedu/redis';
import { UserRepository } from '../repositories/user.repository';
import { UserUpdateWriter } from './user-update.writer';
import { UserUpdatedPublisher } from './user-updated.publisher';

@Module({
    imports: [MessagingModule.forRoot({ service: 'auth' })],
    providers: [
        PrismaService,
        RedisService,
        UserRepository,
        UserUpdatedPublisher,
        UserUpdateWriter,
    ],
    exports: [UserUpdateWriter],
})
export class UserUpdateModule {}
