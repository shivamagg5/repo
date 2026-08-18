# PHASE 15.1A — PAYMENT SECURITY FIX REPORT

**Date:** 2026-08-18  
**Status: ✅ PASS (static analysis clean, manual device test required)**

---

## Objective

Eliminate the P0 security vulnerability in which any authenticated user could call
`POST /orders/:id/confirm` to obtain paid tickets without completing a real payment.

---

## Vulnerability Summary (Closed)

### Before

```
reservation (hold created)
    ↓
POST /payments/intent  (Razorpay order created on backend, no charge yet)
    ↓
POST /orders/:id/confirm  ← called directly from mobile, no payment verification
    ↓
hold → converted | order → paid | tickets issued   ← FREE TICKETS
```

`orders.service.ts → confirmOrderPayment()` unconditionally converted inventory
and marked the order paid with zero payment verification.

### After

```
reservation (hold created)
    ↓
POST /payments/intent  → providerOrderId returned
    ↓
razorpay_flutter SDK opens  → user completes payment on Razorpay UI
    ↓
Razorpay hits POST /payments/webhooks/razorpay
    ↓  HMAC verified ✅ | amount validated ✅ | replay-protected ✅
    ↓  atomic: hold→converted | order→paid | tickets issued ✅
    ↓
mobile polls GET /orders/:id (10 × 3s = 30s)
    ↓
order.status === 'paid'  → navigate to /confirmation/:orderId
```

---

## Files Changed

### Mobile (Flutter)

| File | Change |
|---|---|
| [`pubspec.yaml`](file:///c:/Users/HP/Desktop/event%20booking%20app/apps/consumer-mobile/pubspec.yaml) | Added `razorpay_flutter: ^1.3.7` (resolved to 1.4.5) |
| [`checkout_screen.dart`](file:///c:/Users/HP/Desktop/event%20booking%20app/apps/consumer-mobile/lib/screens/checkout/checkout_screen.dart) | Full rewrite — Razorpay SDK, polling, no `confirmOrder()` on payment path |
| [`order_confirmation_screen.dart`](file:///c:/Users/HP/Desktop/event%20booking%20app/apps/consumer-mobile/lib/screens/checkout/order_confirmation_screen.dart) | Added `isPending` mode with auto-poll, processing UI, 'Check Again' button |
| [`ticketing_provider.dart`](file:///c:/Users/HP/Desktop/event%20booking%20app/apps/consumer-mobile/lib/providers/ticketing_provider.dart) | Added `refreshOrder()` (null-safe, no stale state). Documented `confirmOrder()` as reconciliation-only. |
| [`app_router.dart`](file:///c:/Users/HP/Desktop/event%20booking%20app/apps/consumer-mobile/lib/router/app_router.dart) | Passes `isPending` from `?pending=true` query param to confirmation screen |

### Backend (NestJS / TypeScript)

| File | Change |
|---|---|
| [`orders.service.ts`](file:///c:/Users/HP/Desktop/event%20booking%20app/backend/api/src/modules/orders/orders.service.ts) | Added PAYMENT_NOT_VERIFIED guard inside `confirmOrderPayment()` |

---

## Security Guard — Backend Detail

`confirmOrderPayment()` now queries `payment_transactions` inside the same DB
transaction **before** any inventory or order state change:

```typescript
const [verifiedPayment] = await tx
  .select()
  .from(paymentTransactions)
  .where(
    and(
      eq(paymentTransactions.orderId, orderId),   // correct order
      eq(paymentTransactions.status, 'paid'),      // webhook-confirmed status
      isNotNull(paymentTransactions.providerPaymentId), // set only by webhook
    ),
  )
  .execute();

if (!verifiedPayment) {
  throw new ConflictException({ code: 'PAYMENT_NOT_VERIFIED', ... });
}
```

**Why `providerPaymentId IS NOT NULL` is the key check:**

`providerPaymentId` is only written inside `payments.service.ts → processWebhook()`
after full HMAC verification + amount validation. It is never set by the
intent creation or confirm endpoint. Its presence proves the webhook path
was followed.

---

## Key Design Decisions

### Decision 1 — No `confirmOrder()` on primary payment path

The mobile checkout flow never calls `POST /orders/:id/confirm` after payment.
It only polls `GET /orders/:id`. The confirm endpoint exists only as a
reconciliation tool (e.g., for support operations).

### Decision 2 — `refreshOrder()` returns null on error

A network failure during polling returns `null`, not stale local state.
The UI stays in "verifying" rather than accidentally showing success.

### Decision 3 — Modal dismissal ≠ payment failure

`Razorpay.EVENT_PAYMENT_ERROR` with `code == 0` and empty message is a
dismissal, not a failure. It is handled silently — user can retry.

### Decision 4 — Public key only in Flutter

`RAZORPAY_KEY_ID` (`rzp_test_...`) is safe in Flutter via `String.fromEnvironment`.
`RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` remain backend-only.

---

## Test Matrix

| Test | Expected | Result |
|---|---|---|
| A. Direct `POST /orders/:id/confirm` on unpaid order | 409 PAYMENT_NOT_VERIFIED | ✅ (code verified) |
| B. Paid tx for different order → confirm rejected | 409 PAYMENT_NOT_VERIFIED | ✅ (orderId check) |
| C. Webhook confirms → `providerPaymentId` set → confirm succeeds | 200 OK | ✅ (code verified) |
| D. Duplicate webhook | Idempotent 200, no duplicate tickets | ✅ (existing, unchanged) |
| E. `refreshOrder()` on network error | Returns null (no stale state) | ✅ (code verified) |
| F. Razorpay modal dismissed (`code=0`) | Silent retry, no failure state | ✅ (code verified) |
| G. Expired hold after payment | Flagged for refund, no ticket | ✅ (existing webhook logic) |
| H. Amount mismatch in webhook | Tx fails, security audit log | ✅ (existing webhook logic) |
| I. 30s poll timeout | Navigate to /confirmation?pending=true | ✅ (code verified) |
| J. Backend tsc compilation | 0 errors | ✅ PASS |
| K. Flutter static analysis | 0 issues | ✅ PASS |

---

## Manual Device Test Required

The following **cannot** be verified statically and must be run on a physical device:

```text
1. Build debug APK with RAZORPAY_KEY_ID set:
   flutter run --dart-define=RAZORPAY_KEY_ID=rzp_test_xxx

2. Flow to verify:
   Browse → Event Detail → Find Tickets → Select tier
   → Checkout screen (10-min countdown visible)
   → Tap "Pay ₹X with Razorpay"
   → Razorpay SDK overlay MUST OPEN  ← this was missing before
   → Complete test payment
   → App polls backend
   → Webhook fires (check backend logs for "payment.success_confirmed")
   → order.status = 'paid'
   → Confirmation screen shows "Payment Confirmed!"
   → Wallet → ticket with QR code appears

3. Failure path:
   → Tap "Pay" → Razorpay opens → tap X to dismiss
   → Checkout screen still visible, no error shown (dismiss ≠ failure)
   → Can retry payment

4. Security test:
   Using curl/Postman, call POST /orders/:id/confirm on a pending order
   (no Razorpay payment made)
   → Must receive 409 PAYMENT_NOT_VERIFIED
```

---

## What Was NOT Changed (Preserved)

| Component | Status |
|---|---|
| `POST /payments/webhooks/razorpay` | ✅ Untouched — sole payment authority |
| HMAC signature verification | ✅ Untouched |
| Replay protection (`paymentEvents` unique constraint) | ✅ Untouched |
| Amount + currency triple validation | ✅ Untouched |
| Late payment / expired hold flagging | ✅ Untouched |
| Atomic inventory conversion + ticket issuance | ✅ Untouched |
| Refund flow | ✅ Untouched |

---

## STOP

P0 fix complete. Do not start P1 feature work until:
1. Manual device test passes (Razorpay SDK opens, payment completes, ticket appears)
2. Security test passes (curl → 409 on unpaid order)
