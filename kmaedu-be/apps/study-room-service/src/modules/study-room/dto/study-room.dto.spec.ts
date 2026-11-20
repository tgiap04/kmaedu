import { JoinByCodeSchema, JoinRoomSchema } from './study-room.dto';

describe('invite code input (8 letters and digits)', () => {
    it.each([
        ['K7M2Q9XA', 'K7M2Q9XA'],
        ['k7m2q9xa', 'K7M2Q9XA'],
        ['  K7M2-Q9XA ', 'K7M2Q9XA'],
        ['k7m2 q9xa', 'K7M2Q9XA'],
    ])('accepts %j as %j', (input, expected) => {
        expect(JoinByCodeSchema.parse({ inviteCode: input }).inviteCode).toBe(expected);
        expect(JoinRoomSchema.parse({ inviteCode: input }).inviteCode).toBe(expected);
    });

    it.each(['123456', 'K7M2Q9X', 'K7M2Q9XAB', 'K7M2Q9X!', '', 'K7M2Q9XÁ'])('refuses %j', (input) => {
        expect(JoinByCodeSchema.safeParse({ inviteCode: input }).success).toBe(false);
        expect(JoinRoomSchema.safeParse({ inviteCode: input }).success).toBe(false);
    });

    it('a room join without a code is still allowed (public / whitelist rooms)', () => {
        expect(JoinRoomSchema.parse({}).inviteCode).toBeUndefined();
    });
});
