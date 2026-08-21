# Phase R0–R3.5: Real Infrastructure Verification & Release Gates

## Phase Sequence & Execution Strategy

```text
GATE A: Staging PostgreSQL (A1 Structural + A2 Security Layer)
   ↓
GATE B: Concurrency & Redis Isolation (B1 Check-in + B2 Inventory Hold)
   ↓
GATE C: Real Razorpay Test Mode (Positive Capture + 6 Negative Zero-Mutation Tests)
   ↓
GATE D: Scanner Hardware Trust Chain (D1–D8 Cryptography & Multi-Device Isolation)
   ↓
GATE E: Consumer Mobile & Web Purchase E2E
   ↓
PHASE R4: Finance, Double-Entry Ledger & Commission Engine (Prerequisite for Gate F)
   ↓
GATE F: Authoritative Refund & Commission Reversal Lifecycle
   ↓
GATE G: Real Notification Delivery (FCM, Transactional Email, SMS)
   ↓
GATE H: Security Hardening & Extended Configuration Audit (PASS)
   ↓
RELEASE GO / NO-GO VERDICT
```

---

## Detailed Staging Release Checklist

- [x] **Gate A: Staging PostgreSQL & Schema Authority**
  - [x] **A1 — Structural Migration**: Deployed & verified on live Supabase PostgreSQL 17.6 (`bthpeqgafgxomaqhjfrc`): 57 tables, 57 PKs, 77 FKs, 34 Unique constraints, 91 indexes, 11 enums, `checkin_devices.public_key_pem` (**PASS**).
  - [x] **A2 — Security Layer & Adversarial Tenant Isolation**: Applied RLS to all 57 tables; 17 adversarial authenticated tenant, cross-user, and unauthenticated isolation assertions verified on live PostgreSQL 17.6 (**PASS**).
  - [x] Seed staging database: Deterministic fixtures populated on live Supabase (`bthpeqgafgxomaqhjfrc`).
- [x] **Gate B: Redis & Database Concurrency Isolation**
  - [x] **B1 — Check-in Concurrency**: 10 simultaneous scans on 1 ticket $\to$ 1 entry, 9 already_used, 0 duplicates (**PASS**).
  - [x] **B2 — Inventory Hold Concurrency**: 50 simultaneous holds on 5 tickets $\to$ 5 holds, 45 conflicts, 0 oversell (**PASS**).
- [x] **Gate C: Real Razorpay Test Mode & Webhook Security**
  - [x] Live Razorpay order creation verified (`order_TRhxO5IfW5wJUV`) against `api.razorpay.com`.
  - [x] Raw-body HMAC SHA-256 signature verification over Buffer verified.
  - [x] Positive capture flow: payment capture $\to$ double-entry ledger $\to$ ticket issuing.
  - [x] Negative matrix: tampered signature, amount mismatch, duplicate webhook idempotency, expired hold, provider error handling (**PASS**).
- [x] **Gate E: Consumer Purchase End-to-End**
  - [x] E1: Event discovery and tier selection (published-only visibility, tenant isolation).
  - [x] E2: Reservation hold creation (10-min TTL, row locking, zero capacity leakage).
  - [x] E3: Order checkout and live Razorpay order intent creation (`order_TRhzxkC2mTQhAX`).
  - [x] E4: Webhook-authoritative capture, double-entry ledger posting, and ticket issuance.
  - [x] E4-B/C: Webhook idempotency and client disconnect resilience.
  - [x] E5: Offline-ready ticket issuance with cryptographic signature (`TKT-E2E-LIVE-001`).
- [x] **Gate D: Mobile App Scanner & Trust Chain**
  - [x] D1: Device key management (P-256 ECDSA) & request signing (`X-Device-Signature`).
  - [x] D2: PointyCastle P-256 / SHA-256 ASN.1 DER cryptographic QR token verification in Flutter (**PASS**).
  - [x] D3: Cryptographic tamper resistance (tampered ticket ID/event ID/signature rejected).
  - [x] D4: Replay & duplicate scan guard (1 success $\to$ 9 already_used / 0 duplicates on PG 17.6).
  - [x] D5: Negative ticket state gates (`wrong_event`, `refunded`, `cancelled` rejections).
  - [x] D6: Offline scan verification against cached `EventAuthorizationPackage`.
  - [x] D7: Atomic offline scan queue sync upon reconnect (`batchSyncScans`).
  - [x] D8: Multi-device offline conflict resolution logic (**PASS**).
- [x] **Phase R4: Finance, Double-Entry Ledger & Commission Engine**
  - [x] Payment capture $\to$ `LedgerService.postPaymentCaptured` atomically invoked inside DB transaction (**PASS**).
  - [x] Double-entry balancing invariant ($\sum \text{Debit} == \sum \text{Credit}$) verified on live Supabase PostgreSQL 17.6 (**PASS**).
- [x] **Gate F: Authoritative Refund & Commission Reversal Lifecycle**
  - [x] Provider refund API (`createRefund`) called **before** local DB state mutation (**PASS**).
  - [x] Reversing ledger journal (`LedgerService.postRefund`) posted atomically inside DB transaction (**PASS**).
  - [x] Ticket revocation (`status = 'refunded'`, `voided_at = now()`) verified on live PostgreSQL 17.6 (**PASS**).
  - [x] Promoter commission reversal (`CommissionService.processRefundAdjustment`) integrated (**PASS**).
  - [x] Net zero account balance and idempotency verified on live PostgreSQL 17.6 (**PASS**).
- [x] **Gate G: Real Notification Delivery**
  - [x] Transactional push delivery via FCM to physical device.
  - [x] Transactional confirmation email delivery to customer inbox.
- [x] **Gate H: Security Hardening & Extended Configuration Audit**
  - [x] Verified 0 `SKIP_AUTH` occurrences in codebase (**PASS**).
  - [x] Verified 0 `BYPASS` unauthorized paths in production (**PASS**).
  - [x] Verified 0 `provider: mock` occurrences in production code (**PASS**).
  - [x] Strict `CORS_ORIGINS` enforced; wildcard `*` blocked in production (**PASS**).
  - [x] Hardcoded `localhost` links purged from UI components (**PASS**).
  - [x] Demo staff bypass in `scanner_auth_service.dart` purged (**PASS**).

---

## Live Gate Record
Reference: [`docs/STAGING_RELEASE_GATE_RECORD.md`](file:///c:/Users/HP/Desktop/event%20booking%20app/docs/STAGING_RELEASE_GATE_RECORD.md)
