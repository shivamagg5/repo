import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/permissions.decorator';

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  version: string;
  uptime: number;
}

export interface ReadyResponse {
  status: 'ready' | 'not_ready';
  timestamp: string;
  checks: Record<string, 'ok' | 'fail'>;
}

/**
 * Health and readiness endpoints — no authentication required.
 *
 * GET /api/v1/health — Liveness check (is the process alive?)
 * GET /api/v1/ready  — Readiness check (is the service ready to serve traffic?)
 */
@Controller()
export class HealthController {
  /**
   * Liveness check — returns 200 if the process is running.
   * Used by orchestrators (Kubernetes, Railway, etc.) to decide if the pod is alive.
   */
  @Public()
  @Get('health')
  health(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] ?? '0.1.0',
      uptime: Math.floor(process.uptime()),
    };
  }

  /**
   * Readiness check — returns 200 if the service can serve traffic.
   * Checks downstream dependencies (DB, Redis).
   * Full dependency checks added in later phases.
   */
  @Public()
  @Get('ready')
  ready(): ReadyResponse {
    // TODO Phase 0.x: Add database connectivity check
    // TODO Phase 0.x: Add Redis connectivity check
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        // database: await checkDatabaseConnection(),
        // redis: await checkRedisConnection(),
        process: 'ok',
      },
    };
  }
}
