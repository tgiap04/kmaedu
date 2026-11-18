import { randomUUID } from 'crypto';
import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { BaseRpcExceptionFilter } from '@nestjs/microservices';
import type { Observable } from 'rxjs';

export interface ErrorDetail {
    /** Dotted field path, e.g. `password` or `items.0.name`. */
    path: string;
    message: string;
}

export interface ErrorEnvelope {
    statusCode: number;
    code: string;
    message: string;
    requestId: string;
    /** Field problems of a validation error (zod issues); absent otherwise. Additive: clients may ignore it. */
    details?: ErrorDetail[];
}

const MAX_DETAILS = 20;

/** `{ path, message }` of each zod issue in `errors` (as nestjs-zod puts them), at most MAX_DETAILS. */
function detailsOf(errors: unknown): ErrorDetail[] | undefined {
    if (!Array.isArray(errors)) return undefined;
    const details = errors
        .filter(
            (e): e is { path?: unknown; message: string } =>
                typeof e === 'object' && e !== null && typeof (e as { message?: unknown }).message === 'string'
        )
        .slice(0, MAX_DETAILS)
        .map((e) => ({
            path: Array.isArray(e.path) ? e.path.map(String).join('.') : '',
            message: e.message,
        }));
    return details.length > 0 ? details : undefined;
}

const UPPER_SNAKE = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/;

function defaultCode(statusCode: number): string {
    return HttpStatus[statusCode] ?? `HTTP_${statusCode}`;
}

function textOf(value: unknown, fallback: string): string {
    if (typeof value === 'string' && value) return value;
    if (Array.isArray(value) && value.length) return value.join('; ');
    return fallback;
}

/**
 * Normalises every error to `{ statusCode, code, message, requestId }`.
 * Registered by gateway + auth in phase 05; other services register it when a
 * later phase touches them. HTTP only: other contexts re-throw untouched.
 */
@Catch()
export class HttpErrorEnvelopeFilter implements ExceptionFilter {
    private readonly rpc = new BaseRpcExceptionFilter();

    catch(exception: unknown, host: ArgumentsHost): Observable<unknown> | void {
        // Hybrid apps (HTTP + gRPC) inherit global filters; RPC errors keep
        // Nest's own mapping (RpcException payload -> gRPC status).
        if (host.getType() !== 'http') return this.rpc.catch(exception, host);

        const ctx = host.switchToHttp();
        const req = ctx.getRequest<Request>();
        const res = ctx.getResponse<Response>();

        const header = req?.headers?.['x-request-id'];
        const requestId =
            (Array.isArray(header) ? header[0] : header) ||
            `req_${randomUUID().replace(/-/g, '')}`;

        const body = this.toEnvelope(exception, requestId);
        res.status(body.statusCode).json(body);
    }

    private toEnvelope(exception: unknown, requestId: string): ErrorEnvelope {
        if (!(exception instanceof HttpException)) {
            return {
                statusCode: 500,
                code: defaultCode(500),
                message: 'Internal server error',
                requestId,
            };
        }
        const statusCode = exception.getStatus();
        const response = exception.getResponse();
        const obj =
            typeof response === 'object' && response !== null
                ? (response as Record<string, unknown>)
                : {};
        const code =
            typeof obj.code === 'string' && UPPER_SNAKE.test(obj.code)
                ? obj.code
                : defaultCode(statusCode);
        const message = textOf(
            typeof response === 'string' ? response : obj.message,
            exception.message
        );
        // Only a request validation failure (nestjs-zod's 400) lists field problems; any other
        // exception that happens to carry `errors` keeps them server-side.
        const details =
            statusCode === 400 && obj.message === 'Validation failed' ? detailsOf(obj.errors) : undefined;
        return details ? { statusCode, code, message, requestId, details } : { statusCode, code, message, requestId };
    }
}
