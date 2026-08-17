import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

interface RateLimitPolicy {
  windowMs: number;
  maxRequests: number;
}

const POLICY_MATRIX: Record<string, RateLimitPolicy> = {
  auth: { windowMs: 60 * 1000, maxRequests: 5 },
  checkout: { windowMs: 60 * 1000, maxRequests: 10 },
  analytics: { windowMs: 60 * 1000, maxRequests: 60 },
  scanner: { windowMs: 60 * 1000, maxRequests: 120 },
  admin: { windowMs: 60 * 1000, maxRequests: 30 },
  webhooks: { windowMs: 60 * 1000, maxRequests: 60 },
  public: { windowMs: 60 * 1000, maxRequests: 120 },
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private static readonly memoryStore = new Map<string, { count: number; resetTime: number }>();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const path = req.path || req.url || '';

    let routeClass = 'public';
    if (path.includes('/auth/')) routeClass = 'auth';
    else if (path.includes('/checkout/') || path.includes('/payments/')) routeClass = 'checkout';
    else if (path.includes('/analytics/')) routeClass = 'analytics';
    else if (path.includes('/scanner/')) routeClass = 'scanner';
    else if (path.includes('/admin/') || path.includes('/settlements/')) routeClass = 'admin';
    else if (path.includes('/webhooks/')) routeClass = 'webhooks';

    const policy = POLICY_MATRIX[routeClass] ?? POLICY_MATRIX.public!;
    const clientKey = `${routeClass}:${req.ip || '127.0.0.1'}:${req.user?.userId || 'anon'}`;
    const now = Date.now();

    const record = RateLimitGuard.memoryStore.get(clientKey);

    if (!record || now > record.resetTime) {
      RateLimitGuard.memoryStore.set(clientKey, {
        count: 1,
        resetTime: now + policy.windowMs,
      });
      return true;
    }

    if (record.count >= policy.maxRequests) {
      const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
      if (res && res.setHeader) {
        res.setHeader('Retry-After', retryAfterSec);
        res.setHeader('X-RateLimit-Limit', policy.maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);
      }
      throw new HttpException(
        `Rate limit exceeded for ${routeClass} endpoint class. Retry after ${retryAfterSec} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count += 1;
    if (res && res.setHeader) {
      res.setHeader('X-RateLimit-Limit', policy.maxRequests);
      res.setHeader('X-RateLimit-Remaining', policy.maxRequests - record.count);
    }
    return true;
  }
}
