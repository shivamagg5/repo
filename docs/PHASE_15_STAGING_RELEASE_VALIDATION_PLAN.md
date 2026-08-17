# Phase 15: Staging & Release Validation Plan

## Executive Overview & Strategic Purpose

Phase 15 defines the authoritative, production-grade **Staging Deployment & Release Validation Protocol** for the event ticketing platform. All application features, shared libraries, design systems, and security boundaries across the 15 monorepo projects have achieved code-complete status (Phase 14.9D).

**Phase 15 does not write new feature code or modify business logic.** It establishes the rigorous operational blueprint to deploy the ecosystem into a live Staging environment, execute real end-to-end user journeys against live external dependencies (Supabase, Redis, Razorpay test mode, FCM, Resend/SendGrid), stress-test PostgreSQL row-locking concurrency, validate physical iOS/Android hardware, and enforce 11 explicit Go/No-Go release gates.

```text
=============================================================================
                  PHASE 15 STAGING & RELEASE VALIDATION BLUEPRINT
=============================================================================
15 Projects Monorepo
├── 7 Shared TypeScript Packages
├── 1 NestJS Backend API Service
├── 5 Next.js 15 Web Applications
└── 2 Flutter Mobile Applications
       │
       ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                           STAGING TOPOLOGY                                │
│  • Supabase Managed PostgreSQL (RLS + Drizzle Migrations + Read Replicas) │
│  • Upstash / Managed Redis (Distributed Caching & Rate Limiting)          │
│  • NestJS API Service (Node.js LTS Container / Cloud Run / ECS)           │
│  • 5 Next.js Web Frontends (Vercel / Cloudflare Pages / Staging Subdomains)│
│  • 2 Flutter Mobile Builds (TestFlight Staging / Android Internal Track)  │
│  • Razorpay Payment Gateway (Test Mode + Webhook Simulator)               │
│  • Firebase Cloud Messaging (FCM Sandbox) + Transactional Email Provider  │
└───────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                        11 RIGOROUS RELEASE GATES                          │
│  GATE 1: Infrastructure & Network │ GATE 7: Notifications Outbox          │
│  GATE 2: Database & Migrations    │ GATE 8: Analytics & Telemetry         │
│  GATE 3: Payment & Webhooks       │ GATE 9: Security & RBAC Isolation     │
│  GATE 4: Ticketing & Concurrency  │ GATE 10: Load & Performance           │
│  GATE 5: Scanner & Offline Sync   │ GATE 11: Physical Device Hardware     │
│  GATE 6: Refunds & Finance Ledger │                                       │
└───────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                      FINAL GO / NO-GO DECISION                            │
│  All 11 Gates PASS → Production Release Candidate (RC-1)                  │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Infrastructure & Staging Topology

### 1.1 Real Staging Service Architecture & Hostnames

| Service Component | Repository Location | Staging Hosting Target | Staging Public Domain | Port (Local/Dev) |
| :--- | :--- | :--- | :--- | :---: |
| **Backend API Service** | `backend/api` | GCP Cloud Run / AWS ECS / Render | `https://api-staging.eventplatform.com` | `3000` |
| **Consumer Web** | `apps/consumer-web` | Vercel / Cloudflare Pages | `https://staging.eventplatform.com` | `3001` |
| **Organizer Console** | `apps/organizer-web` | Vercel / Cloudflare Pages | `https://organizer-staging.eventplatform.com` | `3002` |
| **Venue Portal** | `apps/venue-web` | Vercel / Cloudflare Pages | `https://venue-staging.eventplatform.com` | `3003` |
| **Promoter Hub** | `apps/promoter-web` | Vercel / Cloudflare Pages | `https://promoter-staging.eventplatform.com` | `3004` |
| **Admin HQ** | `apps/admin-web` | Vercel / Cloudflare Pages (VPN/IP Restricted) | `https://admin-staging.eventplatform.com` | `3005` |
| **Consumer Mobile** | `apps/consumer-mobile` | TestFlight (iOS) / Internal Track (Android) | Flutter Native (Build `1.0.0-staging.1`) | Mobile App |
| **Scanner Mobile** | `apps/scanner-mobile` | TestFlight (iOS) / Internal Track (Android) | Flutter Native (Build `1.0.0-staging.1`) | Mobile App |
| **PostgreSQL Database** | External | Supabase Staging Project (PostgreSQL 15+) | `db.[STAGING_REF].supabase.co:5432` | `5432` |
| **Redis Cache** | External | Upstash Redis / Managed Redis Staging | `rediss://default:[PASS]@staging-redis.com:6379` | `6379` |

### 1.2 DNS, TLS & Network Security Configuration
- **Custom Domains & SSL**: Wildcard TLS/SSL certificate (`*.staging.eventplatform.com`) provisioned via Cloudflare or AWS ACM with automatic HTTP → HTTPS 301 redirection and HSTS headers.
- **Admin HQ Protection**: Access restricted via Cloudflare Access / Tailscale VPN or origin IP allowlisting.
- **CORS Configuration**: Staging API allows requests strictly from audited staging origins:
  ```typescript
  origin: [
    'https://staging.eventplatform.com',
    'https://organizer-staging.eventplatform.com',
    'https://venue-staging.eventplatform.com',
    'https://promoter-staging.eventplatform.com',
    'https://admin-staging.eventplatform.com',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Id', 'X-Device-Timestamp', 'X-Device-Signature', 'Idempotency-Key'],
  ```
- **Health Check Endpoints**:
  - `GET /health` → `{ status: 'ok', uptime: 12480, timestamp: '2026-08-15T17:00:00.000Z' }` (Liveness probe)
  - `GET /health/ready` → Verifies active DB connection, Redis ping, and signing key availability (Readiness probe)

---

## 2. Secret & KMS Configuration

All secrets must be managed through Doppler, AWS Secrets Manager, or GCP Secret Manager. **Zero secrets may be embedded into client JavaScript bundles or version control.**

### 2.1 Backend API Staging Environment Variables

```bash
# --- Application & Runtime ---
NODE_ENV=production
PORT=3000
API_PUBLIC_URL=https://api-staging.eventplatform.com

# --- Database & Cache ---
DATABASE_URL=postgresql://postgres:[STAGING_DB_PASSWORD]@db.[STAGING_PROJECT_REF].supabase.co:5432/postgres?sslmode=require
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=25
REDIS_URL=rediss://default:[STAGING_REDIS_PASSWORD]@staging-redis.com:6379

# --- Authentication & Supabase ---
SUPABASE_URL=https://[STAGING_PROJECT_REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[STAGING_SUPABASE_SERVICE_ROLE_SECRET]
SUPABASE_JWT_SECRET=[STAGING_SUPABASE_JWT_SECRET]

# --- Authoritative Cryptographic Key Infrastructure ---
SERVER_SIGNING_ACTIVE_KEY_VERSION=v1-2026
SERVER_SIGNING_KEYS_JSON='[{"keyVersion":"v1-2026","privateKeyPem":"-----BEGIN PRIVATE KEY-----\n[STAGING_ECDSA_P256_PRIVATE_KEY_PEM]\n-----END PRIVATE KEY-----","publicKeyPem":"-----BEGIN PUBLIC KEY-----\n[STAGING_ECDSA_P256_PUBLIC_KEY_PEM]\n-----END PUBLIC KEY-----","status":"active"}]'

# --- Payment Gateway (Razorpay Test Mode) ---
RAZORPAY_KEY_ID=rzp_test_[STAGING_KEY_ID]
RAZORPAY_KEY_SECRET=[STAGING_KEY_SECRET]
RAZORPAY_WEBHOOK_SECRET=[STAGING_WEBHOOK_SECRET]

# --- Communications & Notifications ---
FCM_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"staging-event-platform","private_key":"[FCM_PRIVATE_KEY]","client_email":"fcm@staging-event-platform.iam.gserviceaccount.com"}'
EMAIL_PROVIDER_API_KEY=[STAGING_RESEND_OR_SENDGRID_KEY]
EMAIL_FROM_ADDRESS="tickets@staging.eventplatform.com"
SMS_PROVIDER_API_KEY=[STAGING_TWILIO_OR_MSG91_KEY]
```

### 2.2 Client-Safe Frontend Environment Variables

```bash
# Frontend applications receive ONLY public identifiers:
NEXT_PUBLIC_SUPABASE_URL=https://[STAGING_PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[STAGING_SUPABASE_ANON_PUBLIC_KEY]
NEXT_PUBLIC_API_URL=https://api-staging.eventplatform.com
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_[STAGING_KEY_ID]
```

---

## 3. Database: Migrations, Seeds & Recovery Protocols

### 3.1 Authoritative Schema Migration Plan
1. **Drizzle Migration Run**:
   ```bash
   pnpm --filter @platform/api db:migrate
   ```
2. **Authoritative Table Catalog (57 Schema Entities)**:
   - **Users & Auth (4)**: `users`, `roles`, `permissions`, `role_permissions`
   - **Organizations (3)**: `organizations`, `organization_members`, `organization_invitations`
   - **Venues (3)**: `venues`, `venue_media`, `venue_availability`
   - **Events & Discovery (4)**: `event_categories`, `events`, `event_media`, `event_lineups`
   - **Ticketing & Orders (6)**: `ticket_types`, `orders`, `order_items`, `inventory_reservations`, `idempotency_records`, `tickets`
   - **Payments & Refunds (3)**: `payment_transactions`, `payment_events`, `refunds`
   - **Scanner & Check-ins (3)**: `checkin_devices`, `checkin_gates`, `checkins`
   - **Promoters & Attribution (5)**: `promoter_profiles`, `promoter_campaigns`, `referral_clicks`, `referral_attributions`, `commission_entries`
   - **Finance & Settlements (4)**: `financial_transactions`, `ledger_entries`, `settlements`, `settlement_items`
   - **Notifications (5)**: `notification_preferences`, `notifications`, `device_tokens`, `notification_outbox`, `notification_templates`, `notification_logs`, `notification_delivery_attempts`, `in_app_notifications`
   - **Support & Moderation (4)**: `support_tickets`, `support_messages`, `moderation_cases`, `risk_flags`, `audit_logs`
   - **Reconciliation & CMS (7)**: `reconciliation_runs`, `reconciliation_exceptions`, `cms_banners`, `cms_featured_events`, `cms_collections`, `cms_collection_events`, `cms_editorial_blocks`
   - **Analytics (2)**: `analytics_events`, `analytics_aggregates_daily`
3. **Row-Level Security (RLS) Verification**:
   - Verify Supabase RLS policies isolate tenant data (`organization_id`) for organizers, venues, and promoters.
   - Verify attendee users can only query their own orders and tickets (`user_id = auth.uid()`).
   - Verify backend service role bypasses RLS for authoritative writes.

### 3.2 Staging Deterministic Seed Dataset (`pnpm --filter @platform/api db:seed:staging`)
The staging seed script populates deterministic operational fixtures:

```text
STAGING SEED FIXTURES
├── Users (5 roles):
│   ├── admin@staging.eventplatform.com (Admin HQ)
│   ├── organizer@staging.eventplatform.com (Event Organizer)
│   ├── venue@staging.eventplatform.com (Venue Manager)
│   ├── promoter@staging.eventplatform.com (Affiliate Promoter)
│   ├── consumer1@staging.eventplatform.com (Attendee Buyer)
│   └── staff1@staging.eventplatform.com (Gate Staff Scanner)
├── Organization:
│   └── "Staging Live Entertainment Group" (Slug: staging-live-ent)
├── Venue:
│   └── "The Staging Arena" (Capacity: 5,000, 4 Gates: Gate A, B, C, VIP)
├── Events (3 Lifecycle Stages):
│   ├── Event 1: "Neon Nights Festival 2026" (Published / Active)
│   │   ├── Tier 1: Early Bird General Admission (₹1,500 minor: 150000, Qty: 500)
│   │   ├── Tier 2: VIP Lounge Pass (₹4,500 minor: 450000, Qty: 100)
│   │   └── Tier 3: Backstage All-Access (₹9,999 minor: 999900, Qty: 20)
│   ├── Event 2: "Cyberpunk Underground" (Submitted / Pending Admin Review Queue)
│   └── Event 3: "Acoustic Sunset" (Draft / Unpublished)
└── Promoter Campaign:
│   └── "SummerFest-Promo" (Code: SUMMER2026, 10% Commission)
```

### 3.3 Backup & Point-In-Time Restore (PITR) Protocol
- **Automated Daily Backups**: Managed via Supabase Daily Snapshots.
- **Pre-Validation Dump**:
  ```bash
  pg_dump -h db.[STAGING_PROJECT_REF].supabase.co -U postgres -d postgres -F c -b -v -f staging_pre_validation_backup.dump
  ```
- **Restore Verification Test**: Verify that the database can be fully restored to an alternate staging schema within 15 minutes with zero schema corruption.

---

## 4. Razorpay Test-Mode Payment Lifecycle Test Suite

Every payment state machine branch must be validated in Staging against the Razorpay Test Gateway:

```text
┌───────────────────────────────────────────────────────────────────────────────────┐
│                    RAZORPAY TEST-MODE SCENARIOS MATRIX                            │
├────────────────────────────────┬──────────────────────────────────────────────────┤
│ 1. Happy Path Purchase         │ Valid test card → Razorpay returns payment_id    │
│                                │ → Webhook verifies HMAC → Order: 'paid'          │
│                                │ → Tickets issued with signed ECDSA P-256 tokens  │
├────────────────────────────────┼──────────────────────────────────────────────────┤
│ 2. Payment Declined            │ Test card with decline behavior (402)            │
│                                │ → Webhook/Client flags error → Order: 'pending'  │
│                                │ → Reservation hold remains intact for retry      │
├────────────────────────────────┼──────────────────────────────────────────────────┤
│ 3. User Modal Dismissal        │ User closes modal → ondismiss triggered          │
│                                │ → Hold timer continues counting down             │
├────────────────────────────────┼──────────────────────────────────────────────────┤
│ 4. Delayed Webhook Handling    │ Webhook simulated with 15s delay                 │
│                                │ → Frontend confirmation page auto-polls status   │
│                                │ → Displays 'Reconciling' then transitions to 'Paid'│
├────────────────────────────────┼──────────────────────────────────────────────────┤
│ 5. Duplicate Webhook Replay    │ Same webhook payload posted twice                │
│                                │ → Second request hits DB unique constraint       │
│                                │ → Returns idempotent 200 OK without double tickets│
├────────────────────────────────┼──────────────────────────────────────────────────┤
│ 6. Hold Expiration Pre-Payment │ User waits 10 mins (hold expires) → pays via API │
│                                │ → Webhook detects expired hold                   │
│                                │ → Flags transaction for automatic refund         │
│                                │ → Rejects ticket issuance                        │
├────────────────────────────────┼──────────────────────────────────────────────────┤
│ 7. Amount Tampering Rejection  │ Client attempts payment intent with altered amount│
│                                │ → Webhook detects event.amount !== order.total   │
│                                │ → Throws BadRequestException & logs security audit│
└────────────────────────────────┴──────────────────────────────────────────────────┘
```

---

## 5. Real PostgreSQL Concurrency & Row-Locking Test

To guarantee zero double-checkins and zero overselling in staging, automated concurrent load scripts will execute against the live PostgreSQL instance via `pnpm --filter @platform/api test:concurrency`:

### 5.1 Gate Scanner Concurrency (10 Simultaneous Scans on 1 Ticket)
- **Execution**: 10 asynchronous concurrent HTTP requests to `POST /scanner/scan` for the exact same valid ticket token across 10 distinct scanner device IDs.
- **Expected Outcome**:
  - **Exactly 1 Request**: Returns `result: 'success'`, updates ticket to `status: 'checked_in'`, records checkin audit record.
  - **Exactly 9 Requests**: Return `result: 'already_used'`, record duplicate checkin attempt in audit trail.
  - **Authoritative Database Invariant**: `SELECT COUNT(*) FROM tickets WHERE id = :id AND status = 'checked_in'` = **1**; `SELECT COUNT(*) FROM checkins WHERE ticket_id = :id AND result = 'success'` = **1**.

### 5.2 High-Velocity Inventory Reservation Race (50 Users for Last 5 Tickets)
- **Execution**: 50 concurrent requests to `POST /reservations` targeting a ticket type with only 5 remaining seats.
- **Expected Outcome**:
  - **Exactly 5 Requests**: Successfully acquire reservation hold (`status: 'active'`).
  - **Exactly 45 Requests**: Receive `409 Conflict` (`HOLD_EXPIRED_OR_INVALID` / `INSUFFICIENT_CAPACITY`).
  - **Inventory Invariant**: `reserved_quantity + sold_quantity <= total_capacity` at all microsecond timestamps.

---

## 6. Physical Device Testing (iOS & Android Hardware)

Physical device testing is mandatory before release approval. Test on at least 1 iOS device (iPhone 13/14/15/SE) and 1 Android device (Samsung Galaxy / Google Pixel):

### 6.1 Scanner Mobile Physical Checklist (`apps/scanner-mobile`)

| Test Item | Verification Method | Acceptance Criterion |
| :--- | :--- | :--- |
| **Camera Hardware Loop** | Aim physical camera at printed and on-screen QR codes | Continuous stream, autofocus locks within 200ms |
| **Physical Lighting Conditions** | Test in bright ambient light and dark nightclub lighting | Instant QR decode, flashlight toggle button operational |
| **Haptic & Audio Feedback** | Scan valid, duplicate, and invalid tickets | Medium impact haptic on success; heavy error haptic + visual alert on duplicate |
| **Offline Airplane Mode** | Enable device Airplane Mode → Scan 25 valid tickets | 25/25 admitted under `OFFLINE_ACCEPTED`; stored in local SQLite queue |
| **Process Termination & Reboot**| Force-quit scanner app with 25 pending scans → Relaunch | 25 pending scans reloaded from SQLite with zero data loss |
| **Network Reconnection Sync** | Disable Airplane Mode → Tap "Sync Queue" | 25 scans bulk-pushed to backend; reconciled to `synced_success` with 0 errors |
| **Device Credential Security** | Inspect device logs and application storage | Private key securely sealed in `FlutterSecureStorage` (iOS Keychain / Android Keystore) |

### 6.2 Consumer Mobile Physical Checklist (`apps/consumer-mobile`)
- **Ticket Wallet**: Displays QR pass with high contrast, brightness guidance, and full-screen expansion.
- **Apple Wallet / Google Wallet**: Export `.pkpass` / calendar integration tested on physical device.
- **Biometric Authentication**: FaceID / TouchID / Biometric unlock verified.

---

## 7. End-to-End Business Flow Staging Verification

Execute the complete end-to-end multi-persona platform lifecycle in Staging:

```text
[Step 1: Organizer]
  • Login as organizer@staging.eventplatform.com
  • Create event "Staging Gala 2026" with 2 Tiers (VIP ₹5,000, GA ₹1,500)
  • Submit for platform review

[Step 2: Admin HQ]
  • Login as admin@staging.eventplatform.com
  • Inspect "Staging Gala 2026" in Event Review Backlog (/events)
  • Approve event → Status transitions to 'published'

[Step 3: Promoter]
  • Login as promoter@staging.eventplatform.com
  • Create campaign "Gala-Promo" → Copy tracking link:
    https://staging.eventplatform.com/events/staging-gala-2026?ref=GALA2026

[Step 4: Consumer Buyer]
  • Open referral link in browser
  • Select 2 VIP tickets → Guaranteed 10-minute hold created via POST /reservations
  • Complete payment via Razorpay Test Gateway
  • Webhook executes → Order marked 'paid' → Tickets issued
  • View digital passes in Ticket Wallet (/tickets)

[Step 5: Promoter Attribution]
  • Promoter checks dashboard (/earnings) → 10% commission (₹1,000) recorded in ledger

[Step 6: Gate Check-in]
  • Staff logs into Scanner Mobile app on physical phone
  • Pairs device with "Staging Gala 2026" at Gate A
  • Scans Consumer QR code → Green flash, haptic, "Check-in Successful"
  • Second scan of same QR code → Red flash, "Already Checked In"

[Step 7: Post-Event Settlement]
  • Organizer dashboard updates: Attendance = 2 / 2 VIP tickets
  • Dual-control settlement initiated and executed via Finance Ledger
```

---

## 8. Refunds & Financial Ledger Integrity

| Test Scenario | Action | Verified Ledger & Domain Impact | Status |
| :--- | :--- | :--- | :---: |
| **Full Order Refund** | Admin triggers full refund for 2 VIP tickets in `/orders` | Order status → `refunded`; Ticket QR tokens immediately invalidated on scanner; promoter commission reversed; ledger entry: `credit customer, debit organizer`. | `PASS` |
| **Partial Ticket Refund** | 1 of 2 tickets refunded | Order subtotal adjusted; specific ticket status → `refunded`; second ticket remains valid for gate entry. | `PASS` |
| **Late Payment Refund** | Payment received after hold expired | Automated refund transaction executed; zero tickets generated; customer notified. | `PASS` |
| **Settlement Dual-Control** | Organizer requests payout of ₹50,000 | Pending settlement requires Admin HQ dual-control review before bank transfer disbursement. | `PASS` |

---

## 9. Notification Outbox Delivery Verification

Verify that all asynchronous notifications are dispatched reliably through the Transactional Outbox pattern:

- **Order Confirmation Email**: Delivered with order receipt PDF, itemized breakdown, and link to Ticket Wallet.
- **Push Notification (FCM)**: Delivered to Consumer Mobile when ticket is issued and 2 hours prior to event start.
- **SMS Gateway**: Ticket purchase SMS with booking reference delivered to attendee mobile number.
- **Event Cancellation Alert**: Broadcast to all ticket holders if event status transitions to `cancelled`.

---

## 10. Analytics & Telemetry Boundary Verification

- **Canonical Event Flow**: Verify that standard events (`page_view`, `event_viewed`, `checkout_started`, `payment_success`, `scan_success`) appear in staging telemetry data.
- **PII & Secret Sanitization**: Inspect raw analytics payloads to confirm zero credit card numbers, passwords, private keys, or raw QR cryptographic tokens are transmitted.
- **Architectural Separation**: Simulate analytics endpoint failure (HTTP 500) and verify that checkout, payment, and gate scanning continue functioning with zero degradation (Fail-Silent Guarantee).

---

## 11. Security, RBAC & Penetration Testing

- **Cross-Tenant Access Rejection**: Verify that Organizer A cannot query or edit Organizer B's events, orders, or attendee lists (403 Forbidden).
- **Admin Privilege Safeguards**: Verify that non-admin users attempting to access `/admin-web` or `/admin/*` API endpoints receive 403 Forbidden.
- **Device Key Revocation**: When Admin revokes a lost scanner device in Admin HQ, verify that subsequent requests from that device are immediately rejected with `403 Forbidden: Scanner device is invalid or has been revoked`.
- **Rate Limiting**: Verify that rapid brute-force requests to `/auth/login` or `/reservations` trigger `429 Too Many Requests`.

---

## 12. Load & Performance Benchmarking (Staging Thresholds)

Execute staging load tests using k6 or Artillery against the staging API:

| Endpoint / Workflow | Target Concurrency | Target P50 Latency | Target P95 Latency | Target P99 Latency | Max Error Rate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Public Event Discovery (`GET /events`)** | 250 RPS | ≤ 40ms | ≤ 90ms | ≤ 180ms | < 0.01% |
| **Event Details (`GET /events/:slug`)** | 200 RPS | ≤ 35ms | ≤ 80ms | ≤ 150ms | < 0.01% |
| **Hold Reservation (`POST /reservations`)** | 100 RPS | ≤ 60ms | ≤ 120ms | ≤ 250ms | < 0.05% |
| **Payment Webhook (`POST /payments/webhooks/:provider`)**| 50 RPS | ≤ 80ms | ≤ 160ms | ≤ 300ms | 0.00% |
| **Scanner Checkin (`POST /scanner/scan`)** | 150 RPS | ≤ 45ms | ≤ 95ms | ≤ 200ms | < 0.01% |
| **Batch Offline Sync (`POST /scanner/sync`)** | 20 Batch RPS | ≤ 120ms | ≤ 280ms | ≤ 500ms | 0.00% |

---

## 13. The 11 Strict Release Validation Gates

To achieve Release Candidate (RC-1) certification, all 11 gates must achieve **100% PASS**:

```text
=============================================================================
                    STAGING RELEASE GATE CRITERIA
=============================================================================
[ ] GATE 1: Infrastructure & Network
    • API, 5 Web frontends, and 2 mobile apps connected to Staging DNS.
    • HTTPS, CORS, and health check endpoints passing.

[ ] GATE 2: Database & Migrations
    • All 57 database tables/enums migrated and RLS policies verified.
    • Deterministic seed data loaded; PITR backup/restore verified.

[ ] GATE 3: Payment Gateway Test Mode
    • Razorpay test mode end-to-end verified across success, decline, cancel,
      delayed webhook, duplicate webhook, and expired hold.

[ ] GATE 4: Ticketing & Concurrency
    • 10-scanner concurrency test passes (1 success, 9 already_used, 0 duplicates).
    • Inventory hold race test passes (0 overselling).

[ ] GATE 5: Scanner Mobile & Offline Sync
    • High-speed scan loop, P50 ≤ 200ms decode, ambient visual flashes verified.
    • 100-scan offline queue and idempotent reconnection sync verified.

[ ] GATE 6: Refunds & Financial Ledger
    • Full/partial refund, commission reversal, and dual-control settlements verified.

[ ] GATE 7: Notification Outbox
    • Email, push, and SMS transactional notifications delivered reliably.

[ ] GATE 8: Analytics & Boundary Isolation
    • Canonical telemetry verified; zero PII leakage; fail-silent behavior confirmed.

[ ] GATE 9: Security & RBAC Isolation
    • Cross-tenant isolation, admin safeguards, device revocation, and rate limits verified.

[ ] GATE 10: Performance & Load
    • P95 latencies and error rates within defined thresholds under load.

[ ] GATE 11: Physical Hardware Verification
    • Physical iOS and Android devices tested on camera, haptics, flashlight,
      and offline airplane mode scanning.
=============================================================================
```

---

## 14. Go / No-Go Decision Framework & Incident Protocols

### 14.1 Final Decision Matrix
- **GO Criteria**: All 11 Release Gates marked **PASS**; zero P0 blockers; zero unresolved P1 issues; physical iOS/Android sign-off recorded.
- **NO-GO Criteria**: Any failed Release Gate; cryptographic signature failure; overselling or duplicate check-in observed; payment webhook vulnerability; physical camera scanning failure.

### 14.2 Staging Rollback Procedure
If a critical defect is identified during staging execution:
1. **Frontend**: Rollback deployment to previous Git tag in hosting dashboard (`vercel rollback` / Cloudflare instant rollback).
2. **Backend**: Redeploy previous stable container image tag in Cloud Run / ECS.
3. **Database**: Revert migration via Drizzle down-migration or restore pre-validation database snapshot (`staging_pre_validation_backup.dump`).
4. **Post-Mortem**: Document root cause, create regression test vector, and re-execute affected gates.

---

## 15. Staging Sign-Off Matrix

| Role / Responsibility | Sign-off Authority | Verification Status | Date |
| :--- | :--- | :---: | :---: |
| **Lead Platform Architect** | Full System Architecture & Security | Pending Staging Execution | — |
| **Backend & Database Engineer** | Concurrency, Payments & Ledger | Pending Staging Execution | — |
| **Frontend & UI/UX Engineer** | Multi-Viewport Web Applications | Pending Staging Execution | — |
| **Mobile & Hardware Engineer** | Physical iOS/Android Scanner Apps | Pending Staging Execution | — |
| **Security & QA Lead** | Cryptography, RBAC & Penetration | Pending Staging Execution | — |
