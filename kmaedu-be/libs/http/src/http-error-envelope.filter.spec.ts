import { ArgumentsHost, BadRequestException, ConflictException, HttpException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import { HttpErrorEnvelopeFilter } from './http-error-envelope.filter';

function host(headers: Record<string, string> = {}) {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const h = {
        getType: () => 'http',
        switchToHttp: () => ({
            getRequest: () => ({ headers }),
            getResponse: () => ({ status }),
        }),
    } as unknown as ArgumentsHost;
    return { h, status, json };
}

describe('HttpErrorEnvelopeFilter', () => {
    const filter = new HttpErrorEnvelopeFilter();

    it('takes requestId from x-request-id', () => {
        const { h, json } = host({ 'x-request-id': 'req_abc' });
        filter.catch(new HttpException('nope', 404), h);
        expect(json).toHaveBeenCalledWith({
            statusCode: 404,
            code: 'NOT_FOUND',
            message: 'nope',
            requestId: 'req_abc',
        });
    });

    it('keeps an explicit code from HttpException({ statusCode, code, message })', () => {
        const { h, json, status } = host({ 'x-request-id': 'r1' });
        filter.catch(
            new HttpException(
                { statusCode: 422, code: 'INSUFFICIENT_BALANCE', message: 'Số dư không đủ' },
                422
            ),
            h
        );
        expect(status).toHaveBeenCalledWith(422);
        expect(json).toHaveBeenCalledWith({
            statusCode: 422,
            code: 'INSUFFICIENT_BALANCE',
            message: 'Số dư không đủ',
            requestId: 'r1',
        });
    });

    it('joins class-validator message arrays', () => {
        const { h, json } = host({ 'x-request-id': 'r2' });
        filter.catch(new BadRequestException(['a must be x', 'b must be y']), h);
        expect(json).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 400,
                code: 'BAD_REQUEST',
                message: 'a must be x; b must be y',
            })
        );
    });

    it('adds the field problems of a zod validation error, keeping the message', () => {
        const { h, json } = host({ 'x-request-id': 'r3' });
        filter.catch(
            new BadRequestException({
                statusCode: 400,
                message: 'Validation failed',
                errors: [
                    { code: 'too_small', path: ['password'], message: 'Password must be at least 8 characters long' },
                    { code: 'invalid_type', path: ['items', 0, 'name'], message: 'Required' },
                ],
            }),
            h
        );
        expect(json).toHaveBeenCalledWith({
            statusCode: 400,
            code: 'BAD_REQUEST',
            message: 'Validation failed',
            requestId: 'r3',
            details: [
                { path: 'password', message: 'Password must be at least 8 characters long' },
                { path: 'items.0.name', message: 'Required' },
            ],
        });
    });

    it('sends no details when the error carries none, and caps a long list', () => {
        const plain = host({ 'x-request-id': 'r4' });
        filter.catch(new BadRequestException('bad'), plain.h);
        expect(plain.json.mock.calls[0][0]).not.toHaveProperty('details');

        const many = host({ 'x-request-id': 'r5' });
        const errors = Array.from({ length: 50 }, (_, i) => ({ path: [`f${i}`], message: 'x' }));
        filter.catch(new BadRequestException({ message: 'Validation failed', errors: [...errors, 'junk', null] }), many.h);
        expect(many.json.mock.calls[0][0].details).toHaveLength(20);
    });

    it('forwards field problems only for a validation failure, never for other errors carrying `errors`', () => {
        const other = host({ 'x-request-id': 'r6' });
        filter.catch(new BadRequestException({ message: 'Import failed', errors: [{ path: ['row'], message: 'internal note' }] }), other.h);
        expect(other.json.mock.calls[0][0]).not.toHaveProperty('details');

        const conflict = host({ 'x-request-id': 'r7' });
        filter.catch(new ConflictException({ message: 'Validation failed', errors: [{ path: ['x'], message: 'y' }] }), conflict.h);
        expect(conflict.json.mock.calls[0][0]).not.toHaveProperty('details');
    });

    it('maps unknown errors to 500 INTERNAL_SERVER_ERROR without leaking details', () => {
        const { h, json, status } = host();
        filter.catch(new Error('db password is hunter2'), h);
        expect(status).toHaveBeenCalledWith(500);
        const body = json.mock.calls[0][0];
        expect(body).toMatchObject({
            statusCode: 500,
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Internal server error',
        });
        expect(typeof body.requestId).toBe('string');
        expect(JSON.stringify(body)).not.toContain('hunter2');
    });

    describe('non-HTTP contexts (hybrid gRPC apps inherit global filters)', () => {
        const rpc = { getType: () => 'rpc' } as unknown as ArgumentsHost;
        const rejection = (error: unknown) =>
            firstValueFrom(filter.catch(error, rpc) as unknown as Observable<never>).catch((e) => e);

        it('keeps the RpcException payload (gRPC status code) intact', async () => {
            await expect(
                rejection(new RpcException({ code: 7, message: 'PERMISSION_DENIED' }))
            ).resolves.toEqual({ code: 7, message: 'PERMISSION_DENIED' });
        });

        it('answers an unexpected error the way Nest does by default', async () => {
            const result = await rejection(new Error('boom'));
            expect(result).toMatchObject({ status: 'error', message: 'Internal server error' });
        });
    });

    it('generates a requestId when the header is missing', () => {
        const { h, json } = host();
        filter.catch(new HttpException('x', 400), h);
        expect(json.mock.calls[0][0].requestId).toMatch(/^req_/);
    });
});
