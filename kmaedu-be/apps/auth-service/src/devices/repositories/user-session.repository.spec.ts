import { UserSessionRepository } from './user-session.repository';

describe('UserSessionRepository refresh rotation', () => {
    const cipher = {
        seal: jest.fn((plain: string) => `sealed:${plain}`),
        open: jest.fn((blob: string) => blob.replace(/^sealed:/, '')),
    };
    let userSession: { updateMany: jest.Mock; findFirst: jest.Mock; findUnique: jest.Mock };
    let repo: UserSessionRepository;

    beforeEach(() => {
        cipher.open.mockClear();
        userSession = { updateMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn() };
        repo = new UserSessionRepository({ userSession } as never, cipher as never);
    });

    it('rotates the current token and returns the new one', async () => {
        userSession.updateMany.mockResolvedValue({ count: 1 });

        const result = await repo.rotateRefreshTokenIfCurrent('sid', 'current', 'next');

        expect(result).toEqual({ rotated: true, refreshToken: 'next' });
        expect(userSession.updateMany.mock.calls[0][0].data).toMatchObject({
            refreshToken: 'sealed:next',
            previousRefreshToken: 'sealed:current',
        });
    });

    it('accepts a just-rotated token inside the grace window WITHOUT reading back the live token', async () => {
        userSession.updateMany.mockResolvedValue({ count: 0 });
        userSession.findFirst.mockResolvedValue({ sessionId: 'sid', refreshToken: 'sealed:live-token' });

        const result = await repo.rotateRefreshTokenIfCurrent('sid', 'previous', 'next');

        expect(result).toEqual({ rotated: false });
        expect(JSON.stringify(result)).not.toContain('live-token');
        expect(cipher.open).not.toHaveBeenCalled();
    });

    it('returns null for a token that is neither current nor in the grace window', async () => {
        userSession.updateMany.mockResolvedValue({ count: 0 });
        userSession.findFirst.mockResolvedValue(null);

        expect(await repo.rotateRefreshTokenIfCurrent('sid', 'old', 'next')).toBeNull();
    });

    it('finds the active session whose PREVIOUS token is presented, regardless of the grace deadline', async () => {
        const session = { sessionId: 'sid', isActive: true };
        userSession.findFirst.mockResolvedValue(session);

        expect(await repo.findByRotatedOutToken('old')).toBe(session);
        expect(userSession.findFirst).toHaveBeenCalledWith({
            where: { previousRefreshToken: 'sealed:old', isActive: true },
        });
    });
});
