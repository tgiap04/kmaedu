import { Module } from '@nestjs/common';
import { FlashcardsetService } from './flashcardset.service';
import { FlashcardsetController } from './flashcardset.controller';
import { PrismaService } from '../../prisma';
import { GenerateIdService } from '@kmaedu/common';
import { GrpcClientModule } from '@kmaedu/grpc';
import { RedisService } from '@kmaedu/redis';
import { FlashCardSetRepository } from './flashcardset.repository';
import { FlashcardSetOwnerResolver } from './flashcardset-owner.resolver';
import { UserSearchService } from '../common/user-search.service';
import { VOCABULARY_GRPC_REGISTRATION, VocabularyClient } from '../../clients/vocabulary.client';
import { WordFamilyToFlashcardController } from './word-family-to-flashcard.controller';
import { WordFamilyToFlashcardService } from './word-family-to-flashcard.service';

@Module({
    imports: [
        GrpcClientModule.register(VOCABULARY_GRPC_REGISTRATION),
    ],
    providers: [
        PrismaService,
        RedisService,
        FlashcardsetService,
        GenerateIdService,
        FlashCardSetRepository,
        FlashcardSetOwnerResolver,
        UserSearchService,
        VocabularyClient,
        WordFamilyToFlashcardService,
    ],
    controllers: [FlashcardsetController, WordFamilyToFlashcardController],
    exports: [FlashcardsetService, FlashCardSetRepository],
})
export class FlashcardSetModule {}
