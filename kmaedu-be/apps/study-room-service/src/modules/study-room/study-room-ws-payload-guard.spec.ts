import {
    WS_GLOBAL_LIMIT,
    createPacketGuard,
    validateClientPayload,
} from './study-room-ws-payload-guard';
import { ClientEvents } from './study-room.events';

const ok = (event: string, payload: unknown) => validateClientPayload(event, payload);

describe('validateClientPayload', () => {
    it('accepts the payloads the frontend sends', () => {
        expect(ok(ClientEvents.JOIN, { roomId: 'ckx1abc' })).toBe(true);
        expect(ok(ClientEvents.LEAVE, { roomId: '5f3a9c0d1e2b3c4d5e6f7a8b' })).toBe(true);
        expect(ok(ClientEvents.HEARTBEAT, { roomId: 'r1', status: 'studying' })).toBe(true);
        expect(ok(ClientEvents.TIMER_CONFIG, { roomId: 'r1', workMinutes: 25, breakMinutes: 5 })).toBe(true);
        expect(ok(ClientEvents.MEDIA_SET, { roomId: 'r1', url: 'https://youtu.be/dQw4w9WgXcQ' })).toBe(true);
        expect(ok(ClientEvents.MEDIA_SEEK, { roomId: 'r1', positionSec: 12.5 })).toBe(true);
        expect(ok(ClientEvents.CHAT_SEND, { roomId: 'r1', content: 'xin chào' })).toBe(true);
        expect(ok(ClientEvents.ROLE_GRANT, { roomId: 'r1', userId: 'user_1-a' })).toBe(true);
        expect(ok(ClientEvents.PLAYLIST_REMOVE, { roomId: 'r1', itemId: 'it1' })).toBe(true);
        expect(ok(ClientEvents.PLAYLIST_REORDER, { roomId: 'r1', itemIds: ['a', 'b'] })).toBe(true);
        expect(ok(ClientEvents.PLAYLIST_JUMP, { roomId: 'r1', index: 3 })).toBe(true);
        expect(ok(ClientEvents.MEDIA_ENDED, { roomId: 'r1', index: 0 })).toBe(true);
        expect(ok(ClientEvents.TIMER_START, { roomId: 'r1' })).toBe(true);
    });

    it('rejects a payload that is not a plain object', () => {
        for (const p of [undefined, null, 'r1', 5, ['r1']]) {
            expect(ok(ClientEvents.JOIN, p)).toBe(false);
        }
    });

    it('rejects a roomId that is missing, not a string, too long or has odd characters', () => {
        for (const roomId of [undefined, 5, { contains: '' }, ['a'], '', 'a'.repeat(65), 'a b', 'a:b', '../x']) {
            expect(ok(ClientEvents.JOIN, { roomId })).toBe(false);
        }
        expect(ok(ClientEvents.JOIN, { roomId: 'a'.repeat(900_000) })).toBe(false);
    });

    it('rejects a userId that is an object or oversized (Prisma operator injection)', () => {
        for (const event of [
            ClientEvents.CHAT_BLOCK,
            ClientEvents.CHAT_UNBLOCK,
            ClientEvents.MEMBER_BAN,
            ClientEvents.MEMBER_UNBAN,
            ClientEvents.MEMBER_MUTE,
            ClientEvents.MEMBER_UNMUTE,
            ClientEvents.ROLE_GRANT,
            ClientEvents.ROLE_REVOKE,
        ]) {
            expect(ok(event, { roomId: 'r1', userId: { contains: '' } })).toBe(false);
            expect(ok(event, { roomId: 'r1', userId: 'u'.repeat(65) })).toBe(false);
            expect(ok(event, { roomId: 'r1' })).toBe(false);
        }
    });

    it('rejects itemId / itemIds that are objects, oversized or too many', () => {
        expect(ok(ClientEvents.PLAYLIST_REMOVE, { roomId: 'r1', itemId: { contains: '' } })).toBe(false);
        expect(ok(ClientEvents.PLAYLIST_REORDER, { roomId: 'r1', itemIds: [{ not: '' }] })).toBe(false);
        expect(ok(ClientEvents.PLAYLIST_REORDER, { roomId: 'r1', itemIds: 'abc' })).toBe(false);
        expect(ok(ClientEvents.PLAYLIST_REORDER, { roomId: 'r1', itemIds: Array(101).fill('a') })).toBe(false);
    });

    it('bounds the string fields', () => {
        expect(ok(ClientEvents.CHAT_SEND, { roomId: 'r1', content: 'x'.repeat(2001) })).toBe(false);
        expect(ok(ClientEvents.CHAT_SEND, { roomId: 'r1', content: { a: 1 } })).toBe(false);
        expect(ok(ClientEvents.MEDIA_SET, { roomId: 'r1', url: 'h'.repeat(501) })).toBe(false);
        expect(ok(ClientEvents.PLAYLIST_ADD, { roomId: 'r1', url: 7 })).toBe(false);
        expect(ok(ClientEvents.HEARTBEAT, { roomId: 'r1', status: 'x'.repeat(40) })).toBe(false);
    });

    it('requires finite numbers where numbers are read', () => {
        expect(ok(ClientEvents.MEDIA_SEEK, { roomId: 'r1', positionSec: '5' })).toBe(false);
        expect(ok(ClientEvents.MEDIA_SEEK, { roomId: 'r1', positionSec: Infinity })).toBe(false);
        expect(ok(ClientEvents.PLAYLIST_JUMP, { roomId: 'r1', index: {} })).toBe(false);
        expect(ok(ClientEvents.TIMER_CONFIG, { roomId: 'r1', workMinutes: { gt: 0 } })).toBe(false);
    });

    it('rejects an event it does not know', () => {
        expect(ok('admin:everything', { roomId: 'r1' })).toBe(false);
    });
});

describe('createPacketGuard (per-socket)', () => {
    let clock: number;
    let rejected: Array<[string, string]>;
    let guard: ReturnType<typeof createPacketGuard>;
    const send = (event: string, payload: unknown = { roomId: 'r1' }) => {
        let passed = false;
        guard([event, payload], () => {
            passed = true;
        });
        return passed;
    };

    beforeEach(() => {
        clock = 1_000_000;
        rejected = [];
        guard = createPacketGuard(
            (event, reason) => rejected.push([event, reason]),
            () => clock
        );
    });

    it('passes a valid packet', () => {
        expect(send(ClientEvents.TIMER_START)).toBe(true);
        expect(rejected).toEqual([]);
    });

    it('drops an invalid packet without calling next and reports it', () => {
        expect(send(ClientEvents.JOIN, { roomId: 'a'.repeat(900_000) })).toBe(false);
        expect(rejected).toEqual([[ClientEvents.JOIN, 'VALIDATION']]);
    });

    it('throttles heartbeats per socket', () => {
        expect(send(ClientEvents.HEARTBEAT, { roomId: 'r1', status: 'studying' })).toBe(true);
        expect(send(ClientEvents.HEARTBEAT, { roomId: 'r1', status: 'studying' })).toBe(false);
        expect(rejected.at(-1)).toEqual([ClientEvents.HEARTBEAT, 'RATE_LIMITED']);
        clock += 30_000;
        expect(send(ClientEvents.HEARTBEAT, { roomId: 'r1', status: 'studying' })).toBe(true);
    });

    it('throttles playlist:add and chat:block more tightly than the global window', () => {
        const add = { roomId: 'r1', url: 'https://youtu.be/dQw4w9WgXcQ' };
        expect(send(ClientEvents.PLAYLIST_ADD, add)).toBe(true);
        expect(send(ClientEvents.PLAYLIST_ADD, add)).toBe(false);
        const block = { roomId: 'r1', userId: 'u2' };
        expect(send(ClientEvents.CHAT_BLOCK, block)).toBe(true);
        expect(send(ClientEvents.CHAT_BLOCK, block)).toBe(false);
    });

    it('applies a global window per socket across events, then recovers', () => {
        let passed = 0;
        for (let i = 0; i < WS_GLOBAL_LIMIT + 20; i++) {
            if (send(ClientEvents.MEDIA_PLAY)) passed++;
            clock += 1; // distinct instants, still the same window
        }
        expect(passed).toBe(WS_GLOBAL_LIMIT);
        clock += 11_000;
        expect(send(ClientEvents.MEDIA_PLAY)).toBe(true);
    });

    it('keeps separate state per socket', () => {
        const other = createPacketGuard(() => undefined, () => clock);
        const hb = { roomId: 'r1', status: 'studying' };
        expect(send(ClientEvents.HEARTBEAT, hb)).toBe(true);
        let passed = false;
        other([ClientEvents.HEARTBEAT, hb], () => {
            passed = true;
        });
        expect(passed).toBe(true);
    });
});
