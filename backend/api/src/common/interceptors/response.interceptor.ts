import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Request } from 'express';

/**
 * Wraps all successful responses in the standard API envelope:
 * { data: T, meta: { requestId, timestamp } }
 *
 * Responses that are already enveloped (e.g., from health checks) are passed through.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = request.headers['x-request-id'] as string;

    return next.handle().pipe(
      map((data: unknown) => {
        // If the response is already an envelope (has data + meta), pass through
        if (
          data !== null &&
          typeof data === 'object' &&
          'data' in (data as object) &&
          'meta' in (data as object)
        ) {
          return data;
        }

        // Wrap in standard envelope
        return {
          data,
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
      }),
    );
  }
}
