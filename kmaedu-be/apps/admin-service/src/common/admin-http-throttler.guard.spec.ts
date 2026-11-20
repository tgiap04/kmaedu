import 'reflect-metadata';
import { Controller, Get, INestApplication, Sse } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { SkipThrottle, Throttle, ThrottlerModule } from '@nestjs/throttler';
import { of } from 'rxjs';
import * as request from 'supertest';
import { AdminServiceModule } from '../admin-service.module';
import { AdminHttpThrottlerGuard } from './admin-http-throttler.guard';

/**
 * `@Throttle({ admin: ... })` on the admin controllers is only metadata until a
 * ThrottlerGuard runs. These pin that the guard is registered globally and
 * enforces the `admin` limit, while health probes (`@SkipThrottle()`) and the
 * gRPC surface stay unthrottled.
 */
@Controller('t')
@Throttle({ admin: { ttl: 60_000, limit: 3 } })
class ProbeController {
    @Get('plain')
    plain() {
        return { ok: true };
    }

    @Sse('stream')
    stream() {
        return of({ data: 'x' });
    }
}

@SkipThrottle()
@Controller('probe-health')
class ProbeHealthController {
    @Get()
    live() {
        return { ok: true };
    }
}

describe('admin-service throttling', () => {
    it('registers AdminHttpThrottlerGuard as a global guard', () => {
        const providers: unknown[] =
            Reflect.getMetadata('providers', AdminServiceModule) ?? [];
        expect(providers).toContainEqual({
            provide: APP_GUARD,
            useClass: AdminHttpThrottlerGuard,
        });
    });

    describe('enforcement', () => {
        let app: INestApplication;

        beforeAll(async () => {
            const moduleRef = await Test.createTestingModule({
                imports: [
                    ThrottlerModule.forRoot([
                        { name: 'admin', ttl: 60_000, limit: 100 },
                    ]),
                ],
                controllers: [ProbeController, ProbeHealthController],
                providers: [{ provide: APP_GUARD, useClass: AdminHttpThrottlerGuard }],
            }).compile();
            app = moduleRef.createNestApplication();
            await app.init();
        });
        afterAll(() => app.close());

        const hit = (path: string) =>
            request(app.getHttpServer())
                .get(path)
                .then((r) => r.status);

        it('refuses the call past the controller @Throttle limit with 429', async () => {
            const statuses: number[] = [];
            for (let i = 0; i < 4; i++) statuses.push(await hit('/t/plain'));
            expect(statuses).toEqual([200, 200, 200, 429]);
        });

        it('still opens the SSE stream under the limit', async () => {
            const res = await request(app.getHttpServer()).get('/t/stream');
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/text\/event-stream/);
        });

        it('never throttles a @SkipThrottle() health probe', async () => {
            const statuses: number[] = [];
            for (let i = 0; i < 105; i++) {
                statuses.push(await hit('/probe-health'));
            }
            expect(statuses.every((s) => s === 200)).toBe(true);
        });
    });

    it('lets gRPC calls through (no HTTP request to track)', async () => {
        const guard = Object.create(AdminHttpThrottlerGuard.prototype);
        const rpc = {
            getType: () => 'rpc',
            getHandler: () => () => undefined,
            getClass: () => Object,
        } as never;
        await expect(guard.canActivate(rpc)).resolves.toBe(true);
    });
});
