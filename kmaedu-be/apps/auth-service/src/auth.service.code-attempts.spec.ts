import { BadRequestException, HttpException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * A 6-digit code allows at most 5 wrong guesses per account, whatever IP they come from: the 5th wrong
 * guess deletes the code, so the owner has to ask for a new one (no long account lock an attacker could abuse).
 */
describe('AuthService one-time code attempt limit', () => {
    type Row = { userId: string; code: string; expiresAt: Date; attempts: number };
    const user = { id: 'user-1', email: 'bob@example.com', username: 'bob', password: 'hash' };

    /** In-memory stand-in for one code table, with the conditional-increment semantics of Postgres. */
    const table = () => {
        const rows = new Map<string, Row>();
        return {
            rows,
            findUnique: jest.fn(async ({ where }) => rows.get(where.userId) ?? null),
            updateMany: jest.fn(async ({ where, data }) => {
                const row = rows.get(where.userId);
                if (!row) return { count: 0 };
                if (where.code !== undefined && row.code !== where.code) return { count: 0 };
                if (where.attempts?.lt !== undefined && !(row.attempts < where.attempts.lt)) return { count: 0 };
                if (where.expiresAt?.gt && !(row.expiresAt > where.expiresAt.gt)) return { count: 0 };
                if (data.attempts?.increment) row.attempts += data.attempts.increment;
                if (data.expiresAt) row.expiresAt = data.expiresAt;
                return { count: 1 };
            }),
            deleteMany: jest.fn(async ({ where }) => {
                const row = rows.get(where.userId);
                if (!row) return { count: 0 };
                if (where.code !== undefined && row.code !== where.code) return { count: 0 };
                if (where.attempts?.gte !== undefined && !(row.attempts >= where.attempts.gte)) return { count: 0 };
                rows.delete(where.userId);
                return { count: 1 };
            }),
            // Like Prisma: deleting a row that is already gone throws P2025.
            delete: jest.fn(async ({ where }) => {
                if (!rows.delete(where.userId)) throw new Error('P2025: record to delete does not exist');
                return {};
            }),
            upsert: jest.fn(async ({ where, update }) => {
                rows.set(where.userId, { userId: where.userId, ...update });
                return {};
            }),
        };
    };

    let verifyCodes: ReturnType<typeof table>;
    let resetCodes: ReturnType<typeof table>;
    let service: AuthService;
    let rotatePassword: jest.SpyInstance;
    let limiter: { claim: jest.Mock };
    let mail: { sendMail: jest.Mock };
    let userRepository: {
        findByEmail: jest.Mock;
        findByIdWithRelations: jest.Mock;
        update: jest.Mock;
        invalidateCaches: jest.Mock;
    };

    const seed = (t: ReturnType<typeof table>, code = '123456', expiresAt = new Date(Date.now() + 60_000)) =>
        t.rows.set(user.id, { userId: user.id, code, expiresAt, attempts: 0 });

    beforeEach(() => {
        verifyCodes = table();
        resetCodes = table();
        const tx = {
            user: { update: jest.fn().mockResolvedValue({ id: user.id, authzVersion: 2 }) },
            resetPasswordCode: resetCodes,
        };
        const prisma = {
            verifyAccountCode: verifyCodes,
            resetPasswordCode: resetCodes,
            $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
        };
        limiter = { claim: jest.fn().mockResolvedValue('fresh') };
        mail = { sendMail: jest.fn().mockResolvedValue(undefined) };
        userRepository = {
            findByEmail: jest.fn().mockResolvedValue(user),
            findByIdWithRelations: jest.fn().mockResolvedValue(user),
            update: jest.fn().mockResolvedValue({}),
            invalidateCaches: jest.fn().mockResolvedValue(undefined),
        };
        service = new AuthService(
            prisma as never,
            userRepository as never,
            {} as never,
            { issue: jest.fn().mockResolvedValue({ token: 'jwt', user, roles: [], permissions: [] }) } as never,
            mail as never,
            { comparePasswords: jest.fn().mockResolvedValue(true), hashPassword: jest.fn().mockResolvedValue('hash') } as never,
            {
                generateId: jest.fn().mockReturnValue('gen-id'),
                generateSecureToken: jest.fn(),
            } as never,
            {} as never,
            {} as never,
            { publish: jest.fn() } as never,
            { invalidateUser: jest.fn() } as never,
            { revokeAll: jest.fn().mockResolvedValue([]) } as never,
            limiter as never
        );
        rotatePassword = jest.spyOn(service as any, 'rotatePassword').mockResolvedValue(undefined);
    });

    const wrongResets = async (n: number) => {
        for (let i = 0; i < n; i++) {
            await service.resetPassword(user.email, '000000', 'NewPassw0rd!').catch(() => undefined);
        }
    };

    describe('reset password (by email, no session needed)', () => {
        it('deletes the code on the 5th wrong guess, so even the right code no longer works', async () => {
            seed(resetCodes);

            await wrongResets(5);

            expect(resetCodes.rows.has(user.id)).toBe(false);
            await expect(service.resetPassword(user.email, '123456', 'NewPassw0rd!')).rejects.toBeInstanceOf(
                NotFoundException
            );
            expect(rotatePassword).not.toHaveBeenCalled();
        });

        it('tells the user on the last wrong guess to request a new code', async () => {
            seed(resetCodes);
            await wrongResets(4);

            const error = await service.resetPassword(user.email, '000000', 'NewPassw0rd!').catch((e) => e);

            expect(error).toBeInstanceOf(BadRequestException);
            expect(error.message).toContain('yêu cầu mã mới');
        });

        it('still accepts the right code after 4 wrong guesses', async () => {
            seed(resetCodes);
            await wrongResets(4);

            await service.resetPassword(user.email, '123456', 'NewPassw0rd!');

            expect(rotatePassword).toHaveBeenCalledTimes(1);
        });

        it('compares at most 5 guesses even when they arrive at the same time', async () => {
            seed(resetCodes);

            const outcomes = await Promise.all(
                Array.from({ length: 12 }, () =>
                    service.resetPassword(user.email, '000000', 'NewPassw0rd!').catch((e) => e)
                )
            );

            expect(outcomes.every((e) => e instanceof BadRequestException || e instanceof NotFoundException)).toBe(true);
            expect(resetCodes.rows.has(user.id)).toBe(false);
        });

        it('a fresh code starts a fresh budget (the owner is never locked out for long)', async () => {
            seed(resetCodes);
            await wrongResets(5);

            await service.sendCodeToResetPassword(user.email);

            expect(resetCodes.rows.get(user.id)?.attempts).toBe(0);
        });

        it('reports an expired code as expired without spending an attempt', async () => {
            seed(resetCodes, '123456', new Date(Date.now() - 1000));

            await expect(service.resetPassword(user.email, '123456', 'NewPassw0rd!')).rejects.toThrow(
                'Mã đặt lại mật khẩu đã hết hạn'
            );
            expect(resetCodes.rows.get(user.id)?.attempts).toBe(0);
        });

        it('answers an unknown e-mail exactly like a known account with no pending code (no enumeration)', async () => {
            const known = await service.resetPassword(user.email, '123456', 'NewPassw0rd!').catch((e) => e);
            userRepository.findByEmail.mockResolvedValueOnce(null);
            const unknown = await service.resetPassword('nobody@example.com', '123456', 'NewPassw0rd!').catch((e) => e);

            expect(unknown.constructor).toBe(known.constructor);
            expect(unknown.getStatus()).toBe(known.getStatus());
            expect(unknown.message).toBe(known.message);
            expect(rotatePassword).not.toHaveBeenCalled();
        });
    });

    describe('verify account', () => {
        it('deletes the code on the 5th wrong guess', async () => {
            seed(verifyCodes);

            for (let i = 0; i < 5; i++) {
                await service.verifyAccount(user.id, '000000', 'sid').catch(() => undefined);
            }

            expect(verifyCodes.rows.has(user.id)).toBe(false);
        });

        it('a new verification email resets the budget', async () => {
            seed(verifyCodes);
            verifyCodes.rows.get(user.id)!.attempts = 5;

            await service.sendVerificationEmail(user.id);

            expect(verifyCodes.rows.get(user.id)?.attempts).toBe(0);
        });
    });

    describe('change password (reset code of a signed-in user)', () => {
        it('deletes the code on the 5th wrong guess', async () => {
            seed(resetCodes);

            for (let i = 0; i < 5; i++) {
                await service.changePassword(user.id, '000000', 'old', 'NewPassw0rd!').catch(() => undefined);
            }

            expect(resetCodes.rows.has(user.id)).toBe(false);
            expect(rotatePassword).not.toHaveBeenCalled();
        });

        it('a new change-password code resets the budget', async () => {
            seed(resetCodes);
            resetCodes.rows.get(user.id)!.attempts = 3;

            await service.sendCodeToChangePassword(user.id);

            expect(resetCodes.rows.get(user.id)?.attempts).toBe(0);
        });
    });

    describe('issuing codes is limited per account (F-03)', () => {
        const limited = () =>
            new HttpException({ statusCode: 429, code: 'CODE_RATE_LIMITED', message: 'thử lại sau 60 giây' }, 429);
        const unavailable = () => new ServiceUnavailableException({ statusCode: 503, code: 'SERVICE_UNAVAILABLE' });

        it('verify: claims a slot for the account and issues nothing when the limiter refuses (429 stays 429)', async () => {
            await service.sendVerificationEmail(user.id).catch(() => undefined);
            expect(limiter.claim).toHaveBeenCalledWith('verify', user.id);

            verifyCodes.upsert.mockClear();
            limiter.claim.mockRejectedValue(limited());
            const error = await service.sendVerificationEmail(user.id).catch((e) => e);

            expect(error).toBeInstanceOf(HttpException);
            expect(error.getStatus()).toBe(429);
            expect(verifyCodes.upsert).not.toHaveBeenCalled();
        });

        it('reset: is keyed by the normalised e-mail, also for an unknown one (no account enumeration)', async () => {
            userRepository.findByEmail.mockResolvedValue(null);

            await service.sendCodeToResetPassword('  Bob@Example.com ');

            expect(limiter.claim).toHaveBeenCalledWith('reset', 'bob@example.com', { overCap: 'resend' });
        });

        it('reset: a refused claim answers 429 and issues no code', async () => {
            limiter.claim.mockRejectedValue(limited());

            const error = await service.sendCodeToResetPassword(user.email).catch((e) => e);

            expect(error.getStatus?.()).toBe(429);
            expect(resetCodes.upsert).not.toHaveBeenCalled();
        });

        it('reset past the hourly cap re-sends the CURRENT code: same code, attempts kept, lifetime extended', async () => {
            seed(resetCodes, '654321', new Date(Date.now() + 1000));
            resetCodes.rows.get(user.id)!.attempts = 3;
            limiter.claim.mockResolvedValue('resend');

            await expect(service.sendCodeToResetPassword(user.email)).resolves.toEqual({
                message: 'Email đặt lại mật khẩu đã được gửi',
            });

            const row = resetCodes.rows.get(user.id)!;
            expect(row.code).toBe('654321');
            expect(row.attempts).toBe(3); // no fresh guess budget for whoever hit the cap
            expect(row.expiresAt.getTime()).toBeGreaterThan(Date.now() + 9 * 60 * 1000);
            expect(resetCodes.upsert).not.toHaveBeenCalled();
            expect(mail.sendMail).toHaveBeenCalledWith(
                user.email,
                expect.any(String),
                'reset-password.template',
                expect.objectContaining({ resetCode: '654321' })
            );
        });

        it('reset past the cap with no live code issues nothing, yet answers like every other reset (no enumeration)', async () => {
            limiter.claim.mockResolvedValue('resend');

            const known = await service.sendCodeToResetPassword(user.email);
            userRepository.findByEmail.mockResolvedValueOnce(null);
            const unknown = await service.sendCodeToResetPassword('nobody@example.com');

            expect(known).toEqual(unknown);
            expect(resetCodes.upsert).not.toHaveBeenCalled();
            expect(mail.sendMail).not.toHaveBeenCalled();
        });

        it('change password: claims its own kind and refuses with 503 when the limiter is down', async () => {
            await service.sendCodeToChangePassword(user.id).catch(() => undefined);
            expect(limiter.claim).toHaveBeenCalledWith('change', user.id);

            resetCodes.upsert.mockClear();
            limiter.claim.mockRejectedValue(unavailable());
            const error = await service.sendCodeToChangePassword(user.id).catch((e) => e);

            expect(error).toBeInstanceOf(ServiceUnavailableException);
            expect(resetCodes.upsert).not.toHaveBeenCalled();
        });
    });

    describe('a parallel guess must not turn a correct last guess into a 500 (F-11)', () => {
        /** After the claim of the 5th attempt, a parallel guess that saw "exhausted" removes the row. */
        const deleteRowAfterClaim = (t: ReturnType<typeof table>) => {
            const claim = t.updateMany.getMockImplementation()!;
            t.updateMany.mockImplementation(async (args) => {
                const result = await claim(args);
                t.rows.delete(user.id);
                return result;
            });
        };

        it('verify: the correct 5th guess still verifies when the row vanishes mid-flight', async () => {
            seed(verifyCodes);
            verifyCodes.rows.get(user.id)!.attempts = 4;
            deleteRowAfterClaim(verifyCodes);

            await expect(service.verifyAccount(user.id, '123456', 'sid')).resolves.toMatchObject({ token: 'jwt' });
        });

        it('verify: dropping the code after success tolerates a row that is already gone', async () => {
            seed(verifyCodes);
            userRepository.update.mockImplementation(async () => verifyCodes.rows.delete(user.id));

            await expect(service.verifyAccount(user.id, '123456', 'sid')).resolves.toMatchObject({ token: 'jwt' });
        });

        it('reset: the correct 5th guess still resets the password when the row vanishes mid-flight', async () => {
            seed(resetCodes);
            resetCodes.rows.get(user.id)!.attempts = 4;
            deleteRowAfterClaim(resetCodes);

            await expect(service.resetPassword(user.email, '123456', 'NewPassw0rd!')).resolves.toHaveProperty('message');
            expect(rotatePassword).toHaveBeenCalledTimes(1);
        });

        it('change password: the correct 5th guess still succeeds when the row vanishes mid-flight', async () => {
            seed(resetCodes);
            resetCodes.rows.get(user.id)!.attempts = 4;
            deleteRowAfterClaim(resetCodes);

            await expect(service.changePassword(user.id, '123456', 'old', 'NewPassw0rd!')).resolves.toHaveProperty(
                'message'
            );
        });

        it('rotatePassword removes the code with a delete that tolerates a missing row', async () => {
            rotatePassword.mockRestore();
            seed(resetCodes);
            resetCodes.rows.delete(user.id);

            await expect((service as any).rotatePassword(user, 'NewPassw0rd!')).resolves.toBeUndefined();
        });
    });
});
