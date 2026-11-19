import { Metadata } from '@grpc/grpc-js';
import { ExamRoomService } from './examroom.service';

const HOST = 'host-1';
const user = { id: HOST } as never;
const md = new Metadata();
const d = (iso: string) => new Date(iso);

function build(rooms: any[], participants: { examRoomId: string; participants: number }[]) {
    const prisma = {
        examRoom: { findMany: jest.fn(async () => rooms) },
        $queryRaw: jest.fn(async () => participants),
    };
    const titles = { withQuizSets: jest.fn(async (r: unknown[]) => r) };
    const service = new ExamRoomService(
        prisma as never,
        {} as never,
        {} as never,
        titles as never,
        {} as never,
        {} as never,
        {} as never
    );
    return { service, prisma, titles };
}

const room = (id: string, examSessions: { startTime: Date; endTime: Date | null }[]) => ({
    id,
    hostId: HOST,
    title: id,
    _count: { examSessions: examSessions.length },
    examSessions,
});

describe('ExamRoomService.getAllExamRooms insights', () => {
    it('adds sessionWindows (as given, ascending) and participantCount, and no raw sessions', async () => {
        const windows = [
            { startTime: d('2026-11-01T08:00:00Z'), endTime: d('2026-11-01T09:00:00Z') },
            { startTime: d('2026-11-02T08:00:00Z'), endTime: null },
        ];
        const { service } = build([room('r1', windows), room('r2', [])], [{ examRoomId: 'r1', participants: 7 }]);
        const { examRooms } = (await service.getAllExamRooms(user, md)) as unknown as {
            examRooms: Record<string, unknown>[];
        };
        expect(examRooms[0]).toMatchObject({ id: 'r1', participantCount: 7, sessionWindows: windows });
        expect(examRooms[0]).not.toHaveProperty('examSessions');
        expect(examRooms[0]._count).toEqual({ examSessions: 2 });
        // a room nobody attempted, and a room with no session at all
        expect(examRooms[1]).toMatchObject({ id: 'r2', participantCount: 0, sessionWindows: [] });
    });

    it('asks for the windows ordered by start time inside the one room query', async () => {
        const { service, prisma } = build([], []);
        await service.getAllExamRooms(user, md);
        const arg = (prisma.examRoom.findMany.mock.calls as unknown as any[][])[0][0];
        expect(arg.where).toEqual({ hostId: HOST });
        expect(arg.include.examSessions).toEqual({
            select: { startTime: true, endTime: true },
            orderBy: { startTime: 'asc' },
        });
    });

    it('counts participants with one aggregate query, however many rooms', async () => {
        const rooms = Array.from({ length: 25 }, (_, i) => room(`r${i}`, []));
        const { service, prisma } = build(rooms, []);
        await service.getAllExamRooms(user, md);
        expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
        expect(prisma.examRoom.findMany).toHaveBeenCalledTimes(1);
    });

    it('participant counts that come back as bigint or string still become numbers', async () => {
        const { service } = build(
            [room('r1', [])],
            [{ examRoomId: 'r1', participants: 3n as unknown as number }]
        );
        const { examRooms } = (await service.getAllExamRooms(user, md)) as unknown as {
            examRooms: { participantCount: number }[];
        };
        expect(examRooms[0].participantCount).toBe(3);
    });
});
