import { StudyRoomGateway } from './study-room.gateway';
import { StudyRoomService } from './study-room.service';
import { StudyRoomRole } from './study-room.constants';

// A ban takes away every right in the room: the real StudyRoomService.assertRole runs behind the gateway.
describe('StudyRoomGateway with a banned member', () => {
    const banned = { role: StudyRoomRole.COHOST, isBanned: true, isMuted: false };

    function make() {
        const repo = {
            findMemberCached: jest.fn().mockResolvedValue(banned),
            updateLastSeen: jest.fn(),
        };
        const service = new StudyRoomService(repo as never, {} as never, {} as never);
        const state = { allowChat: jest.fn().mockResolvedValue(true), pushChat: jest.fn() };
        const gateway = new StudyRoomGateway(
            {} as never,
            service,
            repo as never,
            state as never,
            { setServer: jest.fn() } as never,
            {} as never
        );
        const emitToRoom = jest.fn();
        (gateway as any).server = { to: jest.fn(() => ({ emit: emitToRoom })) };
        const socket = {
            id: 's1',
            data: { user: { id: 'u1', name: 'Khoa' }, rooms: new Set<string>() },
            join: jest.fn(),
            emit: jest.fn(),
            disconnect: jest.fn(),
        };
        return { gateway, socket, state, emitToRoom };
    }

    it('answers BANNED to a join and drops the socket', async () => {
        const { gateway, socket } = make();
        await gateway.onJoin(socket as never, { roomId: 'r1' });
        expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ code: 'BANNED' }));
        expect(socket.disconnect).toHaveBeenCalledWith(true);
        expect(socket.join).not.toHaveBeenCalled();
    });

    it('drops chat from a banned member who skipped the join', async () => {
        const { gateway, socket, state, emitToRoom } = make();
        await gateway.onChat(socket as never, { roomId: 'r1', content: 'spam' });
        expect(state.pushChat).not.toHaveBeenCalled();
        expect(emitToRoom).not.toHaveBeenCalled();
    });
});
