import { GoogleStrategy } from './google.strategy';

// Only a mailbox Google has verified may sign in: an unverified Google email would otherwise take over an
// unverified password account with the same address.
describe('GoogleStrategy.validate', () => {
    const env = { ...process.env };
    beforeAll(() => {
        process.env.GOOGLE_CLIENT_ID = 'cid';
        process.env.GOOGLE_CLIENT_SECRET = 'secret';
        process.env.GOOGLE_CALLBACK_URL = 'http://localhost/cb';
    });
    afterAll(() => {
        process.env = env;
    });

    const profile = (verified: boolean | undefined) => ({
        name: { givenName: 'Bob', familyName: 'Smith' },
        emails: [{ value: 'bob@example.com', verified }],
        _json: verified === undefined ? {} : { email_verified: verified },
    });

    it('refuses an email Google has not verified, without signing in', async () => {
        const auth = { googleLogin: jest.fn() };
        const done = jest.fn();
        await new GoogleStrategy(auth as never).validate({ query: {} } as never, 'at', 'rt', profile(false), done);
        expect(auth.googleLogin).not.toHaveBeenCalled();
        expect(done.mock.calls[0][0]).toBeInstanceOf(Error);
    });

    it('refuses a profile that does not say the email is verified', async () => {
        const auth = { googleLogin: jest.fn() };
        const done = jest.fn();
        await new GoogleStrategy(auth as never).validate({ query: {} } as never, 'at', 'rt', profile(undefined), done);
        expect(auth.googleLogin).not.toHaveBeenCalled();
    });

    it('signs in a verified Google email', async () => {
        const auth = { googleLogin: jest.fn().mockResolvedValue({ success: true }) };
        const done = jest.fn();
        await new GoogleStrategy(auth as never).validate({ query: {} } as never, 'at', 'rt', profile(true), done);
        expect(auth.googleLogin).toHaveBeenCalled();
        expect(done).toHaveBeenCalledWith(null, { success: true });
    });
});
