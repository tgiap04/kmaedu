/**
 * One canonical form of "which request is this", shared by route matching, rate
 * limits, public exceptions and the auth-state outage policy. Upstreams are
 * Express 5 / NestJS: they ignore case and a trailing slash and answer HEAD from
 * the GET handler, so the gateway must pick the same route entry for every
 * spelling the upstream would serve. Only matching uses this form; the request
 * is forwarded with its original URL (ids in the path are case-sensitive data).
 */

/** Collapse `//`, drop one trailing `/`. Case is kept; patterns match case-insensitively. */
export function canonicalPath(pathname: string): string {
    const collapsed = pathname.replace(/\/{2,}/g, '/');
    return collapsed.length > 1 && collapsed.endsWith('/') ? collapsed.slice(0, -1) : collapsed;
}

/** HEAD is served by the GET handler, so it is matched, limited and authorised as GET. */
export function canonicalMethod(method: string): string {
    return method === 'HEAD' ? 'GET' : method;
}
