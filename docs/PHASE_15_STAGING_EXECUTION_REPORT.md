# Phase 15: Staging Execution Report

## Honest Current Status

```text
=============================================================================
                  PHASE 15 STAGING RELEASE EXECUTION STATUS
=============================================================================
TOOLING & PREPARATION
  Route reconciliation (POST /reservations)               ✅ DONE
  Schema inventory (57 entities verified)                 ✅ DONE
  Staging seed script (db:seed:staging)                   ✅ DONE
  Concurrency harness (test:concurrency)                  ✅ DONE
  Automated regression (308/308)                          ✅ DONE
  Staging plan & gate definitions                         ✅ DONE

GATE 1: Infrastructure & Network                          ⏳ AWAITING INFRASTRUCTURE
GATE 2: Database & Migrations                             ⏳ BLOCKED on Gate 1
GATE 3: Payment Gateway (Razorpay Test Mode)              ⏳ BLOCKED on Gate 1
GATE 4: Real PostgreSQL Concurrency                       🔴 BLOCKED — NOT YET RUN
GATE 5: Scanner Mobile & Offline Sync                     ⏳ BLOCKED on Gate 1
GATE 6: Refunds & Finance Ledger                          ⏳ BLOCKED on Gate 1
GATE 7: Notification Outbox                               ⏳ BLOCKED on Gate 1
GATE 8: Analytics & Telemetry                             ⏳ BLOCKED on Gate 1
GATE 9: Security & RBAC Isolation                         ⏳ BLOCKED on Gate 1
GATE 10: Load & Performance                               ⏳ BLOCKED on Gate 1
GATE 11: Physical Hardware (iOS + Android)                🔴 BLOCKED — PHYSICAL DEVICES REQUIRED

OVERALL STAGING CLASSIFICATION:   🔴 NOT STARTED — INFRASTRUCTURE NOT PROVISIONED
PRODUCTION READINESS:             ❌ NOT YET
=============================================================================
```

---

## Real PostgreSQL Concurrency Status

```text
=============================================================================
REAL POSTGRESQL CONCURRENCY: BLOCKED — NOT YET EXECUTED
=============================================================================
The staging-concurrency-test.ts harness has been written and typechecks clean.
It has NOT been run against a real PostgreSQL instance.

These numbers are TARGETS, not results:

  Scanner concurrency:
    success          = ? (expected: 1)
    already_used     = ? (expected: 9)
    duplicate checkins = ? (expected: 0)

  Reservation race:
    holds            = ? (expected: 5)
    conflicts        = ? (expected: 45)
    oversold         = ? (expected: 0)

This gate will be marked PASS only after actual results are recorded here
from a real staging PostgreSQL instance with real row-level locking.
=============================================================================
```

---

## Physical Device Status

```text
=============================================================================
PHYSICAL DEVICE TESTING: BLOCKED — PHYSICAL DEVICES REQUIRED
=============================================================================
The seed script creates 2 scanner device identifiers in the database.
This does NOT establish:
  - Camera behavior under real lighting conditions
  - Secure storage (iOS Keychain / Android Keystore)
  - Haptic feedback correctness
  - Audio alerts
  - Airplane mode offline scan queue
  - FlutterSecureStorage key persistence after process kill

PHYSICAL GATE REQUIREMENT: At least ONE physical iPhone and ONE physical Android
device must scan real tickets against the live staging API before this gate passes.
=============================================================================
```

---

## Gate 1: Infrastructure & Network — ACTION REQUIRED

Gate 1 cannot proceed without the following decisions and credentials from the operator:

### 1.1 Supabase Staging Project
```text
Required:
  [ ] Create a NEW Supabase project for staging (separate from any production project)
  [ ] Record Project Reference ID: [STAGING_PROJECT_REF]
  [ ] Retrieve:
        SUPABASE_URL = https://[STAGING_PROJECT_REF].supabase.co
        SUPABASE_ANON_KEY = [PUBLIC — goes into frontend .env]
        SUPABASE_SERVICE_ROLE_KEY = [SECRET — backend only, never client]
        SUPABASE_JWT_SECRET = [SECRET — backend only]
        DATABASE_URL = postgresql://postgres:[DB_PASSWORD]@db.[STAGING_PROJECT_REF].supabase.co:5432/postgres?sslmode=require
```

### 1.2 Managed Redis
```text
Required:
  [ ] Create an Upstash Redis database (or other managed Redis) for staging
  [ ] Record:
        REDIS_URL = rediss://default:[PASSWORD]@[HOST]:[PORT]
```

### 1.3 ECDSA P-256 Staging Signing Keys
```text
Required:
  [ ] Generate a dedicated ECDSA P-256 keypair for staging
      (DO NOT use or share production signing keys with staging)
  
  Generate via Node.js:
    const { generateKeyPairSync } = require('crypto');
    const { privateKey, publicKey } = generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    
  [ ] Store as:
        SERVER_SIGNING_ACTIVE_KEY_VERSION=v1-staging-2026
        SERVER_SIGNING_KEYS_JSON=[{"keyVersion":"v1-staging-2026","privateKeyPem":"...","publicKeyPem":"...","status":"active"}]
```

### 1.4 Razorpay Test Mode
```text
Required:
  [ ] Log into Razorpay Dashboard → Switch to TEST mode
  [ ] Retrieve:
        RAZORPAY_KEY_ID = rzp_test_[YOUR_KEY]
        RAZORPAY_KEY_SECRET = [SECRET]
  [ ] Generate a Webhook Secret:
        RAZORPAY_WEBHOOK_SECRET = [SECRET]
  [ ] Webhook URL to configure in Razorpay Dashboard:
        https://api-staging.eventplatform.com/payments/webhooks/razorpay
```

### 1.5 Backend Hosting
```text
Required:
  [ ] Choose backend hosting: Cloud Run / Railway / Render / Fly.io
  [ ] Build container image:
        pnpm --filter @platform/api build
        docker build -t event-platform-api:staging .
  [ ] Set all environment variables in hosting dashboard
  [ ] Deploy & verify:
        GET https://api-staging.eventplatform.com/health → 200 { status: 'ok' }
        GET https://api-staging.eventplatform.com/health/ready → 200 { status: 'ok' }
```

### 1.6 Frontend Deployments (5 Next.js Apps)
```text
Required for each of the 5 apps:
  [ ] Connect GitHub repository to Vercel / Cloudflare Pages
  [ ] Set NEXT_PUBLIC_* environment variables (see plan Section 2.2)
  [ ] Verify each app loads and Supabase auth connect succeeds:

        ✓ https://staging.eventplatform.com
        ✓ https://organizer-staging.eventplatform.com
        ✓ https://venue-staging.eventplatform.com
        ✓ https://promoter-staging.eventplatform.com
        ✓ https://admin-staging.eventplatform.com
```

### 1.7 Gate 1 Verification Checklist
Once infrastructure is deployed, run this verification sequence:

```bash
# API liveness
curl -f https://api-staging.eventplatform.com/health
# Expected: {"status":"ok","uptime":...}

# API readiness (DB + Redis + signing keys)
curl -f https://api-staging.eventplatform.com/health/ready
# Expected: {"status":"ok","checks":{"database":"up","redis":"up","signingKey":"active"}}

# CORS preflight from staging consumer web
curl -I -X OPTIONS https://api-staging.eventplatform.com/events \
  -H "Origin: https://staging.eventplatform.com" \
  -H "Access-Control-Request-Method: GET"
# Expected: 204, Access-Control-Allow-Origin: https://staging.eventplatform.com

# CORS rejection from unauthorized origin
curl -I -X OPTIONS https://api-staging.eventplatform.com/events \
  -H "Origin: https://evil.example.com" \
  -H "Access-Control-Request-Method: GET"
# Expected: No Access-Control-Allow-Origin header
```

### 1.8 Gate 1 Result Template
```text
GATE 1: Infrastructure & Network
  Date executed:         [ ]
  Executed by:           [ ]
  
  API health/live:       [ ] PASS / [ ] FAIL
  API health/ready:      [ ] PASS / [ ] FAIL
  Database connectivity: [ ] PASS / [ ] FAIL
  Redis connectivity:    [ ] PASS / [ ] FAIL
  Signing key active:    [ ] PASS / [ ] FAIL
  CORS (valid origin):   [ ] PASS / [ ] FAIL
  CORS (blocked origin): [ ] PASS / [ ] FAIL
  HTTPS enforced:        [ ] PASS / [ ] FAIL
  Consumer Web loads:    [ ] PASS / [ ] FAIL
  Organizer Web loads:   [ ] PASS / [ ] FAIL
  Venue Web loads:       [ ] PASS / [ ] FAIL
  Promoter Web loads:    [ ] PASS / [ ] FAIL
  Admin Web loads:       [ ] PASS / [ ] FAIL

  GATE 1 STATUS:         [ ] PASS / [ ] FAIL / [ ] BLOCKED
```

---

## Remaining Gate Templates (Blocked Pending Gate 1)

### Gate 2: Database & Migrations
```text
STATUS: BLOCKED on Gate 1

Commands to execute once Gate 1 passes:
  pnpm --filter @platform/api db:migrate
  pnpm --filter @platform/api db:seed:staging

Verification:
  - All 57 tables exist in Supabase table editor
  - RLS policies active on tickets, orders, organizations
  - Supabase Auth test users created and linked to users table records
  - Pre-validation database snapshot taken
```

### Gate 3: Razorpay Test Mode Payment Lifecycle
```text
STATUS: BLOCKED on Gate 1

Scenarios to execute (7 payment paths):
  1. Happy path: test card → webhook → order paid → ticket issued
  2. Declined: 402 → order remains pending
  3. Dismissal: modal closed → hold timer continues
  4. Delayed webhook: auto-polling resolves
  5. Duplicate webhook: idempotent 200 OK, no second ticket
  6. Expired hold: auto-refund, no ticket issued
  7. Amount tamper: webhook rejected, audit log created
```

### Gate 4: Real PostgreSQL Concurrency
```text
STATUS: 🔴 BLOCKED — NOT YET RUN

When Gate 2 passes:
  pnpm --filter @platform/api test:concurrency

Record actual results here:
  Scanner:    success = ?, already_used = ?, duplicates = ?
  Inventory:  holds = ?, conflicts = ?, oversold = ?
```

### Gates 5–11
```text
All BLOCKED pending Gates 1–4.

Gate 5 (Scanner Mobile & Offline Sync): TestFlight / Internal Track builds required
Gate 6 (Refunds & Finance): Depends on Gate 3 payment success
Gate 7 (Notification Outbox): FCM + Email provider staging credentials required
Gate 8 (Analytics & Telemetry): Depends on Gate 1 + real events flowing
Gate 9 (Security & RBAC): Depends on seeded multi-tenant accounts (Gate 2)
Gate 10 (Load & Performance): k6/Artillery test suite; depends on Gate 1
Gate 11 (Physical Hardware): Physical iOS + Android devices with TestFlight builds
```

---

## Staged Execution Order

```text
STEP   ACTION                                       OWNER
─────────────────────────────────────────────────────────────────
  1    Create Supabase staging project               Operator
  2    Create Managed Redis                          Operator
  3    Generate staging ECDSA P-256 keypair          Operator
  4    Retrieve Razorpay test credentials            Operator
  5    Configure email/SMS/FCM staging credentials   Operator
  6    Deploy NestJS API with all env vars           Operator / Antigravity assist
  7    Verify GET /health and GET /health/ready      Operator / Antigravity verify
  8    Run Drizzle migrations                        pnpm --filter @platform/api db:migrate
  9    Run staging seed                              pnpm --filter @platform/api db:seed:staging
 10    Verify 57 tables + seed data in Supabase      Operator
 11    Create Supabase Auth users linked to seed     Operator (Supabase dashboard)
 12    Deploy 5 Next.js apps with NEXT_PUBLIC_ vars  Operator / Vercel CI
 13    Verify all 5 web apps load + auth works       Operator + Antigravity browser
 14    Configure Razorpay webhook URL in dashboard   Operator
 15    GATE 1 verification checklist                 Operator + Antigravity
 16    GATE 2 verification (DB + Migrations)         Operator + Antigravity
 17    GATE 3 verification (Razorpay scenarios)      Operator + Antigravity
 18    GATE 4 real concurrency test                  pnpm --filter @platform/api test:concurrency
 19    Install Scanner app on physical iPhone        Operator (TestFlight)
 20    Install Scanner app on physical Android       Operator (Internal Track)
 21    GATES 5–11 sequentially                       Operator + Antigravity
 22    Record GO / NO-GO decision                    Operator
```

---

## Sign-Off Matrix

| Gate | Description | Date | Result | Sign-off |
| :---: | :--- | :---: | :---: | :---: |
| 1 | Infrastructure & Network | — | ⏳ | — |
| 2 | Database & Migrations | — | ⏳ | — |
| 3 | Razorpay Test Mode | — | ⏳ | — |
| 4 | Real PostgreSQL Concurrency | — | 🔴 BLOCKED | — |
| 5 | Scanner Mobile & Offline Sync | — | ⏳ | — |
| 6 | Refunds & Finance Ledger | — | ⏳ | — |
| 7 | Notification Outbox | — | ⏳ | — |
| 8 | Analytics & Telemetry | — | ⏳ | — |
| 9 | Security & RBAC Isolation | — | ⏳ | — |
| 10 | Load & Performance | — | ⏳ | — |
| 11 | Physical iOS + Android Hardware | — | 🔴 BLOCKED | — |

```text
OVERALL PRODUCTION READINESS:   ❌ NOT YET — STAGING IN PROGRESS
```
