# Misalignments and Documentation Drift

Code and executable configuration take precedence over reports.

## API and client contract mismatches

| Endpoint / contract | Client expectation | Backend reality | Status | Fix required |
| --- | --- | --- | --- | --- |
| `POST /orders` | `ApiClient.createOrder()` advertises it | No controller route creates orders; reservations create the order | BROKEN / stale client | Remove or implement a deliberately designed order endpoint; do not leave a false client contract. |
| `GET /promoter/campaigns/:id` | Promoter campaign detail calls `getPromoterCampaignById()` | Controller exposes list and `:id/performance`, not `:id` | BROKEN | Add the authenticated owner-scoped endpoint or change the page/client to use supported data. |
| Flutter `GET /orders/:id` | `ApiService.getOrder()` expects top-level `{order}` | API returns `{data:{order,items},meta}` | BROKEN | Use one response-envelope decoder for every Flutter request. |
| Flutter `POST /orders/:id/confirm` | Same top-level `{order}` assumption | API returns `{data:{order,ticketsIssuedCount},meta}` | BROKEN | Decode `data`; preserve pending/failed semantics. |
| Scanner pair/scan/sync | Reads top-level `package`, `result`, `syncedSyncIds`, `conflicts` | API globally envelopes data; sync returns `{processedCount, successCount, duplicateCount, conflictCount, results}` | BROKEN | Share a concrete DTO/envelope decoder and align sync result shape. |
| Consumer web public event / venue / category pages | Direct SSR fetch defaults to `http://localhost:3000/api/v1` | Other apps default to `localhost:3001/api/v1`; Next itself is normally port 3000 | PARTIAL | Use typed client/server base config; never use a misleading default. |
| Payment provider selection | Body accepts `provider: string` | `mock` becomes a live selectable adapter; unrecognised strings save an unwebhookable provider | CRITICAL | Server-select provider by environment/order; validate an allowlist. |
| `DeviceAuthGuard` | Scanner mobile emits device-signing headers | Scanner controller uses only `AuthGuard` | BROKEN | Apply and correctly provision the guard after key persistence/assignment is fixed. |
| Device public key | Mobile sends `publicKeyPem` | Schema has only `deviceIdentifier`; service ignores `publicKeyPem`; guard tries to treat identifier as PEM | CRITICAL | Add a public-key column and migration; bind device signature to that key. |

## Database and migration drift

| Claim / assumption | Actual code | Drift | Severity |
| --- | --- | --- | --- |
| `database/migrations` is canonical | `backend/api/drizzle.config.ts` writes/runs `./src/database/migrations`; journal has only `0000_light_bushwacker` | Two migration authorities. The documented RLS policies are not in the active Drizzle migration. | P0 |
| “Schema and SQL remain synchronized” | Active schema has **57** `pgTable` entities, including analytics, outbox, CMS, reconciliation, venue media/availability; legacy migrations are a different evolution | Cannot determine a deployed schema from source alone. | P0 |
| RLS is part of the schema | RLS policies appear in `database/migrations/0002_auth_rbac.sql`, not in active `0000_light_bushwacker.sql` | Database-level tenant protection is not confirmed. Backend service role bypasses RLS in any case. | P0 |
| Foreign-key access patterns are indexed | Active schema declares primary/unique constraints but no non-unique FK/query indexes | Common event/order/ticket/checkin/outbox queries will degrade and lock more rows as data grows. | P1 |
| Financial precision is bigint-safe | Drizzle uses `bigint(..., { mode: 'number' })`; services sum `number` and use `Math.round(... * 0.1/0.18)` | Values can exceed JavaScript safe integer limits and decimal percentage math is floating-point. | P0 |
| Scanner device key exists in schema | `checkin_devices` lacks public key, approval timestamp, assignment, revocation reason/key ID | Advertised device-auth trust model cannot be represented. | P0 |

## Documentation claims not confirmed by code/tests

| Documentation claim | Actual code / execution result | Drift | Severity |
| --- | --- | --- | --- |
| `PHASE_14.1_IMPLEMENTATION_REPORT.md`: backend **186/186 PASS** | Current run: 185/186 passed; scanner production-key test fails | Stale test claim | P1 |
| `PHASE_14.2_IMPLEMENTATION_REPORT.md`: no fake payment success | Any authenticated user can select `mock`, then post a known mock signature to public webhook | Materially false security claim | P0 |
| `PHASE_14.4_IMPLEMENTATION_REPORT.md`: true device auth and offline ECDSA | Mobile verifier only checks string presence/length; pairing uses fake package fallback; controller omits device guard | Materially false scanner claim | P0 |
| `PHASE_14.7_IMPLEMENTATION_REPORT.md`: all consumer mock states eliminated | `signInWithDemoAccount` can create local authenticated state; home categories fall back to fixed list; checkout retains `ord_` success bypass | False completeness claim | P1 |
| `PHASE_14.9C/visual-qa` reports complete scanner performance/security validation | No runnable physical-device evidence; scanner client/server contracts do not line up | Evidence is insufficient and outcomes contradicted by source | P0 |
| `PHASE_14.9D_RELEASE_CONSISTENCY_AUDIT.md`: production keys fail fast | `ScannerCryptoService` logs warning and generates fallback keys; corresponding test fails | Direct contradiction | P0 |
| `database/README.md`: SQL migrations canonical and Drizzle uses them | Drizzle points elsewhere | Operational runbook is wrong | P0 |
| `PHASE_14_UI_UX_INTEGRATION_AUDIT.md` describes older placeholder app states | Current screens/API calls are substantially more developed | Historical report is stale; it must not be treated as current status | P2 |

## Architecture inconsistencies to remove or rework

- Keep exactly one migration source and one deploy mechanism. Do not retain both as supposedly canonical.
- Have Flutter clients use a shared/generated contract or at minimum a single envelope decoder. Scanner and consumer have independently drifted.
- Delete production mock-payment, demo scanner credentials, local scanner pair/device fallbacks, fake gates/events and `ord_` confirmation path. Put test fixtures behind test-only compilation/configuration.
- Make scanner authorization server-side: user → active membership/role → registered approved device public key → assigned event/gate. Never trust body `deviceId`, `eventId`, `gateId`, or client-only pairing state.
- Make the finance ledger an authoritative transactional subscriber of paid/refunded events, not a disconnected admin utility.

