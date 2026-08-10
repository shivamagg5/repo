# Environment Variables

**Project:** Event Ecosystem
**Version:** 1.0

Reference this document when configuring a new environment.

All variables must be set in `.env.local` (local development) or via your deployment platform's secret manager.

**Never commit real secrets to git.**

---

## Root `.env.example`

The root `.env.example` documents all variables for the backend. Copy to `.env` and fill in values.

---

## 1. Supabase

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✅ Backend | Your Supabase project URL, e.g. `https://xyzxyz.supabase.co` |
| `SUPABASE_ANON_KEY` | ✅ Backend + Frontend | Public anon key — safe for browser/mobile use |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Backend ONLY | Service role key — **NEVER expose to frontend or mobile** |
| `DATABASE_URL` | ✅ Backend | PostgreSQL connection string for Drizzle ORM migrations and queries |

### Security Note
`SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. It must only exist in:
- `backend/api/.env`
- CI/CD pipeline secret store
- Production secret manager

It must **never** appear in:
- `apps/*/` (Next.js apps)
- `apps/consumer-mobile/` or `apps/scanner-mobile/` (Flutter)
- Git history
- Build artifacts or public CI logs

---

## 2. Backend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | ✅ | `development` | Environment: `development`, `staging`, `production` |
| `PORT` | ✅ | `3001` | NestJS API listen port |
| `API_URL` | ✅ | `http://localhost:3001` | Backend API base URL (used by apps) |
| `WEB_URL` | ✅ | `http://localhost:3000` | Consumer website base URL |
| `JWT_SECRET` | ✅ | — | Secret for internal JWT signing (if used; Supabase Auth JWTs use Supabase's key) |
| `CORS_ORIGINS` | ✅ | `http://localhost:3000` | Comma-separated list of allowed CORS origins |

---

## 3. Redis

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_URL` | ✅ | `redis://localhost:6379` | Redis connection URL for caching, rate limiting, and BullMQ |

### Local Redis
Start local Redis with Docker Compose:
```bash
docker compose up -d redis
```
Stop:
```bash
docker compose stop redis
```

---

## 4. Storage (Supabase Storage)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_STORAGE_URL` | Derived | Derived from `SUPABASE_URL` — set automatically |
| `STORAGE_BUCKET_EVENTS` | ✅ | Supabase storage bucket name for event images |
| `STORAGE_BUCKET_VENUES` | ✅ | Supabase storage bucket name for venue images |
| `STORAGE_BUCKET_AVATARS` | ✅ | Supabase storage bucket name for user avatars |

---

## 5. Payments (Placeholder — Phase 5)

| Variable | Required | Description |
|----------|----------|-------------|
| `PAYMENT_PROVIDER` | Phase 5 | Payment provider identifier, e.g. `razorpay`, `stripe` |
| `PAYMENT_KEY_ID` | Phase 5 | Public/key ID for the payment provider |
| `PAYMENT_KEY_SECRET` | Phase 5 | Secret key for the payment provider — backend only |
| `PAYMENT_WEBHOOK_SECRET` | Phase 5 | Webhook signature secret for verifying provider callbacks |

**Do NOT add real payment credentials in Phase 0.1.**

---

## 6. Notifications (Placeholder — Phase 11)

| Variable | Required | Description |
|----------|----------|-------------|
| `EMAIL_PROVIDER` | Phase 11 | Email provider identifier, e.g. `sendgrid`, `resend` |
| `EMAIL_API_KEY` | Phase 11 | Email provider API key — backend only |
| `EMAIL_FROM_ADDRESS` | Phase 11 | Default sender email address |
| `FCM_SERVER_KEY` | Phase 11 | Firebase Cloud Messaging key for push notifications |
| `APNS_KEY_ID` | Phase 11 | Apple Push Notification key ID |
| `APNS_TEAM_ID` | Phase 11 | Apple developer team ID |

---

## 7. Observability

| Variable | Required | Description |
|----------|----------|-------------|
| `SENTRY_DSN` | Optional | Sentry DSN for error tracking — set when Sentry is configured |
| `LOG_LEVEL` | Optional | `debug`, `info`, `warn`, `error` — defaults to `info` in production |

---

## 8. Per-App Variables

### Web Apps (Next.js)
Next.js requires browser-exposed variables to be prefixed with `NEXT_PUBLIC_`.

| Variable | App | Description |
|----------|-----|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | All web apps | Same as `SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All web apps | Same as `SUPABASE_ANON_KEY` |
| `NEXT_PUBLIC_API_URL` | All web apps | Backend API URL for client-side requests |

### Flutter Apps
Flutter environment config is managed via `--dart-define` or a `.env` read at build time (never bundled raw).

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase public anon key |
| `API_BASE_URL` | Backend API base URL |

**The service role key is never passed to Flutter apps.**

---

## 9. Database Connection Format

```
postgresql://[user]:[password]@[host]:[port]/[dbname]?pgbouncer=true&connection_limit=1
```

For Supabase, use the **Transaction** pooler URL for serverless/Edge environments, and the **Session** pooler URL for long-running servers.

Example (Supabase transaction mode):
```
postgresql://postgres.xyzxyz:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

Example (direct connection):
```
postgresql://postgres:[YOUR-PASSWORD]@db.xyzxyz.supabase.co:5432/postgres
```

---

## 10. Verification Commands

After filling in credentials, verify the database connection:
```bash
cd backend/api
pnpm drizzle-kit studio
# or
pnpm db:migrate
```

Verify Redis:
```bash
docker compose up -d redis
redis-cli ping
# Expected: PONG
```

Verify backend starts:
```bash
cd backend/api
pnpm dev
# Expected: NestJS app listening on port 3001
# GET http://localhost:3001/api/v1/health → 200 OK
```
