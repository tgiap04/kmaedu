import 'reflect-metadata';
import { PIPES_METADATA } from '@nestjs/common/constants';
import { ZodValidationPipe } from 'nestjs-zod';
import { AuthController } from '../auth.controller';
import { RegisterSchema } from './register.dto';
import { ChangePasswordDto, ChangePasswordSchema, ResetPasswordDto, ResetPasswordSchema } from './password.dto';

const x = (n: number) => 'x'.repeat(n);
const reset = (newPassword: unknown) => ({ email: 'a@b.co', code: '123456', newPassword });
const change = (newPassword: unknown, currentPassword: unknown = 'old-pass') => ({ code: '123456', currentPassword, newPassword });

describe('new password rules (reset / change) match registration', () => {
    it('reset-password rejects a short, empty, too long or missing new password', () => {
        for (const bad of ['a', '', x(7), x(101), undefined, 12345678]) {
            expect(ResetPasswordSchema.safeParse(reset(bad)).success).toBe(false);
        }
        expect(ResetPasswordSchema.safeParse(reset(x(8))).success).toBe(true);
        expect(ResetPasswordSchema.safeParse(reset(x(100))).success).toBe(true);
    });

    it('reset-password still needs an email and a code', () => {
        expect(ResetPasswordSchema.safeParse({ code: '1', newPassword: x(8) }).success).toBe(false);
        expect(ResetPasswordSchema.safeParse({ email: 'a@b.co', code: '', newPassword: x(8) }).success).toBe(false);
    });

    it('change-password checks the new password but lets an old short current password through', () => {
        expect(ChangePasswordSchema.safeParse(change(x(7))).success).toBe(false);
        expect(ChangePasswordSchema.safeParse(change(x(8), 'abc123')).success).toBe(true);
        expect(ChangePasswordSchema.safeParse(change(x(8), '')).success).toBe(false);
    });

    it('uses the same limits as registration', () => {
        const reg = (password: string) => RegisterSchema.safeParse({ username: 'abc', email: 'a@b.co', password }).success;
        for (const n of [7, 8, 100, 101]) {
            expect(ResetPasswordSchema.safeParse(reset(x(n))).success).toBe(reg(x(n)));
        }
    });

    it('caps email, code and current password so a huge body is refused before any lookup', () => {
        const email = `${x(245)}@b.co`;
        expect(ResetPasswordSchema.safeParse({ ...reset(x(8)), email }).success).toBe(true);
        expect(ResetPasswordSchema.safeParse({ ...reset(x(8)), email: `${x(250)}@b.co` }).success).toBe(false);
        expect(ResetPasswordSchema.safeParse({ ...reset(x(8)), code: x(16) }).success).toBe(true);
        expect(ResetPasswordSchema.safeParse({ ...reset(x(8)), code: x(17) }).success).toBe(false);
        expect(ChangePasswordSchema.safeParse({ ...change(x(8)), code: x(17) }).success).toBe(false);
        // Older passwords may be longer than today's 100 limit: the current one keeps a generous cap.
        expect(ChangePasswordSchema.safeParse(change(x(8), x(200))).success).toBe(true);
        expect(ChangePasswordSchema.safeParse(change(x(8), x(201))).success).toBe(false);
    });

    it('a body sent by older clients with extra keys is still accepted (unknown keys are dropped)', () => {
        const parsed = ResetPasswordSchema.parse({ ...reset(x(8)), confirmPassword: x(8) });
        expect(parsed).toEqual(reset(x(8)));
    });

    it('the pipe turns a short password into a 400 for the controller', () => {
        const pipe = new ZodValidationPipe();
        const status = (fn: () => unknown) => {
            try {
                fn();
            } catch (error) {
                return (error as { getStatus: () => number }).getStatus();
            }
            return 'accepted';
        };
        expect(status(() => pipe.transform(reset('a'), { type: 'body', metatype: ResetPasswordDto }))).toBe(400);
        expect(status(() => pipe.transform(change('a'), { type: 'body', metatype: ChangePasswordDto }))).toBe(400);
        expect(status(() => pipe.transform(reset(x(8)), { type: 'body', metatype: ResetPasswordDto }))).toBe('accepted');
    });

    it('both endpoints validate their body with these DTOs', () => {
        for (const [method, dto] of [['resetPassword', ResetPasswordDto], ['changePassword', ChangePasswordDto]] as const) {
            const handler = AuthController.prototype[method];
            const pipes: unknown[] = Reflect.getMetadata(PIPES_METADATA, handler) ?? [];
            const types: unknown[] = Reflect.getMetadata('design:paramtypes', AuthController.prototype, method) ?? [];
            expect(pipes).toContain(ZodValidationPipe);
            expect(types).toContain(dto);
        }
    });
});
