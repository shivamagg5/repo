import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service';

/**
 * DatabaseModule — provides the Drizzle ORM database connection.
 * Marked @Global so DatabaseService is available everywhere without re-importing.
 *
 * Requires DATABASE_URL environment variable pointing to Supabase PostgreSQL.
 */
@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
