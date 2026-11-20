import { Injectable } from '@nestjs/common';
import { Prisma, User } from '../prisma';
import { caseInsensitiveEquals } from './case-insensitive-equals';
import { PrismaService } from '../prisma';
import { RedisService, EXPIRED_TIME } from '@kmaedu/redis';

@Injectable()
export class UserRepository {
    protected modelName = 'user';
    protected cachePrefix = 'user';
    protected defaultCacheTTL = EXPIRED_TIME.FIVE_MINUTES;

    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService
    ) {}

    private get model() {
        return this.prisma.user;
    }

    private getCacheKey(suffix: string): string {
        return `${this.cachePrefix}:${suffix}`;
    }

    /**
     * Tìm user theo email với cache (không phân biệt hoa thường)
     */
    async findByEmail(
        email: string,
        cache = true,
        cacheTTL = this.defaultCacheTTL
    ): Promise<User | null> {
        return this.findByIdentity('email', email, cache, cacheTTL);
    }

    /**
     * Tìm user theo username với cache (không phân biệt hoa thường)
     */
    async findByUsername(
        username: string,
        cache = true,
        cacheTTL = this.defaultCacheTTL
    ): Promise<User | null> {
        return this.findByIdentity('username', username, cache, cacheTTL);
    }

    /**
     * Tìm user theo email hoặc username (cho login), không phân biệt hoa
     * thường: tài khoản cũ có email/username chữ hoa vẫn đăng nhập được.
     * Khớp chính xác trước (dùng unique index, và chọn đúng dòng khi hai
     * username chỉ khác hoa thường cùng tồn tại), rồi mới ILIKE.
     */
    async findByCredential(credential: string): Promise<User | null> {
        const exact = await this.model.findFirst({
            where: {
                OR: [
                    { email: credential.toLowerCase() },
                    { username: credential },
                ],
            },
        });
        if (exact) return exact;

        const insensitive = caseInsensitiveEquals(credential);
        return this.model.findFirst({
            where: { OR: [{ email: insensitive }, { username: insensitive }] },
            orderBy: { createdAt: 'asc' },
        });
    }

    /**
     * Exact unique-index hit first (emails are stored lower-cased since
     * signup normalises them), then a case-insensitive match for legacy
     * mixed-case rows (oldest row wins).
     */
    private async findByIdentity(
        field: 'email' | 'username',
        value: string,
        cache: boolean,
        cacheTTL: number
    ): Promise<User | null> {
        const cacheKey = this.getCacheKey(`${field}:${value.toLowerCase()}`);
        if (cache) {
            const cached = await this.redis.get<User>(cacheKey);
            if (cached) return cached;
        }

        const exact: Prisma.UserWhereUniqueInput =
            field === 'email' ? { email: value.toLowerCase() } : { username: value };
        const user =
            (await this.model.findUnique({ where: exact })) ??
            (await this.model.findFirst({
                where: { [field]: caseInsensitiveEquals(value) },
                orderBy: { createdAt: 'asc' },
            }));

        if (cache && user) {
            await this.redis.set(cacheKey, user, cacheTTL);
        }
        return user;
    }

    /**
     * Tìm user theo ID với relations
     */
    async findByIdWithRelations(
        id: string,
        relations: string[] = [],
        cache = true,
        cacheTTL = this.defaultCacheTTL
    ): Promise<User | null> {
        const include: any = {};
        relations.forEach((rel) => {
            include[rel] = true;
        });

        const relationKey =
            relations.length > 0
                ? `:relations:${relations.sort().join(',')}`
                : '';
        const cacheKey = this.getCacheKey(`id:${id}${relationKey}`);

        if (cache) {
            const cached = await this.redis.get<User>(cacheKey);
            if (cached) return cached;

            const user = await this.model.findUnique({
                where: { id },
                include,
            });

            if (user) {
                await this.redis.set(cacheKey, user, cacheTTL);
            }
            return user;
        }

        return this.model.findUnique({
            where: { id },
            include,
        });
    }

    /**
     * Create user
     */
    async create(data: any): Promise<User> {
        const user = await this.model.create({ data });
        return user;
    }

    /**
     * Update user và invalidate cache
     */
    async update(id: string, data: any, userId?: string): Promise<User> {
        const result = await this.model.update({
            where: { id },
            data,
        });

        await this.invalidateCaches(result);

        return result;
    }

    /** Drops every cached view of a user (by id, email and username). */
    async invalidateCaches(user: {
        id: string;
        email: string;
        username: string;
    }): Promise<void> {
        await this.redis.delPattern(`${this.cachePrefix}:*${user.id}*`);
        await this.redis.del(
            this.getCacheKey(`email:${user.email.toLowerCase()}`)
        );
        await this.redis.del(
            this.getCacheKey(`username:${user.username.toLowerCase()}`)
        );
    }

    /**
     * Check email exists
     */
    async emailExists(email: string): Promise<boolean> {
        const user = await this.findByEmail(email, true);
        return !!user;
    }

    /**
     * Check username exists
     */
    async usernameExists(username: string): Promise<boolean> {
        const user = await this.findByUsername(username, true);
        return !!user;
    }
}
