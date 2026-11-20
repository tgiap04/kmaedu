import { Metadata } from '@grpc/grpc-js';
import { ExamSessionService } from './examsession.service';
import { CreateExamSessionSchema } from './dto/create-examsession.dto';
import { UpdateExamSessionDtoSchema } from './dto/update-examsession.dto';
import { buildSnapshot } from '../snapshot/snapshot.fixture';

// The three attempt rules of a session: durationMinutes, antiCheatEnabled, allowLeaveMidway.

const HOST = 'host-1';
const user = { id: HOST } as never;
const base = { examRoomId: 'room-1', startTime: '2026-11-20T10:00:00.000Z' };

describe('session DTOs: attempt rules', () => {
    it('create defaults to no duration, anti-cheat on, leaving allowed', () => {
        expect(CreateExamSessionSchema.parse(base)).toMatchObject({
            durationMinutes: null,
            antiCheatEnabled: true,
            allowLeaveMidway: true,
        });
    });

    it('accepts a duration of 1..1440 minutes or null, nothing else', () => {
        for (const schema of [CreateExamSessionSchema, UpdateExamSessionDtoSchema]) {
            for (const ok of [1, 90, 1440, null]) {
                expect(schema.safeParse({ ...base, durationMinutes: ok }).success).toBe(true);
            }
            for (const bad of [0, 1441, 2.5, -1, '30']) {
                expect(schema.safeParse({ ...base, durationMinutes: bad }).success).toBe(false);
            }
        }
    });

    it('update leaves every rule out unless sent (no defaults)', () => {
        const parsed = UpdateExamSessionDtoSchema.parse({});
        expect(parsed).not.toHaveProperty('durationMinutes');
        expect(parsed).not.toHaveProperty('antiCheatEnabled');
        expect(parsed).not.toHaveProperty('allowLeaveMidway');
        expect(
            UpdateExamSessionDtoSchema.parse({ antiCheatEnabled: false, allowLeaveMidway: false })
        ).toMatchObject({ antiCheatEnabled: false, allowLeaveMidway: false });
    });
});

function build() {
    const row = { id: 'new', examRoomId: 'room-1', examRoom: { hostId: HOST, quizSetId: 'qs1', quizSetTitle: 'T' } };
    const sessionRepo = {
        create: jest.fn(async (data: unknown) => ({ ...row, ...(data as object) })),
        update: jest.fn(async () => row),
        findOne: jest.fn(async () => ({ ...row, quizSnapshotHash: 'hash-1', accessCode: null })),
    };
    const roomRepo = {
        findOne: jest.fn(async () => ({ id: 'room-1', hostId: HOST, quizSetId: 'qs1', sourceDeleted: false })),
        invalidateItemCache: jest.fn(async () => undefined),
        invalidateUserListCache: jest.fn(async () => undefined),
    };
    const service = new ExamSessionService(
        {} as never,
        sessionRepo as never,
        roomRepo as never,
        { generateId: () => 'new' } as never,
        {} as never,
        { withRoomHost: async <T>(s: T) => s } as never,
        { take: async () => buildSnapshot() } as never,
        {} as never,
        {} as never,
        {} as never
    );
    return { service, sessionRepo };
}

describe('ExamSessionService: attempt rules are stored', () => {
    it('create stores the parsed defaults', async () => {
        const { service, sessionRepo } = build();
        await service.createExamSession(user, CreateExamSessionSchema.parse(base) as never, new Metadata());
        expect(sessionRepo.create.mock.calls[0][0]).toMatchObject({
            durationMinutes: null,
            antiCheatEnabled: true,
            allowLeaveMidway: true,
        });
    });

    it('create stores the values sent', async () => {
        const { service, sessionRepo } = build();
        const dto = CreateExamSessionSchema.parse({
            ...base,
            durationMinutes: 45,
            antiCheatEnabled: false,
            allowLeaveMidway: false,
        });
        await service.createExamSession(user, dto as never, new Metadata());
        expect(sessionRepo.create.mock.calls[0][0]).toMatchObject({
            durationMinutes: 45,
            antiCheatEnabled: false,
            allowLeaveMidway: false,
        });
    });

    it('update writes the rules sent, including clearing the duration', async () => {
        const { service, sessionRepo } = build();
        await service.updateExamSession('new', user, {
            durationMinutes: null,
            antiCheatEnabled: false,
            allowLeaveMidway: true,
        } as never);
        expect(sessionRepo.update).toHaveBeenCalledWith(
            'new',
            { durationMinutes: null, antiCheatEnabled: false, allowLeaveMidway: true },
            HOST
        );
    });

    it('update does not touch rules that were not sent', async () => {
        const { service, sessionRepo } = build();
        await service.updateExamSession('new', user, { passingScore: 50 } as never);
        expect(sessionRepo.update).toHaveBeenCalledWith('new', { passingScore: 50 }, HOST);
    });
});
