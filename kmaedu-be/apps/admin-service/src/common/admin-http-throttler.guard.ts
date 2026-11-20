import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/** Metadata key a bare `@SkipThrottle()` writes (`THROTTLER_SKIP` + `default`). */
const SKIP_DEFAULT_KEY = 'THROTTLER:SKIPdefault';

/**
 * Global rate limit for admin's HTTP surface (the per-controller
 * `@Throttle({ admin: ... })`), mirroring auth's `HttpThrottlerGuard`:
 * - gRPC calls (hybrid app: `AdminService.GetPageFlags`) are skipped, there is
 *   no request/response to track and they are authenticated by token.
 * - A bare `@SkipThrottle()` (the shared health probes) only marks the
 *   `default` throttler, while admin's only throttler is named `admin`; it is
 *   honoured here so probes are never throttled.
 *
 * Tracked by `req.ip`, which is the real client because `main.ts` trusts the
 * gateway hop (the gateway overwrites `x-forwarded-for`).
 */
@Injectable()
export class AdminHttpThrottlerGuard extends ThrottlerGuard {
    protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
        if (context.getType() !== 'http') return true;
        return (
            this.reflector.getAllAndOverride<boolean>(SKIP_DEFAULT_KEY, [
                context.getHandler(),
                context.getClass(),
            ]) === true
        );
    }
}
