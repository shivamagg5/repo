# Master Repository Audit — Current State

Audit date: 2026-08-19  
Scope: entire checked-out monorepo. Source code, executable configuration, migrations and command results take precedence over reports. No feature or production code was changed.

## Executive conclusion

The repository contains substantial application source and a useful set of unit-tested domain primitives. It is **not a deployable or secure event-money/scanner platform today**. The key failures are concrete: the API does not build; migration/RLS authority is split; the payment module permits a mock webhook self-payment; scanner mobile can create fake pairing state and does not perform cryptographic offline verification; and finance/settlement flows are disconnected from real payments.

For per-area status, see [CURRENT_PLATFORM_STATUS.md](CURRENT_PLATFORM_STATUS.md). For every routable page and mobile screen, see [ROUTE_INVENTORY.md](audits/ROUTE_INVENTORY.md). Command results are recorded in [COMMAND_RESULTS.md](audits/COMMAND_RESULTS.md).

## 1. Implemented, partial, missing, and scaffolded

- **Verified source primitives:** Nest response/error handling; Supabase JWT lookup when configured; organization RBAC helper; event lifecycle service; row-locking reservation code; basic ticket issuance; Razorpay raw-body HMAC computation; typed TypeScript API client; common web loading/error components.
- **Partial product surfaces:** all five web apps, consumer mobile, notifications, CMS, analytics, finance, settlement, inventory expiry and promoter workflows.
- **Broken product paths:** backend compilation, mobile order/checkout parsing, promoter campaign detail, scanner registration/pair/online/sync interoperability, refund lifecycle, finance scope.
- **Scaffold-only modules:** `RefundsModule`, `CommissionsModule`, `SupportModule`, and `ModerationModule` export no controllers/providers despite related schema/domain aspirations.
- **Not implemented/proven:** real production migration deployment, MFA/reauth policy, scanner device assignment/revocation workflow, payment-provider refunds, financial posting on payment/refund, notification worker, CMS full lifecycle/cache invalidation, saved events, live infrastructure and physical-device verification.

## 2. Fake, mock, fallback, and placeholder audit

| Occurrence | Classification | Release impact |
| --- | --- | --- |
| Mock payment gateway, literal `valid_mock_signature`, public mock webhook | Dangerous production fallback/test fixture exposed at runtime | P0 — direct payment bypass |
| Razorpay synthetic `providerOrderId` when provider API fails | Dangerous production fallback | P1 — checkout against no real provider order |
| Scanner fake `dev-scanner-gate-01`, local auth package, default gates/events, demo credentials, sample attendee/tier labels | Dangerous production fallback/fake operational state | P0 — false admission and misleading operators |
| Scanner in-memory queue | Legitimate test/desktop fallback only, but must be compile/config restricted | P1 |
| Consumer mobile local demo session and `ord_` confirmation path | Dangerous production demo path | P0/P1 |
| Cached mobile ticket wallet | Legitimate offline fallback; UI marks offline/live-status limitation | Safe if token lifecycle/revocation is completed |
| Category/presentation arrays, image placeholders, loading skeletons | Legitimate UI defaults | No release blocker |
| `setTimeout` UI success/copy dismissals | Legitimate UI feedback | No release blocker |

## 3. API contract assessment

The generated/typed TypeScript client is broad but has stale methods (`POST /orders`, promoter campaign detail). Web code is mostly aligned with it, except three consumer server pages that bypass it and use a wrong default API port. Both Flutter clients duplicate HTTP and have not reliably implemented the global response envelope. The scanner’s expected response fields differ materially from backend output.

The detailed endpoint/client/backend comparison is in [MISALIGNMENTS_AND_DRIFT.md](MISALIGNMENTS_AND_DRIFT.md).

## 4. Database/schema assessment

The active Drizzle schema declares **57 tables**. `drizzle.config.ts` uses `backend/api/src/database/migrations`, whose journal contains one generated baseline. `database/migrations` is separately described as canonical and includes RLS policies, but it is not the migration folder selected by Drizzle. This makes deployed schema, RLS, and upgrade order unknowable from source.

Additional findings:

- The active schema uses `bigint` in JavaScript `number` mode and application finance code uses floating percentage calculations.
- No ordinary query indexes are declared in the active Drizzle schema, despite many foreign-key/status/date query patterns.
- `checkin_devices` cannot store a device public key, approval/audit details, or event/gate assignment, contradicting its desired authorization model.
- Payment event records are deduplicated by provider event ID, but processing does not link/update the event status transactionally.
- Basic uniqueness exists for users, IDs, orders, ticket QR hashes, webhook IDs, checkin sync IDs, and several domain keys. That is useful but insufficient to prove live schema integrity.

## 5. Auth, RBAC, and tenancy security

Authentication validates Supabase tokens through the service-role client and creates an `AuthContext` when credentials are configured. `AuthGuard` and reusable RBAC helpers are present. Event and organization flows generally check ownership/membership in service code.

Security gaps:

- If Supabase service credentials are absent, middleware logs and passes through; guarded routes reject missing contexts, but any unintended unguarded route stays exposed.
- Flattened permissions query does not filter `organizationMembers.status = 'active'`, despite comments saying it does.
- Scanner routes apply only `AuthGuard`; they neither use `DeviceAuthGuard` nor verify staff assignment, organization membership, event ownership, gate assignment, or body device ownership.
- Scanner controllers read `req.user.sub`/`id`, but `AuthContext` exposes `userId`; their fallback zero UUID will be used for normal authenticated requests.
- Finance statement/generation access uses broad platform permission and does not prove target-org membership/segregation beyond review self-approval.

## 6. Payment security verdict

**PAYMENT SECURITY VERDICT: 🔴 CRITICAL VULNERABILITY.**

| Required question | Finding |
| --- | --- |
| Can a client mark an order paid? | **Yes, indirectly.** It can choose `provider: 'mock'` then post a publicly known valid mock signature to the public webhook. |
| Can a client issue tickets? | **Yes, through the same mock-webhook path.** Webhook success converts inventory and calls ticket issuance. |
| Can client convert inventory? | Not directly via the normal confirm route; the payment exploit converts it via webhook processing. |
| Can `/orders/:id/confirm` bypass payment? | Source has a verified paid-transaction guard; this specific route is protected, but it does not offset the mock webhook exploit. |
| Is Razorpay SDK launched? | Yes: web dynamically loads Checkout JS; consumer mobile instantiates `razorpay_flutter`. Real device/provider behavior is unverified. |
| Are raw webhook signatures verified? | Razorpay HMAC is calculated over raw body and compared timing-safely. Mock signature is insecure; configuration fallback must be removed. |
| Are replayed webhooks safe? | `provider_event_id` uniqueness has an intended replay path, but event processing metadata is incomplete. |
| Are amount/currency validated? | Yes against transaction and order, but only after gateway/provider choice flaw; event type is not restricted. |
| Are expired holds safe? | Late payment is flagged, but no actual refund is initiated. Hold expiry worker is not scheduled. |
| Are duplicate payments safe? | Row locks/checks are present for a paid transaction, but no provider reconciliation or duplicate charge/refund lifecycle is proven. |
| Are refunds safe? | No. Source changes order status and optional commission adjustment but does not invoke provider refund, create `refunds`, void tickets, release/reconcile inventory, or ledger-post. |
| Are commission reversals correct? | A service exists, but its optional catch is swallowed and no finance/settlement verification covers an actual provider refund. |

## 7. Ticketing and inventory

Reservations lock a ticket type with `FOR UPDATE`, check active/published saleability and limits, atomically reserve counters, snapshot prices, and create an order/hold. Payment conversion locks transaction/order/hold and moves reserved to sold. This is a sound starting pattern.

It is still partial because the production payment authority is compromised, hold expiry is only a callable service with no scheduler, price/fee/tax rules are baseline zeros, refund/cancellation ticket state reconciliation is absent, and no real PostgreSQL concurrency test was run. The normal backend tests use mocks.

## 8. Scanner security and offline semantics

Expected protocol is ECDSA P-256/SHA-256. The backend uses Node `prime256v1` and signs ticket payloads, but production key fallback is unsafe. The scanner mobile source imports cryptography packages but does not use them to validate the signatures. Its root trust string is static and cannot be trusted as matching the backend’s generated root; package verification returns true if a signature is merely non-empty and ticket verification returns true for any signature length of at least 10.

- **Online:** the backend check-in transaction has ticket row locking, but the client reads wrapped response incorrectly and the controller misses device/event/staff authorization.
- **Offline:** false security. Pair failures create a local package and scans can be queued/admitted using only structural checks.
- **Reconnect/sync:** backend has a `syncId` uniqueness model, but mobile expects different result fields and defaults all records to success when absent. Conflict audit semantics are therefore not honest.

## 9. Finance, notifications, CMS, analytics

- **Finance:** double-entry helper checks runtime debit/credit totals but is not invoked from paid/refund paths. Its journal number is timestamp/random, not idempotent. Settlement query totals all paid/refunded orders and commissions regardless of target organization/event, then uses float percentages. It cannot support payout.
- **Notifications:** tables/services/provider interfaces exist. There is no scheduler, `claimOutboxEvents` is not `FOR UPDATE SKIP LOCKED`, failed rows are not selected again, and no payment/ticket/event flow calls `enqueueEvent`.
- **CMS:** public banners/featured/editorial reads and create banner/collection exist. The sanitizer is regex stripping, not a robust HTML/URL policy. No update/delete/publish lifecycle or cache invalidation is present; consumer pages do not call CMS.
- **Analytics:** canonical taxonomy and property filtering exist. Several required emitted events are absent or renamed at call sites (for example scanner tracks `scan_approved`/`scan_denied`, not canonical success/invalid consistently). Organizer analytics has no org/event filtering; scanner and admin metrics contain hardcoded values.

## 10. UI/UX and performance assessment

The static consumer-mobile screenshot (`apps/consumer-mobile/flutter_01.png`) supports the requested dark purple/pink EventPulse direction; screen source uses Urbanist through Google Fonts and includes loading/error/empty components. The local external design image is visually a different lime “CultureVibe” identity, so it cannot be treated as a validated selected reference without a product decision. No executable browser/device visual run was possible because the backend build fails and the Flutter command did not complete.

Known functional UX problems outrank visual refinement: scanner visibly claims secure activation while using fake state, mobile checkout cannot reliably parse orders, B2B raw UUID inputs are operationally poor, and `Saved` is a deliberate deferred screen. Visual QA reports are documentation, not re-executed evidence.

Performance findings include missing FK/query indexes, promoter analytics N+1 campaign performance calls, unbounded/low-limit behavior in several lists, no durable outbox worker, and direct HTTP duplication across Flutter apps. No production load profile or database query plan was available.

## 11. Deployment and test assessment

CI builds shared packages/backend/webs and runs Flutter analysis/tests, but normal backend unit tests omit `test/app.e2e-spec.ts`; security audit is explicitly `continue-on-error`; and no migration/deploy step is configured. `render.yaml` sets CORS `*`, has no migration command, and does not establish Razorpay, Redis, FCM, email/SMS, KMS, domains, or device readiness.

Executed test/build evidence is deliberately limited to what actually ran; see [COMMAND_RESULTS.md](audits/COMMAND_RESULTS.md). Mocked unit tests do not constitute database, Redis, payment gateway, webhook, or physical device validation.

## 12. Fix queue and roadmap

The executable fix queue is [BUG_REGISTER.md](BUG_REGISTER.md). The ordered plan with ownership/complexity/dependencies is [NEXT_DEVELOPMENT_ROADMAP.md](NEXT_DEVELOPMENT_ROADMAP.md). Do not begin a feature roadmap until P0 blocks are resolved and staged.

## 13. Final executive verdict

| Area | Current status | Release blocker? | Next action |
| --- | --- | :---: | --- |
| Backend/API | BROKEN | YES | Fix public-event compile contract. |
| Schema/migrations | BROKEN | YES | Reconcile to one migration/RLS authority. |
| Payments | CRITICAL | YES | Remove mock path, constrain webhook events, then test provider path. |
| Ticketing | PARTIAL | YES | Operate expiry and complete payment/refund lifecycle. |
| Scanner | CRITICAL | YES | Build real crypto/device/assignment integration; remove fabricated fallbacks. |
| Consumer mobile checkout | BROKEN | YES | Normalize envelopes and remove demo confirmation behavior. |
| Finance/settlement | CRITICAL | YES | Atomic ledger/refund accounting and tenant scoping. |
| Web portals | PARTIAL | YES | Unblock backend; repair promoter detail and finance dependencies. |
| Notifications/CMS/analytics | PARTIAL | NO for basic staging after P0, YES for claimed completeness | Implement worker/lifecycle/authoritative metrics. |
| Deployment | CRITICAL | YES | Configure controlled migrations, secrets, origins and integration tests. |

### Totals and direct answers

Counts are area-level audit estimates, not file counts: **2 verified, 11 partial, 6 broken/critical, 4 missing/scaffolded, 8 documentation-drift items, 11 P0, 10 P1, and 6 P2 items**.

1. **Genuinely functional:** approximately **30%** of the intended platform surface is source-backed with coherent local behavior; much less is live-infrastructure verified.
2. **Mocked/placeholder/fallback:** approximately **25%** of user-visible/operational paths contain placeholder, demo, static or fabricated fallback behavior; scanner has the dangerous concentration.
3. **Single biggest security risk:** production-reachable mock payment webhook/provider selection lets an authenticated buyer mark their own order paid and receive tickets.
4. **Single biggest product risk:** gate staff can be shown successful pairing/admission while the scanner has neither trustworthy device authorization nor offline cryptographic verification.
5. **Single biggest technical-debt problem:** two contradictory database migration authorities prevent knowing or reproducing the deployed schema/security posture.
6. **Must fix before staging:** every item in [RELEASE_BLOCKERS.md](RELEASE_BLOCKERS.md), starting with build/migration/payment/scanner/finance/mobile contract failures.
7. **Must fix before production:** staging fixes plus real provider, database, Redis, webhook, notification, KMS and physical-device validation; production secrets/origins/operational runbooks.
8. **Can defer safely:** saved events, CMS enrichment, personalization, visual redesign, advanced analytics and growth features—after P0/P1 correctness.
9. **Build next:** the ordered P0 remediation program, not a new feature; first concrete work is FIX-008 then FIX-009 and payment exploit closure.
10. **Safe to accept real customer money? NO.**
11. **Ready for staging? NO.**
12. **Production-ready? NO.**

