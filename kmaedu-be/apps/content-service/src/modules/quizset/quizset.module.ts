import { Module, forwardRef } from '@nestjs/common';
import { MessagingModule } from '@kmaedu/messaging';
import { QuizsetService } from './quizset.service';
import { QuizsetController } from './quizset.controller';
import { PrismaService } from '../../prisma';
import { GenerateIdService } from '@kmaedu/common';
import { RedisService } from '@kmaedu/redis';
import { CONTENT_MESSAGING } from '../../messaging/content-messaging';
import { QuizSetRepository } from './quizset.repository';
import { QuizsetSharingController } from './quizset-sharing.controller';
import { QuizsetSharingService } from './quizset-sharing.service';
import { QuizSetOwnerResolver } from './quizset-owner.resolver';
import { QuizSetSnapshotService } from './quiz-set-snapshot.service';
import { UserSearchService } from '../common/user-search.service';

@Module({
    imports: [MessagingModule.forRoot(CONTENT_MESSAGING)],
    providers: [
        PrismaService,
        RedisService,
        QuizsetService,
        GenerateIdService,
        QuizSetRepository,
        QuizsetSharingService,
        QuizSetOwnerResolver,
        QuizSetSnapshotService,
        UserSearchService,
    ],
    controllers: [QuizsetController, QuizsetSharingController],
    exports: [QuizsetService, QuizSetRepository, QuizSetOwnerResolver, QuizSetSnapshotService],
})
export class QuizsetModule {}
