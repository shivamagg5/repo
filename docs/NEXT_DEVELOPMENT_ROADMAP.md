# Next Development Roadmap

This supersedes phase labels for planning purposes. It is ordered by risk and dependency; it does not authorize feature development before the P0 gates are complete.

## P0 — Release blockers

| Order | Problem / evidence | Why it matters | Files / modules | Backend | Frontend | Size | Dependencies |
| --- | --- | --- | --- | :---: | :---: | :---: | --- |
| 1 | **FIX-008** API fails to build (`events.service.ts:852`) | No trustworthy deploy artifact or contract baseline | events service, public types/tests | YES | NO | S | None |
| 2 | **FIX-009** two database authorities; migration/RLS state cannot be known | Every security and data test is invalid without a known schema | Drizzle config, both migration dirs, CI/deploy | YES | NO | XL | Backup/environment inventory |
| 3 | **FIX-001/002/014** mock payment bypass, event-type confusion, gateway fallback | Customers can receive tickets without a real captured payment | payment controller/service/gateways/config/tests | YES | Minimal | L | Migration baseline, Razorpay test account |
| 4 | **FIX-010/012** real refund and ledger lifecycle; integer-safe financial math | Financial records, refunds and settlements are currently unsafe | payments/admin/refunds/finance/schema | YES | Admin status UX | XL | Payment fixes, schema migration |
| 5 | **FIX-011** scope finance/analytics and use correct permissions | Prevents cross-organization monetary disclosure/payout | settlements, finance, analytics, RBAC | YES | YES | L | Stable org authorization model |
| 6 | **FIX-003/004** fail-closed scanner keys and real P-256 package/ticket verification | Prevents forged offline admission | scanner crypto, mobile crypto, key config | YES | YES | XL | KMS/secret provisioning, device crypto compatibility |
| 7 | **FIX-005/006/007** device registration, assignment and scanner contract | A scanner must not self-pair, fabricate keys, or silently admit offline | scanner schema/controller/service/guard; scanner provider/API/UI | YES | YES | XL | Scanner crypto and schema migration |
| 8 | **FIX-013/018** repair mobile envelope/checkout and remove demo success | Restores honest customer purchase experience | consumer API/provider/checkout/auth | NO | YES | M | Payment fixes, running API |
| 9 | **FIX-015** schedule/observe hold expiration | Availability counters must release expired stock in production | inventory worker/module/deploy | YES | NO | M | Redis/job or cron decision, integration DB |
| 10 | Replace permissive deployment posture | CORS `*`, unset production secrets, and unproven services negate code controls | `render.yaml`, env docs, CI/CD | YES | YES | L | All preceding backend gates |

### P0 acceptance gate

Before P1, a clean staging environment must run migrations exactly once, build all apps, and execute real PostgreSQL/Redis/Razorpay webhook/device tests. A staged test transaction must create a hold, pay through Razorpay, verify a captured webhook, issue tickets once, ledger-post once, then refund/reverse once. A revoked or forged scanner must be rejected online and offline.

## P1 — Core product gaps

| Order | Problem / evidence | Why it matters | Files / modules | Backend | Frontend | Size | Dependencies |
| --- | --- | --- | --- | :---: | :---: | :---: | --- |
| 11 | Durable notification worker and domain producers (`FIX-016`) | Paid/refund/cancelled journeys currently have no proven delivery | notification outbox/providers, worker scheduling, payment/events | YES | Minor | L | P0 payment/refund lifecycle |
| 12 | Correct API client contract and remove Flutter duplicate HTTP (`FIX-019`) | Prevents another envelope/auth/error drift | api-client/types, consumer/scanner services | YES | YES | L | Buildable contract baseline |
| 13 | Add FK/query indexes and counter constraints (`FIX-020`) | Prevents scalability and invalid state failures | schema/migrations/query plans | YES | NO | M | Unified migrations |
| 14 | Promoter detail and legitimate event selection (`FIX-017`) | Current campaign detail is a 404 and creation needs raw UUID | promoter controller/service/client/pages | YES | YES | M | P0 migrations/auth |
| 15 | Auth/RBAC tenancy review across every B2B route | Active memberships, first-org selection and privileged scopes require live proof | middleware/RBAC/organizer/venue/promoter/admin | YES | YES | L | Real staging org fixtures |
| 16 | Operational event/ticket/refund state lifecycle | No refund/revocation reconciliation for scanner and wallet | tickets, payments, scanner, consumer apps | YES | YES | L | P0 payments/scanner |
| 17 | Real infrastructure test harness | Current tests are mocked unit tests; normal `test` misses e2e | Docker/testcontainers or staging scripts, CI | YES | YES | L | Unified migrations/secrets |

## P2 — Important improvements

| Problem | Evidence / action | Backend | Frontend | Size |
| --- | --- | :---: | :---: | :---: |
| CMS lifecycle and sanitizer | Only create/read endpoints; regex sanitizer and no invalidation | YES | YES | M |
| Authoritative analytics | Hardcoded/unscoped 12%, 18%, 5, 12, 100 metrics; missing canonical client emissions | YES | YES | M |
| Consumer profile/saved events | Profile cannot mutate; saved is explicit deferred placeholder | YES | YES | M |
| Performance review | Promoter analytics N+1; outbox polling/claims; unbounded lists and missing query indexes | YES | YES | M |
| Accessibility/visual regression evidence | Existing documentation is not reproducible runtime evidence | NO | YES | M |
| Admin operations hardening | UUID-only lookup UX, full audit export/retention/segregation workflows | YES | YES | M |

## P3 — Growth features

- Search relevance/ranking, personalization, favorites/saved events, referral attribution UX and richer organizer reporting.
- Provider integrations for email/SMS/push with delivery webhooks after the outbox is durable.
- Event discovery CMS curation and cache strategy after the public content lifecycle is complete.

## P4 — Nice to have / safely deferred

- Cosmetic UI redesign, new design-system variants, animation expansion, nonessential dashboard widgets, and marketing CMS enhancements.
- Multi-currency and advanced tax automation, only after minor-unit accounting and settlements are correct.

## Recommended development order

1. Build failure and migration authority.
2. Payment exploit closure and real payment integration tests.
3. Finance/refund lifecycle and tenancy scoping.
4. Scanner root/device trust chain and real-device contract tests.
5. Consumer mobile checkout repair and hold expiry operation.
6. Notifications, contract consolidation, performance indexes and product gaps.

