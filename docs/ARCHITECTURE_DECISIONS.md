# Architecture Decisions

**Project:** Event Ecosystem
**Version:** 1.0
**Phase:** 0.1 — Foundation

These decisions are binding unless explicitly superseded by a written approval from the project owner.

---

## ADR-001 — Supabase PostgreSQL as the Initial Database Platform

**Status:** Accepted

**Decision:**
Use Supabase PostgreSQL as the primary database for the event platform.

**Reason:**
- Managed PostgreSQL with automatic backups, point-in-time recovery, and connection pooling
- Integrated auth (Supabase Auth) reduces auth infrastructure complexity
- Built-in Row Level Security (RLS) for table-level access control
- Integrated object storage (Supabase Storage) for media
- REST/Realtime APIs available as supplementary when needed
- Cost-effective for the initial product phase

**Alternatives Considered:**
- Self-hosted PostgreSQL: More control, more operational burden
- PlanetScale: MySQL-based, schema conflicts with our PostgreSQL-specific types
- MongoDB/Firestore: Document databases poorly suited to our relational financial data model
- Railway PostgreSQL: Less auth/storage integration

**Consequences:**
- Supabase vendor dependency; mitigated because the underlying database is standard PostgreSQL
- Service role key must be strictly protected (backend only)
- RLS policies must be explicitly designed; no implicit security from Supabase alone
- Migration to standalone PostgreSQL is possible if needed

---

## ADR-002 — Supabase Auth as the Authentication Identity Provider

**Status:** Accepted

**Decision:**
Use Supabase Auth to handle authentication identity (sign-up, sign-in, OAuth, session lifecycle, password reset).

**Reason:**
- Eliminates custom password hashing and session management
- Supports email/password, Google OAuth, Apple OAuth out of the box
- JWTs issued by Supabase Auth are verifiable by our backend middleware
- Reduces security surface area for authentication

**Alternatives Considered:**
- Custom JWT auth: Higher implementation and maintenance burden
- Auth0: Additional vendor, additional cost, additional JWT complexity
- NextAuth.js: Frontend-only, does not serve Flutter and backend needs
- Clerk: Good DX but more opinionated, harder to integrate with a custom backend

**Consequences:**
- Application-level authorization (roles, permissions, org membership) remains in our PostgreSQL tables
- Supabase Auth user ID (`sub` in JWT) maps to our `users.id` via an auth trigger or first-login sync
- No custom password storage
- Frontend and Flutter apps use Supabase Auth SDK with the public anon key only

---

## ADR-003 — Node.js + TypeScript Backend Owns All Business Logic

**Status:** Accepted

**Decision:**
The central backend (NestJS + TypeScript) is the exclusive location for all business-critical logic.

**Reason:**
- Single source of truth for pricing, inventory, ticket state, payment verification, RBAC
- Type-safe shared contracts with frontend via `@platform/types`
- No business logic in React/Next.js or Flutter clients
- Easier to audit, test, and maintain

**Alternatives Considered:**
- Supabase Edge Functions: Vendor lock-in, limited runtime, poor for complex business logic
- Serverless (Vercel Functions): Cold starts, stateless limitations, poor for queue/BullMQ
- Go/Rust backend: Higher performance ceiling but team familiarity and ecosystem size favor Node.js/TS

**Consequences:**
- Backend is the only process that may use `SUPABASE_SERVICE_ROLE_KEY`
- All client requests must be authenticated and authorized by backend middleware
- Supabase RLS provides a secondary security layer but not the primary authorization mechanism

---

## ADR-004 — Modular Monolith Backend Architecture

**Status:** Accepted

**Decision:**
The backend starts as a NestJS modular monolith. No microservices in Phase 0.

**Reason:**
- Faster initial development
- Easier to refactor module boundaries before extracting services
- Single deployment unit reduces operational complexity
- NestJS modules provide clear domain boundaries without forcing service extraction

**Alternatives Considered:**
- Microservices from day one: Premature for a v1 product; high operational overhead
- Serverless functions per domain: Scaling and cold start issues; poor fit for long-running jobs

**Consequences:**
- All modules share the same PostgreSQL connection pool and Redis client
- Service extraction becomes possible later (Scanner, Payments, Notifications are likely candidates)
- Background workers (`backend/workers/`) are separate processes from the API

---

## ADR-005 — Flutter for Consumer and Scanner Mobile Apps

**Status:** Accepted

**Decision:**
Use Flutter (Dart) for both the consumer mobile app and the scanner mobile app. These are two completely separate Flutter projects.

**Reason:**
- Single codebase targets iOS and Android
- High-performance UI suitable for scanner camera workflow
- Offline-capable architecture fits scanner requirements
- Strong Dart type system aligns with our typed-API philosophy

**Alternatives Considered:**
- React Native: Better web-skill reuse but weaker performance for scanner camera
- Native Swift/Kotlin: Best performance, double the codebase
- PWA for scanner: Insufficient camera/offline/device API access

**Consequences:**
- Consumer app and scanner app are separate projects (different security models)
- Scanner app has stricter security requirements (device registration, event-scoped auth)
- Shared business logic lives in the backend API, not in Dart packages

---

## ADR-006 — Next.js / React for All Web Applications

**Status:** Accepted

**Decision:**
All five web applications (consumer, organizer, venue, promoter, admin) use Next.js 15 with React and TypeScript.

**Reason:**
- SSR/SSG for consumer web SEO and performance
- App Router architecture supports complex dashboard routing
- TypeScript provides end-to-end type safety from backend → frontend
- Tailwind CSS enables fast, consistent UI development

**Alternatives Considered:**
- Remix: Good alternative but less community ecosystem for dashboards
- Vite + React SPA: No SSR; SEO impact for consumer website
- SvelteKit: Smaller ecosystem; type-sharing with backend is less mature

**Consequences:**
- All five apps reference `@platform/ui`, `@platform/design-tokens`, `@platform/types`
- Consumer web may diverge from dashboard apps in styling/routing but shares the same packages
- `SUPABASE_SERVICE_ROLE_KEY` must never appear in Next.js bundles or client components

---

## ADR-007 — Redis + BullMQ for Caching and Background Jobs

**Status:** Accepted

**Decision:**
Use Redis for caching, rate limiting, and job queues. Use BullMQ as the job queue abstraction over Redis.

**Reason:**
- Industry-standard for distributed caching and queuing
- BullMQ provides reliable job lifecycle management (retry, priority, delay)
- Required for: inventory reservation expiry, notification dispatch, payment reconciliation, settlement generation

**Alternatives Considered:**
- AWS SQS: Managed but adds AWS dependency; overkill for initial phase
- RabbitMQ: More complex setup; Redis already required for caching
- PostgreSQL LISTEN/NOTIFY: Simpler but not suitable for high-throughput queuing

**Consequences:**
- Redis is NOT the source of truth for money, orders, or tickets
- Local development requires Redis (provided via Docker Compose)
- Redis data loss (cache eviction) must not produce incorrect business state

---

## ADR-008 — Financial and Ticketing Truth Remains in PostgreSQL

**Status:** Accepted

**Decision:**
All financial records (orders, payments, refunds, ledger entries, settlements) and ticket state are persisted in PostgreSQL only. Redis is used for coordination, not for authoritative state.

**Reason:**
- ACID guarantees for financial transactions
- Audit trail integrity
- Immutable financial records are impractical in a cache
- Ticket uniqueness requires database-level constraints

**Alternatives Considered:**
- Event sourcing (Kafka): Appropriate at scale but premature complexity for v1
- Redis for inventory: Risk of state loss; PostgreSQL row-level locking is sufficient for v1 scale

**Consequences:**
- Inventory reservation uses PostgreSQL row-level locking (`FOR UPDATE`)
- `sold_quantity + reserved_quantity <= quantity` is enforced by database constraint
- All financial aggregations (settlements, commissions) are derived from ledger entries in PostgreSQL
- Background job results must be written back to PostgreSQL before being considered authoritative

---

## ADR-009 — Drizzle ORM as the PostgreSQL Data-Access Layer

**Status:** Accepted

**Decision:**
Use Drizzle ORM for type-safe PostgreSQL access from the Node.js backend.

**Reason:**
- Spec explicitly prefers Drizzle over Prisma for new repositories
- SQL-first approach keeps schema canonical in migration files
- Strong TypeScript inference reduces runtime type errors
- Lightweight; no extra proxy layer (unlike Prisma)

**Alternatives Considered:**
- Prisma: Good DX but spec prefers Drizzle; Prisma's schema duplication conflicts with our SQL-canonical approach
- TypeORM: Decorator-heavy; weaker TypeScript inference
- Raw SQL via `postgres.js`: Maximum control but verbose for complex queries

**Consequences:**
- Drizzle schema definitions must remain synchronized with canonical SQL migrations
- `drizzle-kit` manages migration generation
- No Prisma Client is used anywhere in the codebase

---

## ADR-010 — pnpm Workspaces as the Monorepo Package Manager

**Status:** Accepted

**Decision:**
Use pnpm workspaces for the monorepo. pnpm is the only package manager used across all packages.

**Reason:**
- Spec explicitly prefers pnpm
- Efficient symlink-based node_modules (faster installs, less disk)
- Strict peer dependency resolution prevents version conflicts
- Already installed on the development machine (v10.13.1)

**Alternatives Considered:**
- npm workspaces: Slower, less strict
- yarn workspaces (v1/v3): Legacy concerns; pnpm is cleaner
- Turborepo + pnpm: Turborepo is a build orchestration layer, not a package manager; can be added later

**Consequences:**
- All packages define `packageManager: "pnpm@10.13.1"` in root
- Workspace packages are referenced via `workspace:*` protocol
- `pnpm install` from the root installs all workspace packages
