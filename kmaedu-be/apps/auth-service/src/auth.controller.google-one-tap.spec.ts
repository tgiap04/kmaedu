import { AuthController } from './auth.controller';

/**
 * `POST /auth/google/one-tap` must build device info the same way login and
 * register do: a missing `X-Device-ID` header falls back to a derived id
 * instead of reaching `UserSession.deviceId` (NOT NULL) as undefined → 500.
 */
describe('AuthController Google One Tap device info', () => {
    let authService: { googleOneTapLogin: jest.Mock };
    let controller: AuthController;
    const res = { cookie: jest.fn() };

    const request = (headers: Record<string, string>) =>
        ({ headers, ip: '10.0.0.7', cookies: {} }) as never;

    beforeEach(() => {
        authService = {
            googleOneTapLogin: jest.fn().mockResolvedValue({
                token: 'jwt',
                refreshToken: 'rt',
                success: true,
            }),
        };
        controller = new AuthController(authService as never, {} as never);
    });

    const deviceInfoSent = () => authService.googleOneTapLogin.mock.calls[0][1];

    it('falls back to a derived device id when X-Device-ID is missing', async () => {
        await controller.googleOneTap(
            { credential: 'id-token' },
            request({ 'user-agent': 'Mozilla/5.0' }),
            res as never
        );

        const deviceInfo = deviceInfoSent();
        expect(typeof deviceInfo.deviceId).toBe('string');
        expect(deviceInfo.deviceId).toMatch(/^[0-9a-f]{32}$/);
        expect(deviceInfo.userAgent).toBe('Mozilla/5.0');
    });

    it('keeps the client device id when X-Device-ID is present', async () => {
        await controller.googleOneTap(
            { credential: 'id-token', utmSource: 'fb' },
            request({ 'x-device-id': 'device-abc', 'user-agent': 'UA' }),
            res as never
        );

        expect(deviceInfoSent().deviceId).toBe('device-abc');
        expect(authService.googleOneTapLogin).toHaveBeenCalledWith(
            'id-token',
            expect.objectContaining({ deviceId: 'device-abc' }),
            'fb'
        );
    });
});
