import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AccountDisabledException } from './token/access-token.service';

describe('AuthService refresh token flow', () => {
    const mockPrisma = {};
    const mockMailService = { sendMail: jest.fn() };
    const mockPasswordService = {
        comparePasswords: jest.fn(),
        hashPassword: jest.fn(),
    };
    const mockOutbox = {
        add: jest.fn(),
    };
    // Refresh tokens are sealed at rest; the mock mirrors real seal/open
    // behavior deterministically enough for these tests, which assert on
    // plaintext flowing to/from the repository boundary.
    const mockRefreshTokenCipher = {
        seal: jest.fn((plaintext: string) => `sealed:${plaintext}`),
        open: jest.fn((blob: string) => blob.replace(/^sealed:/, '')),
    };

    let userRepository: {
        findByIdWithRelations: jest.Mock;
    };
    let userSessionRepository: {
        findByRefreshToken: jest.Mock;
        findByRotatedOutToken: jest.Mock;
        rotateRefreshTokenIfCurrent: jest.Mock;
        reissueForRotatedOutToken: jest.Mock;
        deactivateSession: jest.Mock;
        create: jest.Mock;
        findBySessionId: jest.Mock;
        updateLastActivity: jest.Mock;
    };
    let accessTokens: {
        issue: jest.Mock;
    };
    let generateIdService: {
        generateId: jest.Mock;
        generateSecureToken: jest.Mock;
    };
    let sessionRevoker: { revokeBySid: jest.Mock };
    let authService: AuthService;

    const issued = (token = 'new-access-token') => ({
        token,
        user: {
            id: 'user-123',
            email: 'student@example.com',
            username: 'student',
            password: 'hashed-password',
            role: 'STUDENT',
            isSystemAdmin: false,
        },
        roles: ['STUDENT'],
        permissions: ['flashcard:study'],
    });

    const liveSession = () => ({
        id: 'session-row-id',
        sessionId: 'session-123',
        userId: 'user-123',
        isActive: true,
        expiresAt: new Date(Date.now() + 60_000),
    });

    beforeEach(() => {
        userRepository = {
            findByIdWithRelations: jest.fn(),
        };

        userSessionRepository = {
            findByRefreshToken: jest.fn(),
            findByRotatedOutToken: jest.fn(),
            rotateRefreshTokenIfCurrent: jest.fn(),
            reissueForRotatedOutToken: jest.fn(),
            deactivateSession: jest.fn(),
            create: jest.fn(),
            findBySessionId: jest.fn(),
            updateLastActivity: jest.fn(),
        };

        accessTokens = {
            issue: jest.fn(),
        };

        generateIdService = {
            generateId: jest.fn(),
            generateSecureToken: jest.fn(),
        };

        sessionRevoker = { revokeBySid: jest.fn().mockResolvedValue([]) };

        mockRefreshTokenCipher.seal.mockClear();
        mockRefreshTokenCipher.open.mockClear();

        authService = new AuthService(
            mockPrisma as any,
            userRepository as any,
            userSessionRepository as any,
            accessTokens as any,
            mockMailService as any,
            mockPasswordService as any,
            generateIdService as any,
            mockOutbox as any,
            mockRefreshTokenCipher as any,
            { publish: jest.fn() } as any,
            { invalidateUser: jest.fn(), revokeSession: jest.fn() } as any,
            sessionRevoker as any,
            { claim: jest.fn() } as any
        );
    });

    it('rotates refresh token and returns a new access token', async () => {
        userSessionRepository.findByRefreshToken.mockResolvedValue({
            id: 'session-row-id',
            sessionId: 'session-123',
            userId: 'user-123',
            isActive: true,
            expiresAt: new Date(Date.now() + 60_000),
        });
        accessTokens.issue.mockResolvedValue(issued());
        generateIdService.generateSecureToken.mockReturnValue(
            'refresh-part-1_refresh-part-2'
        );

        userSessionRepository.rotateRefreshTokenIfCurrent.mockResolvedValue({
            rotated: true,
            refreshToken: 'refresh-part-1_refresh-part-2',
        });

        const result = await authService.refreshAccessToken('old-refresh-token');

        expect(accessTokens.issue).toHaveBeenCalledWith(
            'user-123',
            'session-123',
            undefined
        );
        expect(
            userSessionRepository.rotateRefreshTokenIfCurrent
        ).toHaveBeenCalledWith(
            'session-123',
            'old-refresh-token',
            'refresh-part-1_refresh-part-2'
        );
        expect(result).toEqual({
            token: 'new-access-token',
            refreshToken: 'refresh-part-1_refresh-part-2',
            user: expect.objectContaining({
                id: 'user-123',
                email: 'student@example.com',
                username: 'student',
            }),
            roles: ['STUDENT'],
            permissions: ['flashcard:study'],
        });
        expect(result.user.password).toBeUndefined();
    });

    it('within the grace window issues an access token but never hands out the live refresh token', async () => {
        userSessionRepository.findByRefreshToken.mockResolvedValue(liveSession());
        accessTokens.issue.mockResolvedValue(issued());
        generateIdService.generateSecureToken.mockReturnValue('refresh-part-1_refresh-part-2');
        // Grace path: a concurrent request (another tab, same cookie jar) already rotated.
        userSessionRepository.rotateRefreshTokenIfCurrent.mockResolvedValue({ rotated: false });

        const result = await authService.refreshAccessToken('stale-but-grace-token');

        expect(result.token).toBe('new-access-token');
        expect(result.refreshToken).toBeUndefined();
        expect(mockRefreshTokenCipher.open).not.toHaveBeenCalled();
    });

    it('treats a rotated-out token presented after the grace window as theft: the whole session is revoked', async () => {
        userSessionRepository.findByRefreshToken.mockResolvedValue(null);
        userSessionRepository.findByRotatedOutToken.mockResolvedValue({
            ...liveSession(),
            previousTokenExpiresAt: new Date(Date.now() - 1_000),
        });

        await expect(authService.refreshAccessToken('stolen-old-token')).rejects.toBeInstanceOf(
            UnauthorizedException
        );
        expect(userSessionRepository.findByRotatedOutToken).toHaveBeenCalledWith('stolen-old-token');
        expect(sessionRevoker.revokeBySid).toHaveBeenCalledWith('session-123');
        expect(accessTokens.issue).not.toHaveBeenCalled();
    });

    it('re-issues for the same device when the rotating response was lost (no logout 15 minutes later)', async () => {
        // The browser never received the rotated cookie and presents the old token after the grace window.
        userSessionRepository.findByRefreshToken.mockResolvedValue(null);
        userSessionRepository.findByRotatedOutToken.mockResolvedValue({ ...liveSession(), deviceId: 'dev-1' });
        userSessionRepository.rotateRefreshTokenIfCurrent.mockResolvedValue(null);
        userSessionRepository.reissueForRotatedOutToken.mockResolvedValue(true);
        accessTokens.issue.mockResolvedValue(issued());
        generateIdService.generateSecureToken.mockReturnValue('fresh_token');

        const result = await authService.refreshAccessToken('lost-response-token', 'dev-1');

        expect(sessionRevoker.revokeBySid).not.toHaveBeenCalled();
        expect(userSessionRepository.reissueForRotatedOutToken).toHaveBeenCalledWith('session-123', 'lost-response-token', 'fresh_token');
        expect(result.refreshToken).toBe('fresh_token');
    });

    it('re-issues inside the grace window too when the device matches', async () => {
        userSessionRepository.findByRefreshToken.mockResolvedValue({ ...liveSession(), deviceId: 'dev-1' });
        userSessionRepository.rotateRefreshTokenIfCurrent.mockResolvedValue({ rotated: false });
        userSessionRepository.reissueForRotatedOutToken.mockResolvedValue(true);
        accessTokens.issue.mockResolvedValue(issued());
        generateIdService.generateSecureToken.mockReturnValue('fresh_token');

        const result = await authService.refreshAccessToken('grace-token', 'dev-1');

        expect(result.refreshToken).toBe('fresh_token');
    });

    it('still treats a rotated-out token from another device as theft', async () => {
        userSessionRepository.findByRefreshToken.mockResolvedValue(null);
        userSessionRepository.findByRotatedOutToken.mockResolvedValue({ ...liveSession(), deviceId: 'dev-1' });

        await expect(authService.refreshAccessToken('stolen-old-token', 'dev-attacker')).rejects.toBeInstanceOf(
            UnauthorizedException
        );
        expect(sessionRevoker.revokeBySid).toHaveBeenCalledWith('session-123');
        expect(userSessionRepository.reissueForRotatedOutToken).not.toHaveBeenCalled();
    });

    it('does not revoke anything for an unknown token', async () => {
        userSessionRepository.findByRefreshToken.mockResolvedValue(null);
        userSessionRepository.findByRotatedOutToken.mockResolvedValue(null);

        await expect(authService.refreshAccessToken('garbage')).rejects.toBeInstanceOf(UnauthorizedException);
        expect(sessionRevoker.revokeBySid).not.toHaveBeenCalled();
    });

    it('rejects a refresh token that is outside the grace window', async () => {
        userSessionRepository.findByRefreshToken.mockResolvedValue({
            id: 'session-row-id',
            sessionId: 'session-123',
            userId: 'user-123',
            isActive: true,
            expiresAt: new Date(Date.now() + 60_000),
        });
        accessTokens.issue.mockResolvedValue(issued());
        generateIdService.generateSecureToken.mockReturnValue(
            'refresh-part-1_refresh-part-2'
        );
        userSessionRepository.rotateRefreshTokenIfCurrent.mockResolvedValue(null);

        await expect(
            authService.refreshAccessToken('long-dead-token')
        ).rejects.toThrow(
            new UnauthorizedException('Refresh token was already used')
        );
    });

    it('rejects expired refresh token sessions', async () => {
        userSessionRepository.findByRefreshToken.mockResolvedValue({
            id: 'session-row-id',
            sessionId: 'session-123',
            userId: 'user-123',
            isActive: true,
            expiresAt: new Date(Date.now() - 1_000),
        });

        await expect(
            authService.refreshAccessToken('expired-refresh-token')
        ).rejects.toThrow(new UnauthorizedException('Session expired'));

        expect(userSessionRepository.deactivateSession).toHaveBeenCalledWith(
            'session-row-id'
        );
        expect(
            userSessionRepository.rotateRefreshTokenIfCurrent
        ).not.toHaveBeenCalled();
    });

    it('rejects refresh when session user no longer exists', async () => {
        userSessionRepository.findByRefreshToken.mockResolvedValue({
            id: 'session-row-id',
            sessionId: 'session-123',
            userId: 'missing-user',
            isActive: true,
            expiresAt: new Date(Date.now() + 60_000),
        });
        accessTokens.issue.mockRejectedValue(
            new NotFoundException('User not found')
        );

        await expect(
            authService.refreshAccessToken('refresh-token')
        ).rejects.toThrow(new NotFoundException('User not found'));
    });

    it('refuses to refresh a banned or deleted account: 401 ACCOUNT_DISABLED, session deactivated, no rotation', async () => {
        userSessionRepository.findByRefreshToken.mockResolvedValue(liveSession());
        userSessionRepository.findBySessionId.mockResolvedValue({
            id: 'session-row-id',
        });
        accessTokens.issue.mockRejectedValue(new AccountDisabledException());

        const error = await authService
            .refreshAccessToken('refresh-token')
            .catch((e) => e);

        expect(error).toBeInstanceOf(UnauthorizedException);
        expect(error.getResponse()).toMatchObject({ code: 'ACCOUNT_DISABLED' });
        expect(userSessionRepository.findBySessionId).toHaveBeenCalledWith(
            'session-123'
        );
        expect(userSessionRepository.deactivateSession).toHaveBeenCalledWith(
            'session-row-id'
        );
        expect(
            userSessionRepository.rotateRefreshTokenIfCurrent
        ).not.toHaveBeenCalled();
    });

    it('reloads the account on every refresh (role/av come from the DB, not the old token)', async () => {
        userSessionRepository.findByRefreshToken.mockResolvedValue(liveSession());
        accessTokens.issue
            .mockResolvedValueOnce({ ...issued('t1'), roles: ['STUDENT'] })
            .mockResolvedValueOnce({ ...issued('t2'), roles: ['TEACHER'] });
        generateIdService.generateSecureToken.mockReturnValue('next');
        userSessionRepository.rotateRefreshTokenIfCurrent.mockResolvedValue({ rotated: true, refreshToken: 'next' });

        const first = await authService.refreshAccessToken('r');
        const second = await authService.refreshAccessToken('r');

        expect(accessTokens.issue).toHaveBeenCalledTimes(2);
        expect(first.roles).toEqual(['STUDENT']);
        expect(second.roles).toEqual(['TEACHER']);
    });

    describe('syncRefreshTokenBySession', () => {
        it('confirms the session without ever returning (or even opening) the refresh token', async () => {
            userSessionRepository.findBySessionId.mockResolvedValue({
                id: 'session-row-id',
                sessionId: 'session-123',
                userId: 'user-123',
                isActive: true,
                expiresAt: new Date(Date.now() + 60_000),
                refreshToken: 'sealed:plaintext-current-token',
            });

            const result = await authService.syncRefreshTokenBySession(
                'user-123',
                'session-123'
            );

            expect(mockRefreshTokenCipher.open).not.toHaveBeenCalled();
            expect(JSON.stringify(result)).not.toContain('plaintext-current-token');
            expect(result).toEqual({ success: true });
            expect(
                userSessionRepository.updateLastActivity
            ).toHaveBeenCalledWith('session-123');
        });

        it('rejects when the session belongs to a different user', async () => {
            userSessionRepository.findBySessionId.mockResolvedValue({
                id: 'session-row-id',
                sessionId: 'session-123',
                userId: 'someone-else',
                isActive: true,
                expiresAt: new Date(Date.now() + 60_000),
                refreshToken: 'sealed:plaintext-current-token',
            });

            await expect(
                authService.syncRefreshTokenBySession('user-123', 'session-123')
            ).rejects.toThrow(new UnauthorizedException('Session không hợp lệ'));
            expect(mockRefreshTokenCipher.open).not.toHaveBeenCalled();
        });
    });
});
