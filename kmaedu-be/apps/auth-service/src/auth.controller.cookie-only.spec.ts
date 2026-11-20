import { AuthController } from './auth.controller';

/**
 * Web is the only client and it is cookie-only: tokens travel in the HttpOnly `accessToken` /
 * `refreshToken` cookies and never in a JSON body, where any script in the origin could read them.
 */
describe('AuthController keeps tokens out of response bodies', () => {
    const session = {
        token: 'access-jwt',
        refreshToken: 'refresh-secret',
        sessionId: 'sid-1',
        deviceId: 'dev-1',
        user: { id: 'user-1' },
        roles: ['STUDENT'],
        permissions: ['flashcard:study'],
        success: true,
    };
    const request = { headers: { 'x-device-id': 'dev-1' }, ip: '10.0.0.1', cookies: {} } as never;

    let authService: Record<string, jest.Mock>;
    let redis: { set: jest.Mock; get: jest.Mock; del: jest.Mock };
    let res: { cookie: jest.Mock; clearCookie: jest.Mock; redirect: jest.Mock };
    let controller: AuthController;

    const cookie = (name: string) => res.cookie.mock.calls.find(([n]) => n === name)?.[1];
    const expectNoTokens = (body: unknown) => {
        const json = JSON.stringify(body);
        expect(json).not.toContain('access-jwt');
        expect(json).not.toContain('refresh-secret');
        expect(body).not.toHaveProperty('token');
        expect(body).not.toHaveProperty('refreshToken');
        expect(body).not.toHaveProperty('sessionId');
    };

    beforeEach(() => {
        authService = {
            login: jest.fn().mockResolvedValue(session),
            register: jest.fn().mockResolvedValue({ ...session, message: 'Đăng ký thành công' }),
            googleOneTapLogin: jest.fn().mockResolvedValue(session),
            refreshAccessToken: jest.fn().mockResolvedValue(session),
            verifyAccount: jest.fn().mockResolvedValue({ message: 'ok', token: 'access-jwt' }),
            syncRefreshTokenBySession: jest.fn().mockResolvedValue({ success: true }),
        };
        redis = { set: jest.fn(), get: jest.fn(), del: jest.fn() };
        res = { cookie: jest.fn(), clearCookie: jest.fn(), redirect: jest.fn() };
        controller = new AuthController(authService as never, redis as never);
    });

    it('login sets both cookies and returns only the session description', async () => {
        const body = await controller.login({ credential: 'bob', password: 'x' } as never, res as never, request);

        expect(cookie('accessToken')).toBe('access-jwt');
        expect(cookie('refreshToken')).toBe('refresh-secret');
        expectNoTokens(body);
        expect(body).toMatchObject({ success: true, user: { id: 'user-1' }, roles: ['STUDENT'] });
    });

    it('register sets both cookies and returns only the session description', async () => {
        const body = await controller.register({} as never, res as never, request);

        expect(cookie('accessToken')).toBe('access-jwt');
        expect(cookie('refreshToken')).toBe('refresh-secret');
        expectNoTokens(body);
        expect(body).toMatchObject({ success: true, message: 'Đăng ký thành công', permissions: ['flashcard:study'] });
    });

    it('Google One Tap sets both cookies and returns no token', async () => {
        const body = await controller.googleOneTap({ credential: 'id-token' }, request, res as never);

        expect(cookie('refreshToken')).toBe('refresh-secret');
        expectNoTokens(body);
        expect(body).toMatchObject({ success: true, user: { id: 'user-1' } });
    });

    it('refresh rotates the cookies and returns no token', async () => {
        const body = await controller.refreshToken(
            { cookies: { refreshToken: 'old' }, body: {} } as never,
            undefined,
            res as never
        );

        expect(cookie('accessToken')).toBe('access-jwt');
        expect(cookie('refreshToken')).toBe('refresh-secret');
        expectNoTokens(body);
        expect(body).toMatchObject({ success: true, roles: ['STUDENT'] });
    });

    it('refresh inside the grace window sets only the access cookie (the browser already holds the live refresh cookie)', async () => {
        authService.refreshAccessToken.mockResolvedValue({ ...session, refreshToken: undefined });

        await controller.refreshToken({ cookies: { refreshToken: 'old' }, body: {} } as never, undefined, res as never);

        expect(cookie('accessToken')).toBe('access-jwt');
        expect(res.cookie.mock.calls.map(([n]) => n)).not.toContain('refreshToken');
    });

    it('verifyAccount swaps the access cookie and returns only the message', async () => {
        const body = await controller.verifyAccount(
            '123456',
            { user: { id: 'user-1', sid: 'sid-1' } } as never,
            request,
            res as never
        );

        expect(cookie('accessToken')).toBe('access-jwt');
        expectNoTokens(body);
    });

    it('sync-refresh-token neither returns nor re-sends the refresh token', async () => {
        const body = await controller.syncRefreshToken(
            { user: { id: 'user-1', sid: 'sid-1' } } as never,
            request,
            res as never
        );

        expect(body).toEqual({ success: true });
        expect(res.cookie).not.toHaveBeenCalled();
    });

    it('the Google callback does not park the refresh token in Redis for the exchange code', async () => {
        const previous = process.env.OAUTH_ALLOWED_APP_REDIRECTS;
        process.env.OAUTH_ALLOWED_APP_REDIRECTS = 'kmaedu://';
        const state = Buffer.from(JSON.stringify({ nonce: 'n1', redirect: 'kmaedu://auth/callback' })).toString('base64url');
        const oauthRequest = { user: { token: 'access-jwt', sessionId: 'sid-1', refreshToken: 'refresh-secret', user: { id: 'user-1' } } };

        await controller.googleAuthRedirect(
            oauthRequest as never,
            res as never,
            { query: { state }, cookies: { oauth_nonce: 'n1' }, headers: {} } as never
        );
        process.env.OAUTH_ALLOWED_APP_REDIRECTS = previous;

        expect(redis.set).toHaveBeenCalledTimes(1);
        expect(redis.set.mock.calls[0][1]).not.toContain('refresh-secret');
        expect(cookie('refreshToken')).toBe('refresh-secret');
    });

    it('the mobile OAuth exchange never stores or returns a refresh token', async () => {
        redis.get.mockResolvedValue(JSON.stringify({ token: 'access-jwt', refreshToken: 'refresh-secret', sessionId: 'sid-1', userId: 'user-1' }));

        const body = await controller.exchangeOAuthCode('code');

        expect(body).not.toHaveProperty('refreshToken');
        expect(JSON.stringify(body)).not.toContain('refresh-secret');
    });
});
