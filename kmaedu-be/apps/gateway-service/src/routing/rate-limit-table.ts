import { canonicalMethod, canonicalPath } from './canonical-request';
import type { RateLimitConfig } from './route-config.schema';
import { parseDurationMs } from './route-config.schema';

export interface CompiledRateLimit {
    id: string;
    method: string;
    regex: RegExp | undefined;
    windowMs: number;
    max: number;
}

/** Patterns are full-match, case-insensitive (like the upstream router): `^(?:<source>)$`. */
export function fullMatch(source: string): RegExp {
    return new RegExp(`^(?:${source})$`, 'i');
}

export function compileRateLimits(entries: readonly RateLimitConfig[]): CompiledRateLimit[] {
    return entries.map((e) => ({
        id: e.id,
        method: e.method,
        regex: fullMatch(e.path),
        windowMs: parseDurationMs(e.window),
        max: e.max,
    }));
}

export function compileDefaultLimit(entry: {
    window: string | number;
    max: number;
}): CompiledRateLimit {
    return {
        id: 'default',
        method: '*',
        regex: undefined,
        windowMs: parseDurationMs(entry.window),
        max: entry.max,
    };
}

/** First matching entry wins; otherwise the default bucket. */
export function findRateLimit(
    limits: readonly CompiledRateLimit[],
    fallback: CompiledRateLimit,
    method: string,
    pathname: string
): CompiledRateLimit {
    const m = canonicalMethod(method);
    const p = canonicalPath(pathname);
    return limits.find((l) => l.method === m && l.regex!.test(p)) ?? fallback;
}
