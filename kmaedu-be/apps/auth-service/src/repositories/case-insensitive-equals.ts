/**
 * Prisma filter matching `value` exactly but ignoring case. On Postgres
 * Prisma sends `mode: 'insensitive'` as `col ILIKE $1` WITHOUT escaping, so
 * `%`, `_` and `\` in user input would act as wildcards (`%` would match any
 * account). They are escaped here with `\`, Postgres' default LIKE escape.
 *
 * ILIKE cannot use the btree unique index, so callers try the exact match
 * first and fall back to this.
 */
export function caseInsensitiveEquals(value: string): {
    equals: string;
    mode: 'insensitive';
} {
    return { equals: value.replace(/[\\%_]/g, '\\$&'), mode: 'insensitive' };
}
