import { ClientEvents } from './study-room.events';
import { MAX_PLAYLIST_ITEMS } from './study-room.constants';

/**
 * Inbound-packet guard for the study-room socket (one instance per socket, run
 * by `socket.use` before any @SubscribeMessage handler):
 *  - every payload is checked against a per-event shape, so ids are short
 *    strings (never objects: they reach Prisma `where` clauses) and no field can
 *    be hundreds of KB (it would become a Redis key / DB parameter);
 *  - per-socket throttles: a global window plus minimum gaps for the events
 *    that cost the most (heartbeat, join, playlist add, block/unblock).
 * A rejected packet is dropped (`next` is not called) and reported to the caller.
 */

export const WS_ID_MAX_LENGTH = 64;
export const WS_URL_MAX_LENGTH = 500;
export const WS_CHAT_MAX_LENGTH = 2000; // sanitizeChat then cuts to 500
const WS_STATUS_MAX_LENGTH = 16;

/** At most this many packets per socket per window. */
export const WS_GLOBAL_LIMIT = 40;
export const WS_GLOBAL_WINDOW_MS = 10_000;

const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

const isId = (v: unknown): v is string =>
    typeof v === 'string' &&
    v.length > 0 &&
    v.length <= WS_ID_MAX_LENGTH &&
    ID_PATTERN.test(v);
const isBoundedString = (max: number) => (v: unknown) =>
    typeof v === 'string' && v.length <= max;
const isFiniteNumber = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const isIdList = (v: unknown) =>
    Array.isArray(v) && v.length <= MAX_PLAYLIST_ITEMS && v.every(isId);

type Check = (v: unknown) => boolean;
interface Shape {
    required?: Record<string, Check>;
    optional?: Record<string, Check>;
}

const ROOM: Shape = { required: { roomId: isId } };
const withRoom = (extra: Shape): Shape => ({
    required: { roomId: isId, ...extra.required },
    optional: extra.optional,
});
const ROOM_USER = withRoom({ required: { userId: isId } });
const ROOM_URL = withRoom({
    required: { url: isBoundedString(WS_URL_MAX_LENGTH) },
});
const ROOM_INDEX = withRoom({ optional: { index: isFiniteNumber } });

const SHAPES: Record<string, Shape> = {
    [ClientEvents.JOIN]: ROOM,
    [ClientEvents.LEAVE]: ROOM,
    [ClientEvents.HEARTBEAT]: withRoom({
        optional: { status: isBoundedString(WS_STATUS_MAX_LENGTH) },
    }),
    [ClientEvents.TIMER_START]: ROOM,
    [ClientEvents.TIMER_PAUSE]: ROOM,
    [ClientEvents.TIMER_RESET]: ROOM,
    [ClientEvents.TIMER_CONFIG]: withRoom({
        optional: {
            workMinutes: isFiniteNumber,
            breakMinutes: isFiniteNumber,
            longBreakMinutes: isFiniteNumber,
            cyclesBeforeLongBreak: isFiniteNumber,
        },
    }),
    [ClientEvents.MEDIA_SET]: ROOM_URL,
    [ClientEvents.MEDIA_PLAY]: ROOM,
    [ClientEvents.MEDIA_PAUSE]: ROOM,
    [ClientEvents.MEDIA_SEEK]: withRoom({
        required: { positionSec: isFiniteNumber },
    }),
    [ClientEvents.CHAT_SEND]: withRoom({
        required: { content: isBoundedString(WS_CHAT_MAX_LENGTH) },
    }),
    [ClientEvents.ROLE_GRANT]: ROOM_USER,
    [ClientEvents.ROLE_REVOKE]: ROOM_USER,
    [ClientEvents.PLAYLIST_ADD]: ROOM_URL,
    [ClientEvents.PLAYLIST_REMOVE]: withRoom({ required: { itemId: isId } }),
    [ClientEvents.PLAYLIST_REORDER]: withRoom({
        required: { itemIds: isIdList },
    }),
    [ClientEvents.PLAYLIST_NEXT]: ROOM,
    [ClientEvents.PLAYLIST_PREV]: ROOM,
    [ClientEvents.PLAYLIST_JUMP]: ROOM_INDEX,
    [ClientEvents.MEDIA_ENDED]: ROOM_INDEX,
    [ClientEvents.CHAT_BLOCK]: ROOM_USER,
    [ClientEvents.CHAT_UNBLOCK]: ROOM_USER,
    [ClientEvents.MEMBER_BAN]: ROOM_USER,
    [ClientEvents.MEMBER_UNBAN]: ROOM_USER,
    [ClientEvents.MEMBER_MUTE]: ROOM_USER,
    [ClientEvents.MEMBER_UNMUTE]: ROOM_USER,
};

/** True when `payload` has the shape `event` expects. Unknown events are rejected. */
export function validateClientPayload(event: string, payload: unknown): boolean {
    const shape = Object.hasOwn(SHAPES, event) ? SHAPES[event] : undefined;
    if (!shape) return false;
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload))
        return false;
    const body = payload as Record<string, unknown>;
    for (const [key, check] of Object.entries(shape.required ?? {})) {
        if (!check(body[key])) return false;
    }
    for (const [key, check] of Object.entries(shape.optional ?? {})) {
        if (body[key] !== undefined && !check(body[key])) return false;
    }
    return true;
}

/** Minimum gap between two packets of the same event on one socket. */
const MIN_GAP_MS: Record<string, number> = {
    [ClientEvents.HEARTBEAT]: 2_000, // the client sends one every 30 s
    [ClientEvents.JOIN]: 250,
    [ClientEvents.PLAYLIST_ADD]: 500,
    [ClientEvents.CHAT_BLOCK]: 250,
    [ClientEvents.CHAT_UNBLOCK]: 250,
};

export function createPacketGuard(
    onReject: (event: string, reason: 'VALIDATION' | 'RATE_LIMITED') => void,
    now: () => number = Date.now
) {
    const lastAt = new Map<string, number>();
    let windowStart = 0;
    let windowCount = 0;

    return (packet: unknown[], next: (err?: Error) => void): void => {
        const event = String(packet[0]);
        if (!validateClientPayload(event, packet[1])) {
            onReject(event, 'VALIDATION');
            return;
        }
        const t = now();
        if (t - windowStart >= WS_GLOBAL_WINDOW_MS) {
            windowStart = t;
            windowCount = 0;
        }
        const gap = MIN_GAP_MS[event] ?? 0;
        const previous = lastAt.get(event);
        if (
            ++windowCount > WS_GLOBAL_LIMIT ||
            (gap > 0 && previous !== undefined && t - previous < gap)
        ) {
            onReject(event, 'RATE_LIMITED');
            return;
        }
        lastAt.set(event, t);
        next();
    };
}
