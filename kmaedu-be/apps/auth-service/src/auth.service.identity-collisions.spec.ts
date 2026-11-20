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
            {} as never
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
});
