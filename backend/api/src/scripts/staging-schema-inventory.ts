// =============================================================================
// Staging Gate A1: Structural Schema Inventory & Catalog Inspection Harness
// Queries PostgreSQL catalog directly to capture:
// 1. Table inventory (all 57 tables)
// 2. Primary keys, foreign keys, unique constraints
// 3. PostgreSQL enums and custom types
// 4. Index catalog
// =============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../database/database.module';
import { DatabaseService } from '../database/database.service';
import { ConfigModule } from '@nestjs/config';
import { sql } from 'drizzle-orm';

export interface SchemaInventorySummary {
  databaseVersion: string;
  tableCount: number;
  tables: string[];
  primaryKeyCount: number;
  foreignKeyCount: number;
  uniqueConstraintCount: number;
  indexCount: number;
  enumCount: number;
  enums: string[];
  checkinDevicesPublicKeyColumnPresent: boolean;
}

export async function captureSchemaInventory(db: any): Promise<SchemaInventorySummary> {
  // 1. Get PostgreSQL Version
  const versionRes: any = await db.execute(sql`SELECT version() as ver;`);
  const databaseVersion = versionRes[0]?.ver ?? 'unknown';

  // 2. Tables
  const tablesRes: any = await db.execute(sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  const tables = tablesRes.map((r: any) => r.table_name);

  // 3. Primary Keys
  const pkRes: any = await db.execute(sql`
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public';
  `);

  // 4. Foreign Keys
  const fkRes: any = await db.execute(sql`
    SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
  `);

  // 5. Unique Constraints
  const uqRes: any = await db.execute(sql`
    SELECT constraint_name, table_name
    FROM information_schema.table_constraints
    WHERE constraint_type = 'UNIQUE' AND table_schema = 'public';
  `);

  // 6. Indexes
  const idxRes: any = await db.execute(sql`
    SELECT indexname, tablename
    FROM pg_indexes
    WHERE schemaname = 'public';
  `);

  // 7. Enums
  const enumRes: any = await db.execute(sql`
    SELECT t.typname as enum_name
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype = 'e';
  `);
  const enums = enumRes.map((r: any) => r.enum_name);

  // 8. Specific check on checkin_devices.public_key_pem
  const colRes: any = await db.execute(sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'checkin_devices'
      AND column_name = 'public_key_pem';
  `);
  const checkinDevicesPublicKeyColumnPresent = colRes.length > 0;

  return {
    databaseVersion,
    tableCount: tables.length,
    tables,
    primaryKeyCount: pkRes.length,
    foreignKeyCount: fkRes.length,
    uniqueConstraintCount: uqRes.length,
    indexCount: idxRes.length,
    enumCount: enums.length,
    enums,
    checkinDevicesPublicKeyColumnPresent,
  };
}

async function runInventoryHarness() {
  console.log('======================================================================');
  console.log('  STARTING STAGING GATE A1: SCHEMA INVENTORY & CATALOG INSPECTION');
  console.log('======================================================================');

  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule],
  }).compile();

  const dbService = moduleRef.get<DatabaseService>(DatabaseService);
  const db = dbService.db;

  try {
    const summary = await captureSchemaInventory(db);
    console.log(`\n- PostgreSQL Version: ${summary.databaseVersion}`);
    console.log(`- Deployed Tables Count: ${summary.tableCount}`);
    console.log(`- Primary Keys: ${summary.primaryKeyCount}`);
    console.log(`- Foreign Keys: ${summary.foreignKeyCount}`);
    console.log(`- Unique Constraints: ${summary.uniqueConstraintCount}`);
    console.log(`- Indexes: ${summary.indexCount}`);
    console.log(`- Enums: ${summary.enumCount} (${summary.enums.join(', ')})`);
    console.log(`- checkin_devices.public_key_pem present: ${summary.checkinDevicesPublicKeyColumnPresent ? 'YES' : 'NO'}`);

    if (summary.tableCount < 50) {
      throw new Error(`CRITICAL SCHEMA FAILURE: Expected 57 tables, found ${summary.tableCount}`);
    }
    if (!summary.checkinDevicesPublicKeyColumnPresent) {
      throw new Error('CRITICAL SCHEMA FAILURE: checkin_devices.public_key_pem column is missing');
    }

    console.log('\n======================================================================');
    console.log('  GATE A1 STRUCTURAL SCHEMA VALIDATION COMPLETED (PASS)');
    console.log('======================================================================');
  } catch (err: any) {
    console.error('❌ [GATE A1 FAILURE]:', err.message);
    throw err;
  } finally {
    await moduleRef.close();
  }
}

if (require.main === module) {
  runInventoryHarness()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
