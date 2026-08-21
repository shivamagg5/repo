# Audit Evidence Index

Audit date: 2026-08-19. Scope is the checked-out working tree, including the nine pre-existing modified `consumer-mobile` files. No application source was changed for this audit.

## Primary source evidence

| Topic | Source files inspected | Result |
| --- | --- | --- |
| Runtime API | `backend/api/src/main.ts`, `app.module.ts`, every controller under `src/modules` | NestJS exposes `/api/v1`; controller inventory is in `ROUTE_INVENTORY.md`. |
| Database authority | `backend/api/drizzle.config.ts`, `backend/api/src/database/schema/index.ts`, `backend/api/src/database/migrations/*`, `database/migrations/*` | Drizzle migrates the backend-local `0000_light_bushwacker.sql` (57 tables). A second, divergent SQL migration set is documented as canonical but is not selected by Drizzle. |
| Payments | `payments.service.ts`, `payments.controller.ts`, both gateway adapters, `orders.service.ts` | Raw-body HMAC exists, but the production path also exposes the mock gateway and processes any signed Razorpay payment event as success. |
| Scanner | `scanner.controller.ts`, `scanner.service.ts`, `scanner-crypto.service.ts`, `device-auth.guard.ts`, `apps/scanner-mobile/lib/**` | ECDSA P-256 exists on the backend, but mobile offline verification is a stub and pairing/admission has fabricated fallbacks. |
| Finance | `ledger.service.ts`, `reconciliation.service.ts`, `settlements.service.ts` | Ledger primitives exist; payment/refund flows do not invoke them. Settlement aggregates are not scoped to the requested organization. |
| Clients | `packages/api-client/src/index.ts`, web `src/lib/api.ts`, mobile API services | Web is mostly typed-client based. Consumer and scanner Flutter clients duplicate HTTP handling and contain envelope/endpoint mismatches. |
| UI | all `apps/*/src/app/**/page.tsx`, Flutter screen files, `apps/consumer-mobile/flutter_01.png`, local design references | Current consumer-mobile screenshot shows a coherent purple/pink dark theme; functionality and scanner safety are not established by it. |

## Commands actually run

| Command | Result | Limits |
| --- | --- | --- |
| `pnpm.cmd --filter @platform/api test` | **FAIL**: 41 suites / 185 tests passed; `scanner-crypto.spec.ts` failed (expected production key fail-fast, received deterministic fallback) | Unit tests use mocks; no PostgreSQL, Redis, Razorpay, Supabase, FCM, or real device was exercised. |
| `pnpm.cmd --filter @platform/api build` | **FAIL**: `events.service.ts:852`, public-event DTO omits required `ticketTypes` | This is a release-blocking compile failure. |
| `pnpm.cmd build` | Timed out at 62 seconds without a final result | Not evidence of a passing monorepo build. |
| `flutter test` in `apps/consumer-mobile` | Terminated after exceeding the audit execution window without output/result | Not evidence of a passing Flutter test suite. |

## Important test-context qualification

`backend/api/jest.config.js` sets `rootDir: 'src'`, so the only `test/app.e2e-spec.ts` is not included in the normal backend `test` command. The executed backend suite uses mocked repositories/adapters (for example `scanner.spec.ts` constructs a mocked database). Therefore, claims of live-infrastructure or end-to-end verification are unconfirmed.

