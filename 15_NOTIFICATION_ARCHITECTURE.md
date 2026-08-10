# Event Ecosystem --- Notification Architecture

## 1. Channels

-   Push
-   Email
-   SMS/other transactional providers as required
-   In-app notifications

## 2. Architecture

``` text
Domain Event
   ↓
Notification Service
   ↓
Preference Check
   ↓
Template
   ↓
Queue
   ↓
Provider
   ↓
Delivery Status
```

## 3. Domain Triggers

Examples:

``` text
OrderPaid
TicketIssued
EventReminder
EventChanged
EventCancelled
RefundCompleted
SettlementApproved
SettlementPaid
PromoterCommissionUpdated
```

## 4. Transactional Notifications

High-priority:

-   Payment confirmation
-   Ticket issued
-   Refund status
-   Event cancellation/change
-   Security alerts

These should not depend on marketing preferences where
legally/operationally they are transactional.

## 5. Marketing Notifications

Examples:

-   Nearby event recommendations
-   New event alerts
-   Personalized recommendations
-   Promotions

Respect user preferences and applicable laws.

## 6. Templates

Templates should be versioned.

``` text
notification_type
locale
channel
template_version
subject
body
variables
```

## 7. Delivery

Queue messages asynchronously.

Retry transient provider errors.

Do not retry permanent errors indefinitely.

## 8. Idempotency

Every notification job gets an idempotency key.

Example:

``` text
ticket-issued:{ticketId}:v1
```

## 9. User Preferences

Support:

-   Channel preference
-   Category preference
-   Quiet hours where appropriate
-   Marketing opt-in/out

## 10. Push

Store device tokens per user/device.

Handle:

-   Token refresh
-   Invalid token
-   Logout
-   Multiple devices

## 11. Email

Use verified transactional email infrastructure.

Track:

-   Sent
-   Delivered
-   Bounced
-   Failed

## 12. Observability

Metrics:

-   Queue depth
-   Send latency
-   Delivery rate
-   Failure rate
-   Provider error rate

## 13. Failure Rule

Notification failure must not cause:

-   Payment rollback
-   Ticket rollback
-   Event publication rollback
-   Settlement rollback
