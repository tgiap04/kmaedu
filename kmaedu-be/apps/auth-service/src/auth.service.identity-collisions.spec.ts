import { ConflictException, InternalServerErrorException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Prisma } from './prisma';

/** The P2002 shape Prisma 6 raises through the pg driver adapter. */
const uniqueViolation = (field: string) =>
    new Prisma.PrismaClientKnownRequestError(
        `Unique constraint failed on the fields: (\`${field}\`)`,
        {
            code: 'P2002',
            clientVersion: '6.19.3',
            meta: {
                modelName: 'X',
                driverAdapterError: {
                    cause: { kind: 'UniqueConstraintViolation', constraint: { fields: [field] } },
                },
            },
        }
    );

describe('AuthService identity normalisation and collisions', () => {
    const user = { id: 'user-1', email: 'bob@example.com', username: 'Bob', isVerified: false };
    let tx: { user: { create: jest.Mock } };
    let prisma: {
        $transaction: jest.Mock;
        verifyAccountCode: { upsert: jest.Mock };
        resetPasswordCode: { upsert: jest.Mock };
    };
    let userRepository: {
        emailExists: jest.Mock;
        usernameExists: jest.Mock;
        findByEmail: jest.Mock;
        findByIdWithRelations: jest.Mock;
    };
    let mail: { sendMail: jest.Mock };
    let service: AuthService;

    beforeEach(() => {
        tx = { user: { create: jest.fn(async ({ data }) => ({ ...user, ...data })) } };
        prisma = {
            $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
            verifyAccountCode: { upsert: jest.fn().mockResolvedValue({}) },
            resetPasswordCode: { upsert: jest.fn().mockResolvedValue({}) },
        };
        userRepository = {
            emailExists: jest.fn().mockResolvedValue(false),
            usernameExists: jest.fn().mockResolvedValue(false),
            findByEmail: jest.fn().mockResolvedValue(null),
            findByIdWithRelations: jest.fn().mockResolvedValue(user),
        };
        mail = { sendMail: jest.fn().mockResolvedValue(undefined) };
        const accessTokens = {
            issue: jest.fn().mockResolvedValue({ token: 'jwt', user, roles: [], permissions: [] }),
        };
        service = new AuthService(
            prisma as never,
            userRepository as never,
            { create: jest.fn().mockResolvedValue({}) } as never,
            accessTokens as never,
            mail as never,
            { hashPassword: jest.fn().mockResolvedValue('hash') } as never,
            {
                generateId: jest.fn().mockReturnValue('gen-id'),
                generateSecureToken: jest.fn().mockReturnValue('secure-token'),
            } as never,
            { add: jest.fn().mockResolvedValue({}) } as never,
            {} as never,
            { publish: jest.fn() } as never,
            { invalidateUser: jest.fn(), revokeSession: jest.fn() } as never,
            {} as never,
            { claim: jest.fn().mockResolvedValue(undefined) } as never
        );
    });

    const registerDto = { username: 'Bob', email: 'Bob@Example.COM', password: 'Passw0rd!' };
    const device = { deviceId: 'dev-1' };

    describe('register', () => {
        it('stores the email lower-cased and the username as typed', async () => {
            await service.register(registerDto as never, device);

            const data = tx.user.create.mock.calls[0][0].data;
            expect(data.email).toBe('bob@example.com');
            expect(data.username).toBe('Bob');
        });

        it('answers 409 when a concurrent signup wins the email unique index', async () => {
            tx.user.create.mockRejectedValue(uniqueViolation('email'));
            await expect(service.register(registerDto as never, device)).rejects.toThrow(
                new ConflictException('Email đã được sử dụng')
            );
        });

        it('answers 409 when a concurrent signup wins the username unique index', async () => {
            tx.user.create.mockRejectedValue(uniqueViolation('username'));
            await expect(service.register(registerDto as never, device)).rejects.toThrow(
                new ConflictException('Username đã được sử dụng')
            );
        });

        it('still answers 500 for any other failure', async () => {
            tx.user.create.mockRejectedValue(uniqueViolation('id'));
            await expect(service.register(registerDto as never, device)).rejects.toBeInstanceOf(
                InternalServerErrorException
            );
        });
    });

    describe('6-digit codes (table-wide unique `code`)', () => {
        const flows = [
            ['sendVerificationEmail', () => prisma.verifyAccountCode.upsert, () => service.sendVerificationEmail('user-1')],
            ['sendCodeToResetPassword', () => prisma.resetPasswordCode.upsert, () => service.sendCodeToResetPassword('bob@example.com')],
            ['sendCodeToChangePassword', () => prisma.resetPasswordCode.upsert, () => service.sendCodeToChangePassword('user-1')],
        ] as const;

        beforeEach(() => userRepository.findByEmail.mockResolvedValue(user));

        it.each(flows)('%s draws a new code when another user holds the drawn one', async (_n, upsert, run) => {
            upsert().mockRejectedValueOnce(uniqueViolation('code'));

            await expect(run()).resolves.toHaveProperty('message');
            expect(upsert()).toHaveBeenCalledTimes(2);
            const stored = upsert().mock.calls[1][0].create.code;
            expect(stored).toMatch(/^\d{6}$/);
            expect(JSON.stringify(mail.sendMail.mock.calls[0][3])).toContain(stored);
        });

        it.each(flows)('%s gives up after 5 colliding draws', async (_n, upsert, run) => {
            upsert().mockRejectedValue(uniqueViolation('code'));

            await expect(run()).rejects.toBeInstanceOf(InternalServerErrorException);
            expect(upsert()).toHaveBeenCalledTimes(5);
            expect(mail.sendMail).not.toHaveBeenCalled();
        });

        it.each(flows)('%s does not retry a unique violation on another column', async (_n, upsert, run) => {
            upsert().mockRejectedValue(uniqueViolation('userId'));

            await expect(run()).rejects.toBeInstanceOf(InternalServerErrorException);
            expect(upsert()).toHaveBeenCalledTimes(1);
        });
    });

    describe('Google sign-in account creation', () => {
        it('suffixes a derived username that is already taken (any case)', async () => {
            userRepository.usernameExists.mockImplementation(async (name: string) => name === 'Bob Smith');

            await (service as any).handleOAuthLogin('bob@example.com', 'Bob Smith');

            const { username } = tx.user.create.mock.calls[0][0].data;
            expect(username).not.toBe('Bob Smith');
            expect(username).toMatch(/^Bob Smith\d{4}$/);
        });

        it('keeps a free derived username unchanged and stores the email lower-cased', async () => {
            await (service as any).handleOAuthLogin('Bob@Example.com', 'bob');

            const data = tx.user.create.mock.calls[0][0].data;
            expect(data.username).toBe('bob');
            expect(data.email).toBe('bob@example.com');
        });
    });

    describe('Google sign-in onto an existing account', () => {
        let updateMany: jest.Mock;
        let revokeAllInTx: jest.Mock;
        let pushRevoked: jest.Mock;
        let publish: jest.Mock;
        let codes: { verify: jest.Mock; reset: jest.Mock };

        beforeEach(() => {
            updateMany = jest.fn().mockResolvedValue({ count: 1 });
            (tx.user as any).updateMany = updateMany;
            (tx.user as any).findUniqueOrThrow = jest.fn(async () => ({ ...user, isVerified: true, password: null, authzVersion: 2 }));
            codes = { verify: jest.fn().mockResolvedValue({ count: 1 }), reset: jest.fn().mockResolvedValue({ count: 0 }) };
            (tx as any).verifyAccountCode = { deleteMany: codes.verify };
            (tx as any).resetPasswordCode = { deleteMany: codes.reset };
            revokeAllInTx = jest.fn().mockResolvedValue([{ id: 's1', sessionId: 'sid-attacker', userId: 'user-1' }]);
            pushRevoked = jest.fn().mockResolvedValue(undefined);
            publish = jest.fn();
            (service as any).sessionRevoker = { revokeAllInTx, pushRevoked };
            (service as any).authzPublisher = { publish };
            (userRepository as any).invalidateCaches = jest.fn();
        });

        it('takes over an unverified password account in one transaction: verified, password and codes dropped, sessions revoked', async () => {
            // Someone registered the address with a password but never proved the mailbox; Google now proves it.
            userRepository.findByEmail.mockResolvedValue({ ...user, isVerified: false, password: 'attacker-hash' });

            await (service as any).handleOAuthLogin('bob@example.com', 'bob');

            // Conditional on still being unverified, so a concurrent mailbox verification wins cleanly.
            expect(updateMany.mock.calls[0][0]).toMatchObject({
                where: { id: 'user-1', isVerified: false },
                data: { isVerified: true, password: null, authzVersion: { increment: 1 } },
            });
            expect(codes.verify).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
            expect(codes.reset).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
            expect(publish).toHaveBeenCalledTimes(1);
            // Revoked inside the same transaction: a crash after commit cannot leave the registrant's sessions alive.
            expect(revokeAllInTx).toHaveBeenCalledWith(tx, 'user-1');
            expect(pushRevoked).toHaveBeenCalledWith([{ id: 's1', sessionId: 'sid-attacker', userId: 'user-1' }]);
        });

        it('does nothing more when the account was verified meanwhile', async () => {
            userRepository.findByEmail.mockResolvedValue({ ...user, isVerified: false, password: 'h' });
            updateMany.mockResolvedValue({ count: 0 });

            await (service as any).handleOAuthLogin('bob@example.com', 'bob');

            expect(publish).not.toHaveBeenCalled();
            expect(revokeAllInTx).not.toHaveBeenCalled();
            expect(mail.sendMail).not.toHaveBeenCalled();
        });

        it('leaves a verified account and its sessions alone', async () => {
            userRepository.findByEmail.mockResolvedValue({ ...user, isVerified: true, password: 'own-hash' });

            await (service as any).handleOAuthLogin('bob@example.com', 'bob');

            expect(updateMany).not.toHaveBeenCalled();
            expect(revokeAllInTx).not.toHaveBeenCalled();
            expect(mail.sendMail).not.toHaveBeenCalled();
        });

        describe('notice mail after a takeover', () => {
            it('tells the mailbox owner, after commit, that the password was removed and every device signed out', async () => {
                userRepository.findByEmail.mockResolvedValue({ ...user, isVerified: false, password: 'attacker-hash' });
                const order: string[] = [];
                prisma.$transaction.mockImplementation(async (fn: (t: typeof tx) => unknown) => {
                    const out = await fn(tx);
                    order.push('commit');
                    return out;
                });
                mail.sendMail.mockImplementation(async () => {
                    order.push('mail');
                });

                await (service as any).handleOAuthLogin('bob@example.com', 'bob');

                expect(mail.sendMail).toHaveBeenCalledTimes(1);
                const [to, subject, template, context] = mail.sendMail.mock.calls[0];
                expect(to).toBe('bob@example.com');
                expect(subject).toContain('Google');
                expect(template).toBe('google-account-linked.template');
                expect(context).toMatchObject({ username: 'Bob' });
                expect(context.resetPasswordUrl).toContain('/forgot-password');
                expect(order).toEqual(['commit', 'mail']);
            });

            it('sends nothing when the unverified account never had a password', async () => {
                userRepository.findByEmail.mockResolvedValue({ ...user, isVerified: false, password: null });

                await (service as any).handleOAuthLogin('bob@example.com', 'bob');

                expect(revokeAllInTx).toHaveBeenCalled();
                expect(mail.sendMail).not.toHaveBeenCalled();
            });

            it('still signs the user in when the mail cannot be sent, and logs the failure', async () => {
                userRepository.findByEmail.mockResolvedValue({ ...user, isVerified: false, password: 'attacker-hash' });
                mail.sendMail.mockRejectedValue(new Error('smtp down'));
                const logged = jest.spyOn(console, 'error').mockImplementation(() => undefined);

                const result = await (service as any).handleOAuthLogin('bob@example.com', 'bob');
                await new Promise((r) => setImmediate(r));

                expect(result.success).toBe(true);
                expect(logged).toHaveBeenCalledWith(
                    expect.stringContaining('bob@example.com'),
                    expect.any(Error)
                );
                logged.mockRestore();
            });
        });
    });

    describe('Google One Tap', () => {
        it('refuses a credential whose email Google has not verified', async () => {
            jest.doMock('google-auth-library', () => ({
                OAuth2Client: jest.fn().mockImplementation(() => ({
                    verifyIdToken: jest.fn().mockResolvedValue({
                        getPayload: () => ({ email: 'bob@example.com', email_verified: false, name: 'Bob' }),
                    }),
                })),
            }));
            const spy = jest.spyOn(service as any, 'handleOAuthLogin');

            await expect(service.googleOneTapLogin('credential')).rejects.toThrow();
            expect(spy).not.toHaveBeenCalled();
            jest.dontMock('google-auth-library');
        });
    });
});
