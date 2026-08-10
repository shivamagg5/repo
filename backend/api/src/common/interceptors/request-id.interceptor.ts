import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import type { Request, Response } from 'express';

/**
 * Attaches a unique X-Request-Id header to every request and response.
 * Downstream filters/handlers can read the request ID from request headers.
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Use existing request ID from upstream proxy or generate a new one
    const requestId =
      (request.headers['x-request-id'] as string) ?? uuidv4();

    // Attach to request for downstream handlers
    request.headers['x-request-id'] = requestId;

    // Echo back in response headers
    response.setHeader('X-Request-Id', requestId);

    return next.handle();
  }
}
