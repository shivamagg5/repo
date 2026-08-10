# Event Ecosystem --- Ticketing Engine Specification

## 1. Responsibility

The ticketing engine owns:

-   Inventory
-   Reservations
-   Ticket issuance
-   Ticket state
-   Ticket identity
-   Ticket validation
-   Check-in state
-   Ticket lifecycle

## 2. Inventory Model

For each ticket type:

``` text
total_quantity
sold_quantity
reserved_quantity
available_quantity
```

Conceptually:

``` text
available = total - sold - active_reservations
```

The server calculates availability.

## 3. Reservation

A checkout creates a short-lived reservation.

Rules:

-   Reservation has expiry timestamp
-   Inventory is atomically reserved
-   Same inventory cannot be reserved beyond capacity
-   Expired reservations are released
-   Successful payment converts reservation to sold
-   Failed/expired checkout releases reservation

## 4. Concurrency

Use database transactions with row locking or equivalent atomic
operations.

Critical invariant:

``` text
sold + active_reserved <= total
```

This invariant must never be violated.

## 5. Ticket Issuance

After verified payment:

1.  Lock order
2.  Verify payment
3.  Verify reservation
4.  Mark inventory sold
5.  Create ticket records
6.  Generate ticket identifiers
7.  Generate QR token/hash
8.  Mark order tickets issued
9.  Commit
10. Send notifications asynchronously

## 6. Ticket Identity

Each ticket gets:

-   Public ticket ID
-   Human-readable ticket number
-   Event ID
-   Ticket type
-   Order ID
-   Owner
-   Status
-   Secure QR credential

Do not expose internal database secrets in QR payloads.

## 7. QR Design

Preferred:

``` text
opaque random token
```

or a signed token with short/controlled validity.

Server stores a hash of the credential where practical.

## 8. Validation

Validation checks:

``` text
authenticated scanner/device
→ token valid
→ ticket exists
→ correct event
→ correct access tier
→ ticket active
→ not refunded
→ not void
→ not already checked in
```

## 9. Check-In

Online successful check-in should be atomic.

Conceptually:

``` sql
UPDATE tickets
SET status='checked_in', checked_in_at=NOW()
WHERE id=:ticket
AND status='issued';
```

Only one transaction should be able to transition the ticket
successfully.

## 10. Duplicate Scans

First valid scan:

``` text
SUCCESS
```

Later scan:

``` text
ALREADY_USED
```

Return the original check-in time where operationally useful.

## 11. Ticket Transfers

If enabled later:

-   Transfer request
-   Ownership validation
-   New owner confirmation
-   Audit trail
-   QR credential rotation

## 12. Refund/Cancel Effects

Refunded ticket cannot enter the venue.

When an order is refunded:

-   Update refund records
-   Update ticket status
-   Invalidate ticket credential
-   Adjust financial ledger
-   Release any future operational entitlement

## 13. Complimentary Tickets

Complimentary tickets should have:

-   Zero customer payment
-   Issuing actor
-   Reason/reference
-   Organizer authorization
-   Audit trail

## 14. Promo Codes

Promo rules must support:

-   Fixed amount
-   Percentage
-   Ticket-type restrictions
-   Event restrictions
-   Usage limits
-   User limits
-   Start/end date
-   Minimum order
-   Maximum discount

## 15. Capacity

Events may have:

-   Event-level capacity
-   Ticket-type capacity
-   Section capacity

Do not implement complex seating until the product needs it.

## 16. State Machine

``` text
RESERVED
   ↓
ISSUED
   ├── CHECKED_IN
   ├── REFUNDED
   ├── VOID
   └── CANCELLED
```

## 17. Auditing

Record:

-   Issuance
-   Refund
-   Void
-   Transfer
-   Check-in
-   Manual override

## 18. Performance

Scanner validation should be optimized for very low latency.

Use:

-   Indexed ticket credential lookup
-   Small response payload
-   Connection pooling
-   Regional deployment as scale requires
-   Cache only safe read data

The final state transition must remain authoritative.
