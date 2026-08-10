import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

export type DrizzleDB = PostgresJsDatabase<typeof schema>;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('DatabaseService');
  private client: ReturnType<typeof postgres> | null = null;
  private _db: DrizzleDB | null = null;

  /**
   * Drizzle database instance. Throws a clear error if DATABASE_URL was not configured.
   * All services should use this property — never check for null themselves.
   */
  get db(): DrizzleDB {
    if (!this._db) {
      throw new Error(
        'Database not connected. Ensure DATABASE_URL is set and points to your Supabase PostgreSQL instance.',
      );
    }
    return this._db;
  }

  onModuleInit() {
    const databaseUrl = process.env['DATABASE_URL'];

    if (!databaseUrl) {
      this.logger.warn(
        'DATABASE_URL is not set. Database operations will fail. ' +
        'Set DATABASE_URL in your .env file to connect to Supabase PostgreSQL. ' +
        'See docs/ENVIRONMENT_VARIABLES.md for details.',
      );
      return;
    }

    try {
      this.client = postgres(databaseUrl, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
      });
      this._db = drizzle(this.client, { schema });
      this.logger.log('Database connection established');
    } catch (error) {
      this.logger.error('Failed to establish database connection', error);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.end();
      this.logger.log('Database connection closed');
    }
  }

  /**
   * @deprecated Use this.db directly. Kept for backward compatibility.
   */
  getDb(): DrizzleDB {
    return this.db;
  }
}
