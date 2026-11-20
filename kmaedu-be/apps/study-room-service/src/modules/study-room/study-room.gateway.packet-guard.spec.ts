import { StudyRoomGateway } from './study-room.gateway';

// S-03 / S-07: every inbound packet passes the per-socket guard BEFORE any handler.
describe('StudyRoomGateway packet guard', () => {
    const gateways: StudyRoomGateway[] = [];
    function connect() {
        const session = { user: { id: 'u1' }, av: 1, exp: Math.floor(Date.now() / 1000) + 600 };
        const gateway = new StudyRoomGateway(
            { authenticate: jest.fn().mockResolvedValue(session) } as never,
            {} as never,
            {} as never,
            {} as never,
            { setServer: jest.fn() } as never,
            {} as never
        );
        let middleware!: (s: unknown, next: (e?: Error) => void) => Promise<void>;
        gateway.afterInit({ use: (fn: typeof middleware) => (middleware = fn) } as never);
        let packetMiddleware: ((p: unknown[], next: () => void) => void) | undefined;
        const socket = {
            id: 's1',
            data: {} as Record<string, unknown>,
            emit: jest.fn(),
            use: jest.fn((fn) => {
                packetMiddleware = fn;
            }),
        };
        gateways.push(gateway);
        return {
            gateway,
            socket,
            run: async () => middleware(socket, jest.fn()),
            packet: (event: string, payload: unknown) => {
                const next = jest.fn();
                packetMiddleware!([event, payload], next);
                return next;
            },
        };
    }

    // afterInit starts the focus-sweep interval; stop it so jest can exit.
    afterEach(() => gateways.splice(0).forEach((g) => g.onModuleDestroy()));

    it('registers a packet middleware on every authenticated socket', async () => {
        const { socket, run } = connect();
        await run();
        expect(socket.use).toHaveBeenCalledTimes(1);
    });

    it('lets a valid packet through and drops an invalid one with an error event', async () => {
        const { socket, run, packet } = connect();
        await run();
        expect(packet('room:join', { roomId: 'r1' })).toHaveBeenCalled();
        const dropped = packet('chat:block', { roomId: 'r1', userId: { contains: '' } });
        expect(dropped).not.toHaveBeenCalled();
        expect(socket.emit).toHaveBeenCalledWith(
            'error',
            expect.objectContaining({ code: 'VALIDATION' })
        );
    });
});
