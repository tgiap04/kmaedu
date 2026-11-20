import { canonicalMethod, canonicalPath } from './canonical-request';
import type { CompiledRoute } from './route-table';

/**
 * Raw paths that could smuggle a different resource past matching: dot segments,
 * encoded dots / slashes / backslashes / NUL, literal backslashes, and encoded
 * unreserved characters (`%61` for `a`, `%2d` for `-`): no client sends those, and
 * a server that decodes before routing would see a different path than we match.
 */
const UNSAFE_PATH =
    /(^|\/)\.\.?(\/|$)|%2e|%2f|%5c|%00|%(?:2d|3\d|4[1-9a-f]|5[0-9af]|6[1-9a-f]|7[0-9ae])|\\/i;

export function isUnsafePath(pathname: string): boolean {
    return UNSAFE_PATH.test(pathname);
}

function allows(route: CompiledRoute, method: string): boolean {
    return !route.methods || route.methods.has(method);
}

/** `prefix` is already lower-case (see `compileRoute`); `pathname` is lowered here. */
function underPrefix(prefix: string, pathname: string): boolean {
    const lower = pathname.toLowerCase();
    return (
        lower === prefix ||
        (lower.startsWith(prefix) && (prefix.endsWith('/') || lower[prefix.length] === '/'))
    );
}

/**
 * `path` regex routes first (file order), then the longest `prefix` on a
 * segment boundary. Query strings are not part of `pathname`. The request is
 * canonicalised first (case-insensitive, no duplicate or trailing slash, HEAD as GET).
 */
export function matchRoute(
    routes: readonly CompiledRoute[],
    rawMethod: string,
    rawPathname: string
): CompiledRoute | undefined {
    if (isUnsafePath(rawPathname)) return undefined;
    const method = canonicalMethod(rawMethod);
    const pathname = canonicalPath(rawPathname);

    let best: CompiledRoute | undefined;
    for (const route of routes) {
        if (!allows(route, method)) continue;
        if (route.pathRegex) {
            if (route.pathRegex.test(pathname)) return route;
        } else if (
            route.prefix !== undefined &&
            underPrefix(route.prefix, pathname) &&
            (!best || route.prefix.length > best.prefix!.length)
        ) {
            best = route;
        }
    }
    return best;
}
