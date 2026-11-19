import { Module } from '@nestjs/common';
import { ExamSessionService } from './examsession.service';
import { ExamSessionController } from './examsession.controller';
import { PrismaService } from '../../prisma';
import { GenerateIdService } from '@kmaedu/common';
import { RedisService } from '@kmaedu/redis';
import { ExamSessionRepository } from './examsession.repository';
import { ExamRoomRepository } from '../examroom/examroom.repository';
import { ExamAttemptRepository } from '../examattempt/examattempt.repository';
import { UserSearchService } from '../common/user-search.service';

@Module({
    imports: [],
    providers: [
        PrismaService,
        RedisService,
        ExamSessionService,
        GenerateIdService,
        ExamSessionRepository,
        ExamRoomRepository,
        ExamAttemptRepository,
        UserSearchService,
    ],
    controllers: [ExamSessionController],
    exports: [ExamSessionService, ExamSessionRepository],
})
export class ExamSessionModule {}
