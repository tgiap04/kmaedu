/**
 * Column names of a Prisma P2002 (unique violation), or `null` when the
 * error is not one. Through the pg driver adapter Prisma 6 reports the
 * columns under `meta.driverAdapterError.cause.constraint.fields` (parsed from
 * Postgres' `Key (col)=` detail, so camelCase names arrive quoted); the
 * classic engine used `meta.target`. Both are read.
 */
export function uniqueViolationFields(error: unknown): string[] | null {
    const err = error as {
        code?: unknown;
        meta?: {
            target?: unknown;
            driverAdapterError?: { cause?: { constraint?: { fields?: unknown } } };
        };
    } | null;
    if (err?.code !== 'P2002') return null;

    const target = err.meta?.target;
    const fromAdapter = err.meta?.driverAdapterError?.cause?.constraint?.fields;
    const raw = [
        ...(Array.isArray(target) ? target : typeof target === 'string' ? [target] : []),
        ...(Array.isArray(fromAdapter) ? fromAdapter : []),
    ];
    return raw.map((f) => String(f).replace(/^"|"$/g, ''));
}

/** True when `error` is a P2002 raised by the unique index on `field`. */
export function isUniqueViolationOn(error: unknown, field: string): boolean {
    return uniqueViolationFields(error)?.includes(field) ?? false;
}
