# Command Results

## Backend unit suite

Executed from repository root:

```text
pnpm.cmd --filter @platform/api test
```

Result: exit 1. Jest reported **42 suites, 185 passed tests, 1 failed test**.

Failing assertion:

```text
ScannerCryptoService — FAIL FAST: Throws fatal error in NODE_ENV=production
if persistent keys are missing

Expected: [FATAL SECURITY ERROR] NODE_ENV=production but no persistent server signing keys
Received: constructor did not throw
```

The implementation logs a warning and creates a deterministic server/root signing key store instead. That is unsafe production key handling and contradicts release documentation.

## Backend build

Executed:

```text
pnpm.cmd --filter @platform/api build
```

Result: exit 1.

```text
src/modules/events/events.service.ts:852:5 - TS2741
Property 'ticketTypes' is missing in type ... but required in type
'EventDetailPublicDto'.
```

`EventsService.toPublicEventDetail()` is therefore not buildable against the currently built shared type declaration.

## Unverified items

No audit command connected to a configured Supabase/PostgreSQL database, Redis instance, Razorpay account/webhook, notification provider, browser session, Android/iOS hardware, scanner camera, or physical device key store. The source tree contains no CI migration/deploy job, and `render.yaml` does not run migrations.

