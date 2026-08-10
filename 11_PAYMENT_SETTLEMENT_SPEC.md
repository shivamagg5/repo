# Event Ecosystem --- Payment & Settlement Specification

## 1. Financial Principles

-   Never use floating point for money.
-   Every financial movement gets an immutable reference.
-   Provider callbacks are untrusted until signature verification.
-   Every money operation is idempotent.
-   Refunds cannot exceed captured amount.
-   Settlement amounts are derived from ledger/transaction data.

## 2. Payment Lifecycle

``` text
ORDER_CREATED
→ PAYMENT_PENDING
→ PROVIDER_PAYMENT
→ PROVIDER_WEBHOOK
→ VERIFIED
→ PAID
→ TICKET_ISSUANCE
```

Failure:

``` text
PAYMENT_FAILED
```

## 3. Payment Confirmation

The client redirect is informational.

Authoritative success requires:

1.  Provider webhook
2.  Signature verification
3.  Provider payment lookup if necessary
4.  Amount verification
5.  Currency verification
6.  Order matching
7.  Idempotent processing

## 4. Idempotency

Use an idempotency key for:

-   Checkout creation
-   Payment creation
-   Refund creation
-   Settlement creation
-   Payout submission

Repeated requests return the existing operation result.

## 5. Order Amount

Server calculates:

``` text
subtotal
- discount
+ platform/customer fees
+ applicable tax
= total
```

The exact tax/fee rules must be configured centrally and reviewed for
the launch jurisdiction.

## 6. Refunds

Refund flow:

``` text
Customer/Support
      ↓
Eligibility check
      ↓
Refund record
      ↓
Provider refund
      ↓
Provider webhook
      ↓
Ledger reversal/adjustment
      ↓
Ticket invalidation
```

Never refund solely because a client claims a payment exists.

## 7. Partial Refunds

Support partial refunds only when:

-   Business rule permits
-   Total refunded never exceeds captured amount
-   Remaining ticket entitlement is handled correctly

## 8. Ledger

Use double-entry-style accounting.

For every transaction, debits and credits must balance within the
applicable ledger model.

Conceptually:

``` text
Customer payment
    → platform clearing
    → taxes/fees
    → organizer payable
    → promoter commission
```

## 9. Settlement Calculation

For an organizer:

``` text
Gross eligible sales
- refunds
- taxes/withheld amounts
- platform commission
- promoter commission
- other approved deductions
= net settlement
```

The exact commercial agreement must be stored/versioned.

## 10. Settlement Period

Settlement can be:

-   Event-based
-   Weekly
-   Biweekly
-   Monthly

V1 should choose one primary operational cadence and support exceptions
explicitly.

## 11. Settlement States

``` text
DRAFT
→ PENDING_REVIEW
→ APPROVED
→ PROCESSING
→ PAID
```

Failure:

``` text
FAILED
```

## 12. Settlement Controls

Require:

-   Reconciliation
-   Approval
-   Audit log
-   Beneficiary verification
-   Duplicate payout protection

High-value payouts may require dual approval.

## 13. Reconciliation

Daily reconciliation compares:

``` text
Platform orders
vs
Payment provider transactions
vs
Internal payment records
vs
Refunds
```

Exceptions enter a reconciliation queue.

## 14. Financial Exports

Provide:

-   Transaction CSV
-   Refund CSV
-   Settlement statement
-   Event sales report
-   Commission report

## 15. Taxes

Do not hard-code tax rates in application code.

Use configurable jurisdiction/rule data and have the final tax
implementation reviewed by a qualified professional for the markets
served.

## 16. Payout Data

Store only what is required for payouts and protect sensitive financial
information.

Use provider/customer identifiers rather than unnecessarily storing raw
payment credentials.
