# Database

This directory contains all database schema and data management files for the Event Platform.

## Structure

```
database/
├── migrations/         # Version-controlled SQL migrations (canonical schema)
│   └── 0001_initial_schema.sql
├── seeds/             # Seed data for development and testing
│   └── 001_dev_seed.sql
└── fixtures/          # Test fixtures (added in later phases)
```

## Architecture

The canonical database schema is maintained as SQL migration files in `migrations/`.

The Drizzle ORM schema in `backend/api/src/database/schema/` reflects the same structure for type-safe access. **These must remain synchronized.**

See `docs/SUPABASE_ARCHITECTURE.md` for the full architecture.

## Running Migrations

### Against Supabase PostgreSQL

Set `DATABASE_URL` in `backend/api/.env`, then:

```bash
# Using Drizzle Kit (from backend/api directory)
cd backend/api
pnpm db:migrate

# Or run the SQL directly in Supabase SQL Editor:
# Copy contents of database/migrations/0001_initial_schema.sql
```

### Applying a new migration

1. Create a new file: `database/migrations/0002_description.sql`
2. Update the Drizzle schema: `backend/api/src/database/schema/index.ts`
3. Run `pnpm db:migrate` from `backend/api/`

## Running Seeds

```bash
# In Supabase SQL Editor (development only):
# Copy contents of database/seeds/001_dev_seed.sql
```

## Verification

After running migrations, verify:

```bash
cd backend/api
pnpm start
# GET http://localhost:3001/api/v1/ready
# Should return: { "status": "ready", ... }
```

## Rules

- **Never edit existing migration files** after they have been applied.
- **Never manually modify the production schema** without a migration.
- **Financial tables must never be hard-deleted** — use status fields.
- **All schema changes require a migration** — no ad-hoc SQL in production.
