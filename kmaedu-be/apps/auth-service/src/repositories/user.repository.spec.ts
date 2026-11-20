import { UserRepository } from './user.repository';

type Row = { id: string; email: string; username: string; createdAt: Date };
type Cond = string | { equals: string; mode?: 'insensitive' };

/** Postgres `ILIKE` semantics: `%`/`_` are wildcards unless escaped by `\`. */
const ilike = (value: string, pattern: string): boolean => {
    let re = '';
    for (let i = 0; i < pattern.length; i++) {
        const ch = pattern[i];
        if (ch === '\\' && i + 1 < pattern.length) {
            re += pattern[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        } else if (ch === '%') re += '.*';
        else if (ch === '_') re += '.';
        else re += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    return new RegExp(`^${re}$`, 'is').test(value);
};

const matches = (row: Row, field: 'email' | 'username', cond: Cond) =>
    typeof cond === 'string'
        ? row[field] === cond
        : cond.mode === 'insensitive'
          ? ilike(row[field], cond.equals)
          : row[field] === cond.equals;

/**
 * In-memory stand-in for `prisma.user` that evaluates the where clauses the
 * repository sends, including Prisma's `mode: 'insensitive'` (sent to
 * Postgres as `ILIKE` with the value unescaped).
 */
const fakeUserModel = (rows: Row[]) => {
    const test = (row: Row, where: any): boolean => {
        if (where.OR) return where.OR.some((w: any) => test(row, w));
        return (['email', 'username'] as const).every(
            (f) => where[f] === undefined || matches(row, f, where[f])
        );
    };
    const sorted = (orderBy?: any) =>
        orderBy?.createdAt === 'asc'
            ? [...rows].sort((a, b) => +a.createdAt - +b.createdAt)
            : rows;
    return {
        findUnique: jest.fn(async ({ where }) => rows.find((r) => test(r, where)) ?? null),
        findFirst: jest.fn(
            async ({ where, orderBy }) => sorted(orderBy).find((r) => test(r, where)) ?? null
        ),
    };
};

describe('UserRepository case-insensitive identity lookups', () => {
    const at = (n: number) => new Date(2026, 0, n);
    const redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };

    const repo = (rows: Row[]) =>
        new UserRepository({ user: fakeUserModel(rows) } as never, redis as never);

    const bob = { id: 'u-bob', email: 'Bob@Example.com', username: 'Bob', createdAt: at(1) };

    it('logs in an account whose email was stored with capitals, typed as stored', async () => {
        expect((await repo([bob]).findByCredential('Bob@Example.com'))?.id).toBe('u-bob');
    });

    it('logs in an account whose email was stored with capitals, typed in another case', async () => {
        expect((await repo([bob]).findByCredential('bob@example.com'))?.id).toBe('u-bob');
        expect((await repo([bob]).findByCredential('BOB@EXAMPLE.COM'))?.id).toBe('u-bob');
    });

    it('logs in by a mixed-case username in any case', async () => {
        expect((await repo([bob]).findByCredential('Bob'))?.id).toBe('u-bob');
        expect((await repo([bob]).findByCredential('bOB'))?.id).toBe('u-bob');
    });

    it('prefers the exact row when legacy case variants of one username coexist', async () => {
        const lower = { id: 'u-lower', email: 'l@x.io', username: 'bob', createdAt: at(2) };
        expect((await repo([bob, lower]).findByCredential('bob'))?.id).toBe('u-lower');
        expect((await repo([bob, lower]).findByCredential('Bob'))?.id).toBe('u-bob');
    });

    it('treats LIKE wildcards in the credential literally', async () => {
        const abc = { id: 'u-abc', email: 'abc@x.io', username: 'abc', createdAt: at(1) };
        expect(await repo([abc]).findByCredential('%')).toBeNull();
        expect(await repo([abc]).findByCredential('a_c')).toBeNull();
        expect(await repo([abc]).usernameExists('a%')).toBe(false);
    });

    it('reports a username as taken whatever its case', async () => {
        expect(await repo([bob]).usernameExists('bob')).toBe(true);
        expect(await repo([bob]).usernameExists('BOB')).toBe(true);
        expect(await repo([bob]).usernameExists('bobby')).toBe(false);
    });

    it('finds an email stored with capitals (reset password, OAuth, duplicate check)', async () => {
        expect((await repo([bob]).findByEmail('bob@example.com', false))?.id).toBe('u-bob');
        expect(await repo([bob]).emailExists('BOB@example.COM')).toBe(true);
        expect(await repo([bob]).emailExists('b_b@example.com')).toBe(false);
    });
});
