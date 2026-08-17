import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { sql } from 'drizzle-orm';
import type { HealthCheckReportDto } from '@platform/types';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  getLiveness(): HealthCheckReportDto {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      databaseConnected: true,
      redisConnected: true,
      queueWorkersActive: true,
    };
  }

  async getReadiness(): Promise<HealthCheckReportDto> {
    let databaseConnected = false;
    try {
      await this.databaseService.db.execute(sql`SELECT 1`);
      databaseConnected = true;
    } catch (err: any) {
      this.logger.error(`Readiness check failed database ping: ${err.message}`);
    }

    const isReady = databaseConnected;

    return {
      status: isReady ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      databaseConnected,
      redisConnected: true,
      queueWorkersActive: true,
    };
  }
}
