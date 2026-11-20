import {
    Injectable,
    ConflictException,
    NotFoundException,
    InternalServerErrorException,
    BadRequestException,
    UnauthorizedException,
    Inject,
    OnModuleInit,
} from '@nestjs/common';
import { Prisma, User } from './prisma';

// Shared libs imports
import { PrismaService } from './prisma';
import {
    MailService,
    PasswordService,
    GenerateIdService,
    RefreshTokenCipherService,
} from '@kmaedu/common';
import { OutboxService } from '@kmaedu/messaging';
import { sanitizeUser } from './utils/sanitize-user';
import { permissionsOf, type Permission, type Role } from '@kmaedu/auth-jwt';
import type { UserRegistered } from '@kmaedu/contracts/generated/kmaedu/events/v1/auth_events';

// Local imports
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { sanitizeUtmSource } from './utils/utm-source.util';
import { uniqueViolationFields } from './utils/prisma-unique-violation';
import { writeWithFreshCode } from './utils/write-with-fresh-code';
import { consumeCodeAttempt, MAX_WRONG_CODE_GUESSES, type CodeStore } from './utils/one-time-code-attempt';
import { CodeIssueLimiter } from './utils/code-issue-limiter';
import { availableUsername } from './utils/available-username';
import { UserRepository } from './repositories/user.repository';
import { UserSessionRepository } from './devices/repositories/user-session.repository';
import {
    AccessTokenService,
    AccountDisabledException,
} from './token/access-token.service';
import { GatewayControlClient, sessionRevokeExp } from './clients/gateway-control.client';
import { SessionRevoker } from './devices/session-revoker.service';
import { AuthzChangedPublisher } from './roles/authz-changed.publisher';

/** Result of an OAuth login; without device info no session (and no token) exists yet. */
export interface OAuthLoginResult {
    token?: string;
    user: ReturnType<typeof sanitizeUser>;
    roles?: Role[];
    permissions?: Permission[];
    success: boolean;
    sessionId?: string;
    refreshToken?: string;
    deviceId?: string;
}

export interface DeviceInfo {
    deviceId: string;
    userAgent?: string;
    ipAddress?: string;
}

@Injectable()
export class AuthService {
    private readonly sessionTtlMs = 30 * 24 * 60 * 60 * 1000;

    constructor(
        private readonly prisma: PrismaService,
        private readonly userRepository: UserRepository,
        private readonly userSessionRepository: UserSessionRepository,
        private readonly accessTokens: AccessTokenService,
        private readonly mailService: MailService,
        private readonly passwordService: PasswordService,
        private readonly generateIdService: GenerateIdService,
        private readonly outbox: OutboxService,
        private readonly refreshTokenCipher: RefreshTokenCipherService,
        private readonly authzPublisher: AuthzChangedPublisher,
        private readonly gatewayControl: GatewayControlClient,
        private readonly sessionRevoker: SessionRevoker,
        private readonly codeIssueLimiter: CodeIssueLimiter
    ) {}

    /**
     * Issues the RS256 access token for an existing session (roles + `av` read
     * under `FOR SHARE`, see AccessTokenService). A banned/deleted account is
     * rejected with 401 ACCOUNT_DISABLED and the session it came with is
     * deactivated, so the refresh token cannot be replayed.
     */
    async issueAccess(
        userId: string,
        sessionId: string,
        include?: Prisma.UserInclude
    ): Promise<{ token: string; user: User; roles: Role[]; permissions: Permission[] }> {
        try {
            return await this.accessTokens.issue(userId, sessionId, include);
        } catch (error) {
            if (error instanceof AccountDisabledException) {
                await this.deactivateBySessionId(sessionId);
            }
            throw error;
        }
    }

    private async deactivateBySessionId(sessionId: string): Promise<void> {
        try {
            const session = await this.userSessionRepository.findBySessionId(sessionId);
            if (session) await this.userSessionRepository.deactivateSession(session.id);
        } catch (error) {
            console.error('Error deactivating session of a disabled account:', error);
        }
    }

    /** The user's row of one code table, for `consumeCodeAttempt` (both tables share their columns). */
    private codeStore(
        table: 'verifyAccountCode' | 'resetPasswordCode',
        userId: string
    ): CodeStore {
        const delegate = this.prisma[table] as unknown as Prisma.ResetPasswordCodeDelegate;
        return {
            find: () => delegate.findUnique({ where: { userId } }),
            claimAttempt: async (max, now, code) =>
                (
                    await delegate.updateMany({
                        where: { userId, code, attempts: { lt: max }, expiresAt: { gt: now } },
                        data: { attempts: { increment: 1 } },
                    })
                ).count,
            deleteIfExhausted: async (max, code) => {
                await delegate.deleteMany({ where: { userId, code, attempts: { gte: max } } });
            },
        };
    }

    async login(loginDto: LoginDto, deviceInfo: DeviceInfo) {
        const { credential, password } = loginDto;
        if (!credential || !password) {
            throw new BadRequestException('Thông tin đăng nhập không hợp lệ');
        }
        try {
            const user = await this.userRepository.findByCredential(credential);
            if (!user) {
                // Same error as a wrong password — do not reveal whether the
                // account exists (prevents user enumeration).
                throw new UnauthorizedException(
                    'Thông tin đăng nhập không hợp lệ'
                );
            }
            const isPasswordValid = await this.passwordService.comparePasswords(
                password,
                user.password || ''
            );
            if (!isPasswordValid) {
                throw new UnauthorizedException(
                    'Thông tin đăng nhập không hợp lệ'
                );
            }
            return await this.startSession(user.id, deviceInfo);
        } catch (error) {
            if (
                error instanceof NotFoundException ||
                error instanceof BadRequestException ||
                error instanceof UnauthorizedException
            ) {
                throw error;
            }
            throw new InternalServerErrorException(
                'Đăng nhập không thành công'
            );
        }
    }

    /** Payload of `auth.user.registered` (proto `kmaedu.events.v1.UserRegistered`). */
    private userRegisteredData(
        user: User
    ): Omit<UserRegistered, 'utmSource'> & { utmSource: string | null } {
        return {
            userId: user.id,
            email: user.email,
            username: user.username,
            utmSource: user.utmSource ?? null,
        };
    }

    async register(registerDto: RegisterDto, deviceInfo: DeviceInfo) {
        const { username, password } = registerDto;
        // Stored lower-cased: lookups (login, reset, duplicate check) ignore case.
        const email = registerDto.email?.trim().toLowerCase();
        const utmSource = sanitizeUtmSource(registerDto.utmSource);
        if (!username || !email || !password) {
            throw new BadRequestException('Thông tin đăng ký không hợp lệ');
        }

        try {
            const [emailExists, usernameExists] = await Promise.all([
                this.userRepository.emailExists(email),
                this.userRepository.usernameExists(username),
            ]);

            if (emailExists) {
                throw new ConflictException('Email đã được sử dụng');
            }

            if (usernameExists) {
                throw new ConflictException('Username đã được sử dụng');
            }

            const hashedPassword =
                await this.passwordService.hashPassword(password);

            const newUser = await this.prisma.$transaction(async (tx) => {
                const user = await tx.user.create({
                    data: {
                        id: this.generateIdService.generateId(),
                        username,
                        email,
                        password: hashedPassword,
                        utmSource,
                    },
                });

                // STUDENT by DB default.
                await this.outbox.add(
                    tx,
                    'auth.user.registered',
                    this.userRegisteredData(user)
                );

                return user;
            });

            // Send welcome email
            this.mailService
                .sendMail(
                    email,
                    'Chào mừng bạn đến với KMAEdu',
                    'welcome.template',
                    {
                        username: newUser.username,
                        useremail: newUser.email,
                        loginUrl: `${process.env.FRONTEND_URL}/login`,
                    }
                )
                .catch((error) => {
                    console.error(
                        `Failed to send welcome email to ${email}:`,
                        error
                    );
                });

            // Auto-login: the session exists first so the token carries its sid.
            return {
                message: 'Đăng ký thành công',
                ...(await this.startSession(newUser.id, deviceInfo)),
            };
        } catch (error) {
            if (error instanceof ConflictException) {
                throw error;
            }
            // A concurrent signup won the unique index after our pre-check.
            const taken = uniqueViolationFields(error);
            if (taken?.includes('email')) {
                throw new ConflictException('Email đã được sử dụng');
            }
            if (taken?.includes('username')) {
                throw new ConflictException('Username đã được sử dụng');
            }
            console.log(error.message);
            throw new InternalServerErrorException('Đăng ký không thành công');
        }
    }

    /** Loads the full account of a token principal (claims carry only id/roles/sid). */
    private async loadUser(userId: string): Promise<User> {
        const user = await this.userRepository.findByIdWithRelations(
            userId,
            [],
            false
        );
        if (!user) throw new NotFoundException('Người dùng không tồn tại');
        return user;
    }

    async sendVerificationEmail(userId: string) {
        // Outside the try: a 429/503 from the limiter must reach the client as is, not become a 500.
        await this.codeIssueLimiter.claim('verify', userId);
        try {
            const user = await this.loadUser(userId);
            if (user.isVerified) {
                return { message: 'Tài khoản đã được xác minh' };
            }

            const code = await writeWithFreshCode((code) =>
                this.prisma.verifyAccountCode.upsert({
                    where: { userId: user.id },
                    update: {
                        code,
                        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                        attempts: 0,
                    },
                    create: {
                        id: this.generateIdService.generateId(),
                        userId: user.id,
                        code,
                        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                    },
                })
            );

            this.mailService
                .sendMail(
                    user.email,
                    'Xác minh tài khoản của bạn',
                    'verify-account.template',
                    {
                        username: user.username,
                        verificationCode: code,
                    }
                )
                .catch((error) => {
                    console.error(
                        `Failed to send verification email to ${user.email}:`,
                        error
                    );
                });

            return { message: 'Email xác minh đã được gửi' };
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            console.log(error.message);
            throw new InternalServerErrorException(
                'Gửi email không thành công'
            );
        }
    }

    /**
     * Verifies the email, then re-issues the access token for the SAME session
     * with `email_verified=true` (the old token still says false).
     */
    async verifyAccount(userId: string, code: string, sessionId: string) {
        try {
            await consumeCodeAttempt(
                this.codeStore('verifyAccountCode', userId),
                code,
                {
                    invalid: 'Mã xác minh không hợp lệ',
                    wrong: 'Mã xác minh không chính xác',
                    expired: 'Mã xác minh đã hết hạn',
                }
            );

            await this.userRepository.update(
                userId,
                { isVerified: true },
                userId
            );

            // deleteMany: a parallel guess may already have removed the used-up row.
            await this.prisma.verifyAccountCode.deleteMany({
                where: { userId },
            });

            const { token } = await this.issueAccess(userId, sessionId);
            return { message: 'Tài khoản đã được xác minh thành công', token };
        } catch (error) {
            if (
                error instanceof NotFoundException ||
                error instanceof BadRequestException
            ) {
                throw error;
            }
            throw new InternalServerErrorException(
                'Xác minh tài khoản không thành công'
            );
        }
    }

    async sendCodeToResetPassword(email: string) {
        // Always return the same response regardless of whether the email
        // is registered — revealing account existence enables enumeration.
        const genericResponse = {
            message: 'Email đặt lại mật khẩu đã được gửi',
        };
        // Keyed by e-mail and taken before the lookup: an unknown e-mail is limited the same way. Past the
        // hourly cap (which anyone can spend for someone else's address) the owner still gets the code that is
        // already live, never a fresh one: a fresh code would hand out a new guess budget.
        const mode = await this.codeIssueLimiter.claim('reset', String(email ?? '').trim().toLowerCase(), {
            overCap: 'resend',
        });
        try {
            const user = await this.userRepository.findByEmail(email, false);

            if (!user) {
                return genericResponse;
            }

            const code =
                mode === 'resend'
                    ? await this.extendLiveResetCode(user.id)
                    : await this.issueFreshResetCode(user.id);
            if (!code) {
                // Cap reached and no live code (spent by wrong guesses): nothing is sent, same answer.
                return genericResponse;
            }

            this.mailService
                .sendMail(
                    user.email,
                    'Yêu cầu đặt lại mật khẩu',
                    'reset-password.template',
                    {
                        username: user.username,
                        resetCode: code,
                    }
                )
                .catch((error) => {
                    console.error(
                        `Failed to send reset password email to ${user.email}:`,
                        error
                    );
                });

            return genericResponse;
        } catch (error) {
            console.log(error.message);
            throw new InternalServerErrorException(
                'Gửi email đặt lại mật khẩu không thành công'
            );
        }
    }

    /** A new reset code (fresh guess budget, 10 minutes). */
    private issueFreshResetCode(userId: string): Promise<string> {
        return writeWithFreshCode((code) =>
            this.prisma.resetPasswordCode.upsert({
                where: { userId },
                update: {
                    code,
                    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                    attempts: 0,
                },
                create: {
                    id: this.generateIdService.generateId(),
                    userId,
                    code,
                    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                },
            })
        );
    }

    /**
     * The reset code that is live for `userId`, given 10 more minutes. Its code and its spent guesses stay as
     * they are, so re-sending it hands nobody new guesses. `null` when there is none (or it is used up).
     */
    private async extendLiveResetCode(userId: string): Promise<string | null> {
        const current = await this.prisma.resetPasswordCode.findUnique({ where: { userId } });
        if (!current || current.attempts >= MAX_WRONG_CODE_GUESSES) return null;
        const { count } = await this.prisma.resetPasswordCode.updateMany({
            where: { userId, code: current.code, attempts: { lt: MAX_WRONG_CODE_GUESSES } },
            data: { expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
        });
        return count === 1 ? current.code : null;
    }

    async resetPassword(email: string, code: string, newPassword: string) {
        try {
            const user = await this.userRepository.findByEmail(email, false);
            const invalidCode = 'Mã đặt lại mật khẩu không hợp lệ';

            // An unknown e-mail answers like a known account with no pending code: no account enumeration.
            if (!user) {
                throw new NotFoundException(invalidCode);
            }

            await consumeCodeAttempt(
                this.codeStore('resetPasswordCode', user.id),
                code,
                {
                    invalid: invalidCode,
                    wrong: 'Mã đặt lại mật khẩu không chính xác',
                    expired: 'Mã đặt lại mật khẩu đã hết hạn',
                }
            );

            await this.rotatePassword(user, newPassword);

            // Invalidate all existing sessions so a session hijacked before
            // the reset cannot survive the credential rotation.
            await this.sessionRevoker.revokeAll(user.id);

            return { message: 'Mật khẩu đã được đặt lại thành công' };
        } catch (error) {
            if (
                error instanceof NotFoundException ||
                error instanceof BadRequestException
            ) {
                throw error;
            }
            throw new InternalServerErrorException(
                'Đặt lại mật khẩu không thành công'
            );
        }
    }

    async sendCodeToChangePassword(userId: string) {
        await this.codeIssueLimiter.claim('change', userId);
        try {
            const user = await this.loadUser(userId);
            const code = await writeWithFreshCode((code) =>
                this.prisma.resetPasswordCode.upsert({
                    where: { userId: user.id },
                    update: {
                        code,
                        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                        attempts: 0,
                    },
                    create: {
                        id: this.generateIdService.generateId(),
                        userId: user.id,
                        code,
                        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                    },
                })
            );

            this.mailService
                .sendMail(
                    user.email,
                    'Xác minh đổi mật khẩu',
                    'change-password.template',
                    {
                        username: user.username,
                        changeCode: code,
                    }
                )
                .catch((error) => {
                    console.error(
                        `Failed to send change password email to ${user.email}:`,
                        error
                    );
                });

            return { message: 'Mã xác minh đã được gửi đến email của bạn' };
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            console.log(error.message);
            throw new InternalServerErrorException(
                'Gửi mã xác minh không thành công'
            );
        }
    }

    async changePassword(
        userId: string,
        code: string,
        currentPassword: string,
        newPassword: string
    ) {
        try {
            const user = await this.loadUser(userId);
            if (user.password) {
                const isPasswordValid =
                    await this.passwordService.comparePasswords(
                        currentPassword,
                        user.password
                    );
                if (!isPasswordValid) {
                    throw new BadRequestException(
                        'Mật khẩu hiện tại không đúng'
                    );
                }
            }

            await consumeCodeAttempt(
                this.codeStore('resetPasswordCode', user.id),
                code,
                {
                    invalid: 'Mã xác minh không hợp lệ',
                    wrong: 'Mã xác minh không chính xác',
                    expired: 'Mã xác minh đã hết hạn',
                }
            );

            await this.rotatePassword(user, newPassword);

            // Invalidate all existing sessions so a session hijacked before
            // the change cannot survive the credential rotation.
            await this.sessionRevoker.revokeAll(user.id);

            return { message: 'Mật khẩu đã được đổi thành công' };
        } catch (error) {
            if (
                error instanceof NotFoundException ||
                error instanceof BadRequestException
            ) {
                throw error;
            }
            throw new InternalServerErrorException(
                'Đổi mật khẩu không thành công'
            );
        }
    }

    /**
     * Password update + reset-code delete + `authzVersion` bump + outbox
     * `authz_changed(reason:'password')` in ONE transaction, so every token
     * signed before the change is detectably stale.
     */
    private async rotatePassword(user: User, newPassword: string): Promise<void> {
        const password = await this.passwordService.hashPassword(newPassword);
        const authzVersion = await this.prisma.$transaction(async (tx) => {
            const updated = await tx.user.update({
                where: { id: user.id },
                data: {
                    password,
                    authzVersion: { increment: 1 },
                    updatedBy: user.id,
                },
                select: {
                    id: true,
                    authzVersion: true,
                    role: true,
                    isSystemAdmin: true,
                    isBanned: true,
                },
            });
            // deleteMany: the row may already be gone (a parallel guess removed the used-up code).
            await tx.resetPasswordCode.deleteMany({ where: { userId: user.id } });
            await this.authzPublisher.publish(tx, updated, 'password');
            return updated.authzVersion;
        });
        await this.userRepository.invalidateCaches(user);
        // Fast path; the committed authz_changed(reason:'password') event is the durable one.
        await this.gatewayControl.invalidateUser(user.id, authzVersion);
    }

    private async handleOAuthLogin(
        email: string,
        username: string,
        deviceInfo?: DeviceInfo,
        utmSource?: string | null
    ): Promise<OAuthLoginResult> {
        let existingUser = await this.userRepository.findByEmail(email, false);

        if (!existingUser) {
            // The derived name (Google display name / e-mail local part) may
            // already belong to someone: User.username is unique.
            const freeUsername = await availableUsername(username, (name) =>
                this.userRepository.usernameExists(name)
            );
            existingUser = await this.prisma.$transaction(async (tx) => {
                const user = await tx.user.create({
                    data: {
                        id: this.generateIdService.generateId(),
                        email: email.toLowerCase(),
                        username: freeUsername,
                        isVerified: true,
                        password: null,
                        // Chỉ gắn nguồn khi TẠO user mới (first-touch); đăng nhập lại không đụng.
                        utmSource: sanitizeUtmSource(utmSource),
                    },
                });

                await this.outbox.add(
                    tx,
                    'auth.user.registered',
                    this.userRegisteredData(user)
                );

                return user;
            });
        } else if (!existingUser.isVerified) {
            existingUser = await this.adoptUnverifiedAccount(existingUser);
        }

        // The access token needs a session id. Without deviceInfo (the
        // passport Google strategy) the controller creates the session and
        // calls issueAccess() itself.
        if (!deviceInfo) {
            return { user: sanitizeUser(existingUser), success: true };
        }
        return this.startSession(existingUser.id, deviceInfo);
    }

    /**
     * Google just proved the mailbox of an account nobody verified. Whoever registered it with a password may
     * not own the address (account pre-hijacking), so in ONE transaction, and only while it is still unverified:
     * mark it verified, drop that password and any pending verify/reset code, bump `authzVersion` + publish
     * `authz_changed`, and revoke every session (durable events). A crash after commit cannot leave the
     * registrant's sessions alive; the gateway fast paths run after commit.
     */
    private async adoptUnverifiedAccount(user: User): Promise<User> {
        const result = await this.prisma.$transaction(async (tx) => {
            const { count } = await tx.user.updateMany({
                where: { id: user.id, isVerified: false },
                data: {
                    isVerified: true,
                    password: null,
                    authzVersion: { increment: 1 },
                    updatedBy: user.id,
                },
            });
            const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
            // Verified meanwhile (the mailbox owner entered their code): nothing to take over.
            if (count === 0) return { adopted: current, changed: false, revoked: [] };
            await tx.verifyAccountCode.deleteMany({ where: { userId: user.id } });
            await tx.resetPasswordCode.deleteMany({ where: { userId: user.id } });
            await this.authzPublisher.publish(tx, current, 'password');
            const revoked = await this.sessionRevoker.revokeAllInTx(tx, user.id);
            return { adopted: current, changed: true, revoked };
        });
        if (result.changed) {
            await this.userRepository.invalidateCaches(user);
            await this.gatewayControl.invalidateUser(user.id, result.adopted.authzVersion);
            await this.sessionRevoker.pushRevoked(result.revoked);
            // A password was dropped: tell the mailbox owner (after commit; best effort, never fails the login).
            if (user.password) this.sendGoogleLinkedNotice(result.adopted);
        }
        return result.adopted;
    }

    private sendGoogleLinkedNotice(user: User): void {
        const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
        this.mailService
            .sendMail(
                user.email,
                'Tài khoản của bạn đã được liên kết với Google',
                'google-account-linked.template',
                {
                    username: user.username,
                    useremail: user.email,
                    resetPasswordUrl: `${frontendUrl}/forgot-password`,
                }
            )
            .catch((error) => {
                console.error(
                    `Failed to send Google link notice to ${user.email}:`,
                    error
                );
            });
    }

    /**
     * Creates the session, then issues the access token for it. Shared by
     * login, register and OAuth; the response carries `roles`/`permissions`
     * next to `user`.
     */
    private async startSession(userId: string, deviceInfo: DeviceInfo) {
        const session = await this.createSession(userId, deviceInfo);
        const issued = await this.issueAccess(userId, session.sessionId);
        return {
            token: issued.token,
            user: sanitizeUser(issued.user),
            roles: issued.roles,
            permissions: issued.permissions,
            success: true,
            sessionId: session.sessionId,
            refreshToken: session.refreshToken,
            deviceId: deviceInfo.deviceId,
        };
    }

    async googleLogin(
        user: any,
        deviceInfo?: DeviceInfo,
        utmSource?: string | null
    ): Promise<OAuthLoginResult> {
        const { email } = user;
        const username = email.split('@')[0];
        return this.handleOAuthLogin(
            email,
            username,
            deviceInfo,
            utmSource
        );
    }

    async googleOneTapLogin(
        credential: string,
        deviceInfo?: DeviceInfo,
        utmSource?: string | null
    ): Promise<OAuthLoginResult> {
        const { OAuth2Client } = await import('google-auth-library');
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        // Only a mailbox Google has verified may sign in (and take over an unverified account with that address).
        if (!payload || !payload.email || payload.email_verified !== true) {
            throw new BadRequestException('Invalid Google credential');
        }
        const { email, name } = payload;
        const username = name || email.split('@')[0];
        return this.handleOAuthLogin(
            email,
            username,
            deviceInfo,
            utmSource
        );
    }


    /** `roles`/`permissions` mirror the verified token, i.e. what the APIs will enforce. */
    async getUser(userId: string, roles: Role[]) {
        // Fresh read: the account only; /auth/me never depends on another service.
        const foundUser = await this.userRepository.findByIdWithRelations(
            userId,
            [],
            false
        );
        if (!foundUser) {
            throw new NotFoundException('Người dùng không tồn tại');
        }
        return {
            user: sanitizeUser(foundUser),
            roles,
            permissions: permissionsOf(roles),
        };
    }

    async logout(sessionId: string): Promise<void> {
        try {
            // Deactivation + auth.session.revoked event in one transaction, then the gRPC fast path.
            await this.sessionRevoker.revokeBySid(sessionId);
        } catch (error) {
            console.error('Error revoking session:', error);
            // Logout must still succeed; the token must still stop working at the edge.
            await this.gatewayControl.revokeSession(sessionId, sessionRevokeExp());
        }
    }

    /**
     * Rotates the refresh token and issues a new access token.
     *
     * Grace window (M-04): a token rotated away less than 60 s ago (another tab of the same browser
     * refreshed first) still gets an access token, but `refreshToken` is undefined: the live refresh token
     * is never handed to whoever presents an old one, and the browser already got the new cookie from the
     * request that rotated. A rotated-out token seen AFTER the window means two parties share the session
     * (theft or a replayed log line): the whole session is revoked.
     *
     * Same device (`X-Device-ID` matches the session): a rotated-out token means the browser lost the
     * response that rotated (reload or network drop mid-refresh). It gets a fresh refresh token instead of
     * an access-only answer or a revocation, so it is not logged out at its next refresh.
     */
    async refreshAccessToken(refreshToken: string, deviceId?: string): Promise<{
        token: string;
        /** Only when this call rotated (or re-issued for the same device); undefined otherwise. */
        refreshToken?: string;
        user: any;
        roles: Role[];
        permissions: Permission[];
    }> {
        const sameDevice = (s: { deviceId?: string | null }) => !!deviceId && s.deviceId === deviceId;

        // Find session by refresh token (current, or previous inside the grace window)
        let session = await this.userSessionRepository.findByRefreshToken(refreshToken);

        if (!session) {
            const rotatedOut = await this.userSessionRepository.findByRotatedOutToken(refreshToken);
            if (!rotatedOut || !sameDevice(rotatedOut)) {
                if (rotatedOut) await this.revokeOnRefreshTokenReuse(refreshToken);
                throw new UnauthorizedException('Invalid or expired refresh token');
            }
            session = rotatedOut;
        }
        if (!session.isActive) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        // Check if session has expired
        if (new Date() > session.expiresAt) {
            await this.userSessionRepository.deactivateSession(session.id);
            throw new UnauthorizedException('Session expired');
        }

        // Reload the account and sign in one FOR SHARE transaction: the token
        // carries the CURRENT role/admin flag/av, and a banned or deleted
        // account is refused (401 ACCOUNT_DISABLED) with its session revoked.
        const { token, user, roles, permissions } = await this.issueAccess(
            session.userId,
            session.sessionId
        );

        let rotation =
            await this.userSessionRepository.rotateRefreshTokenIfCurrent(
                session.sessionId,
                refreshToken,
                this.generateRefreshToken()
            );

        if ((!rotation || !rotation.rotated) && sameDevice(session)) {
            const next = this.generateRefreshToken();
            if (await this.userSessionRepository.reissueForRotatedOutToken(session.sessionId, refreshToken, next)) {
                rotation = { rotated: true, refreshToken: next };
            }
        }

        if (!rotation) {
            throw new UnauthorizedException('Refresh token was already used');
        }

        return {
            token,
            refreshToken: rotation.rotated ? rotation.refreshToken : undefined,
            user: sanitizeUser(user),
            roles,
            permissions,
        };
    }

    /** Reuse detection: a rotated-out token past its grace window revokes its session (event + gateway). */
    private async revokeOnRefreshTokenReuse(refreshToken: string): Promise<void> {
        const reused =
            await this.userSessionRepository.findByRotatedOutToken(refreshToken);
        if (!reused) return;
        console.warn(
            `Refresh token reuse detected on session ${reused.sessionId}; revoking it`
        );
        await this.sessionRevoker.revokeBySid(reused.sessionId);
    }

    /**
     * Confirms the caller's session is live and touches its activity. The refresh token itself is
     * never returned or re-sent: it lives only in the HttpOnly cookie set by login/refresh.
     */
    async syncRefreshTokenBySession(
        userId: string,
        sessionId: string
    ): Promise<{ success: true }> {
        const session = await this.userSessionRepository.findBySessionId(
            sessionId
        );

        if (!session || !session.isActive || session.userId !== userId) {
            throw new UnauthorizedException('Session không hợp lệ');
        }

        if (new Date() > session.expiresAt) {
            await this.userSessionRepository.deactivateSession(session.id);
            throw new UnauthorizedException('Session expired');
        }

        await this.userSessionRepository.updateLastActivity(session.sessionId);
        return { success: true };
    }

    async createSession(
        userId: string,
        deviceInfo: DeviceInfo
    ): Promise<{ sessionId: string; refreshToken: string }> {
        const sessionId = this.generateIdService.generateSecureToken(16);
        const refreshToken = this.generateRefreshToken();
        const { browser, os, deviceName } = this.parseUserAgent(
            deviceInfo.userAgent || ''
        );

        await this.userSessionRepository.create({
            id: this.generateIdService.generateId(),
            userId,
            sessionId,
            refreshToken, // Store refresh token
            deviceId: deviceInfo.deviceId,
            deviceName,
            browser,
            os,
            ipAddress: deviceInfo.ipAddress || null,
            country: null,
            city: null,
            expiresAt: new Date(Date.now() + this.sessionTtlMs),
        });

        return { sessionId, refreshToken };
    }

    private generateRefreshToken(): string {
        return this.generateIdService.generateSecureToken(32);
    }

    private parseUserAgent(userAgent: string): {
        browser: string | null;
        os: string | null;
        deviceName: string | null;
    } {
        if (!userAgent) return { browser: null, os: null, deviceName: null };

        let browser: string | null = null;
        let os: string | null = null;
        let deviceName: string | null = null;

        if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
            const match = userAgent.match(/Chrome\/(\d+)/);
            browser = match ? `Chrome ${match[1]}` : 'Chrome';
        } else if (
            userAgent.includes('Safari') &&
            !userAgent.includes('Chrome')
        ) {
            const match = userAgent.match(/Version\/(\d+)/);
            browser = match ? `Safari ${match[1]}` : 'Safari';
        } else if (userAgent.includes('Firefox')) {
            const match = userAgent.match(/Firefox\/(\d+)/);
            browser = match ? `Firefox ${match[1]}` : 'Firefox';
        } else if (userAgent.includes('Edg')) {
            const match = userAgent.match(/Edg\/(\d+)/);
            browser = match ? `Edge ${match[1]}` : 'Edge';
        }

        if (userAgent.includes('Windows NT 10')) {
            os = 'Windows 10/11';
        } else if (userAgent.includes('Windows')) {
            os = 'Windows';
        } else if (userAgent.includes('Mac OS X')) {
            const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
            os = match ? `macOS ${match[1].replace('_', '.')}` : 'macOS';
        } else if (userAgent.includes('Linux')) {
            os = 'Linux';
        } else if (userAgent.includes('Android')) {
            const match = userAgent.match(/Android (\d+)/);
            os = match ? `Android ${match[1]}` : 'Android';
        } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
            const match = userAgent.match(/OS (\d+)/);
            os = match ? `iOS ${match[1]}` : 'iOS';
        }

        if (userAgent.includes('iPhone')) {
            deviceName = 'iPhone';
        } else if (userAgent.includes('iPad')) {
            deviceName = 'iPad';
        } else if (userAgent.includes('Android')) {
            deviceName = 'Android Device';
        } else if (userAgent.includes('Macintosh')) {
            deviceName = 'Mac';
        } else if (userAgent.includes('Windows')) {
            deviceName = 'PC';
        } else if (userAgent.includes('Linux')) {
            deviceName = 'Linux PC';
        }

        return { browser, os, deviceName };
    }
}
