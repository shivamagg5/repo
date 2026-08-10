# Event Ecosystem Platform

A production-grade event discovery, ticketing, and operations platform.

## Architecture

```
event-platform/ (monorepo — pnpm workspaces)
├── apps/
│   ├── consumer-web/        # Next.js 15 — Public event discovery + checkout
│   ├── organizer-web/       # Next.js 15 — Organizer dashboard
│   ├── venue-web/           # Next.js 15 — Venue management
│   ├── promoter-web/        # Next.js 15 — Promoter dashboard
│   ├── admin-web/           # Next.js 15 — Admin operations
│   ├── consumer-mobile/     # Flutter — Consumer iOS/Android app
│   └── scanner-mobile/      # Flutter — Staff ticket scanner app
│
├── backend/
│   └── api/                 # NestJS — Central API (modular monolith)
│
├── packages/                # Shared packages (@platform/*)
│   ├── types/               # TypeScript type definitions
│   ├── validation/          # Zod validation schemas
│   ├── config/              # Environment config utilities
│   ├── api-client/          # Typed fetch client
│   ├── auth/                # Supabase auth helpers (anon key only)
│   ├── ui/                  # React component library
│   └── design-tokens/       # CSS custom properties + TypeScript tokens
│
├── database/
│   ├── migrations/          # Canonical SQL migrations (source of truth)
│   └── seeds/               # Development seed data
│
└── docs/                    # Architecture and specification documents
```

## Quick Start

### Prerequisites

| Requirement | Version |
|------------|---------|
| Node.js | ≥ 22 |
| pnpm | ≥ 10 |
| Flutter | ≥ 3.41 |
| Docker | Any (for Redis) |

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
cp backend/api/.env.example backend/api/.env
# Fill in Supabase credentials in backend/api/.env
```

### 3. Start Local Redis

```bash
docker compose up -d redis
docker compose stop redis   # to stop
```

### 4. Run Database Migrations

```bash
cd backend/api
pnpm db:migrate
```

### 5. Start Development Servers

```bash
# All services in parallel
pnpm dev

# Individual services:
pnpm --filter @platform/api dev         # Backend: http://localhost:3001
pnpm --filter consumer-web dev          # Consumer: http://localhost:3000
pnpm --filter organizer-web dev         # Organizer: http://localhost:3002
pnpm --filter venue-web dev             # Venue: http://localhost:3003
pnpm --filter promoter-web dev          # Promoter: http://localhost:3004
pnpm --filter admin-web dev             # Admin: http://localhost:3005
```

### 6. Verify

```bash
curl http://localhost:3001/api/v1/health
# Expected: { "data": { "status": "ok" }, "meta": { ... } }
```

## Commands

```bash
pnpm test         # Run all tests
pnpm lint         # Lint all packages
pnpm typecheck    # Typecheck all packages
pnpm format       # Format code
pnpm build        # Build all packages
pnpm clean        # Clean build artifacts
```

## Security

- **Never commit `.env` to git**
- `SUPABASE_SERVICE_ROLE_KEY` is **backend only** — bypasses RLS
- Frontend and mobile use `SUPABASE_ANON_KEY` only
- See [RLS_STRATEGY.md](docs/RLS_STRATEGY.md)

## Key Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE_DECISIONS.md](docs/ARCHITECTURE_DECISIONS.md) | All ADRs |
| [ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md) | Env vars |
| [SUPABASE_ARCHITECTURE.md](docs/SUPABASE_ARCHITECTURE.md) | Supabase integration |
| [RLS_STRATEGY.md](docs/RLS_STRATEGY.md) | Row Level Security |
| [database/README.md](database/README.md) | Database & migrations |

## Implementation Phases

| Phase | Task | Status |
|-------|------|--------|
| 0.1 | Foundation | ✅ Complete |
| 1.1 | Auth + Organizations + RBAC | 🔲 Next |
| 2.x | Venues + Events | 🔲 Pending |
| 3.x | Consumer Web | 🔲 Pending |
| 4.x | Ticketing Engine | 🔲 Pending |
| 5.x | Payments | 🔲 Pending |
| 6.x | Promoters | 🔲 Pending |
| 7.x | Scanner | 🔲 Pending |
| 8.x | Admin | 🔲 Pending |
| 9.x–10.x | Finance + Settlements | 🔲 Pending |
| 11.x | Notifications | 🔲 Pending |
| 12.x | Analytics | 🔲 Pending |
| 13.x–14.x | Mobile Apps | 🔲 Pending |
| 15.x | Performance + Security Hardening | 🔲 Pending |
