# Event Ecosystem --- System Architecture

## 1. Architecture Goal

Build a modular, secure, scalable platform where consumer, organizer,
venue, promoter, scanner and admin products share one backend contract.

## 2. High-Level Architecture

``` text
Consumer Web ───────┐
Consumer Flutter ───┤
Organizer Web ──────┤
Venue Web ──────────┤
Promoter Web ───────┤
Scanner Flutter ────┤
Admin Web ──────────┘
          │
          ▼
     API Gateway / Backend
          │
  ┌───────┼─────────────────────────────┐
  ▼       ▼       ▼       ▼             ▼
 Auth   Events  Tickets  Orders      Payments
  │       │       │       │             │
  └───────┼───────┼───────┼─────────────┘
          ▼
      PostgreSQL
          │
     ┌────┴─────┐
     ▼          ▼
   Redis      Object Storage
     │
     ▼
 Background Jobs / Queues
     │
 ┌───┼──────────┬───────────┐
 ▼   ▼          ▼           ▼
Email Push     Finance     Analytics

Scanner ↔ Ticket Validation API
```

## 3. Recommended Technology Direction

### Frontend

-   Consumer web: Next.js/React
-   Dashboards: Next.js/React
-   Mobile: Flutter
-   Shared UI/design tokens where practical

### Backend

-   TypeScript
-   Node.js
-   Modular API architecture
-   REST or typed RPC contract
-   WebSocket only for genuine real-time requirements

### Database

-   PostgreSQL

### Cache

-   Redis

### Storage

-   S3-compatible object storage

### Background processing

-   Redis-backed queue or managed queue

### Search

Start with PostgreSQL search. Introduce dedicated search infrastructure
when scale/quality requires it.

### Observability

-   Centralized logs
-   Metrics
-   Error tracking
-   Uptime/health checks

## 4. Domain Modules

``` text
identity
organizations
users
events
venues
tickets
inventory
orders
payments
refunds
promoters
commissions
checkins
notifications
cms
analytics
support
moderation
settlements
audit
```

## 5. API Principles

-   Version public APIs
-   Validate all inputs
-   Return consistent error structures
-   Use pagination for collections
-   Use idempotency keys for money/ticket operations
-   Never trust client-provided role/price/status
-   Enforce authorization server-side

## 6. Authentication Architecture

Identity provider handles:

-   Sign-in
-   Sign-up
-   Password reset
-   OAuth
-   Session lifecycle

Application database stores:

-   User profile
-   Organizations
-   Roles
-   Permissions
-   Preferences

A user may belong to multiple organizations and hold different roles in
each.

## 7. Authorization

Use RBAC with resource-level checks.

Example:

``` text
User
 └── Organization Membership
      ├── Role
      └── Permissions
```

For sensitive operations add ownership/resource checks.

## 8. Ticket Purchase Architecture

``` text
Client
  ↓
Create checkout
  ↓
Reserve inventory
  ↓
Payment provider
  ↓
Payment webhook
  ↓
Verify payment
  ↓
Finalize order
  ↓
Issue ticket
  ↓
Generate QR/token
  ↓
Notify customer
```

The webhook/backend confirmation, not the browser redirect, determines
successful payment.

## 9. Inventory Reservation

Inventory must be transactionally protected.

Reservation:

``` text
AVAILABLE
→ RESERVED
→ SOLD
```

If payment expires:

``` text
RESERVED
→ AVAILABLE
```

Use database transactions/locking or an equivalent atomic inventory
strategy.

## 10. QR/Ticket Security

Do not place sensitive internal data directly in a static QR.

Use a signed or opaque token.

Validation should verify:

-   Ticket exists
-   Ticket belongs to correct event
-   Ticket is active
-   Ticket has not been checked in
-   Access tier is permitted
-   Token is valid
-   Ticket has not been refunded/voided

## 11. Offline Scanner Architecture

Scanner stores a limited local cache of authorized event ticket
validation data.

Offline check-in requires a carefully designed conflict strategy.

Preferred approach:

-   Pre-sync event/ticket authorization data
-   Locally record check-ins
-   Use device/event-scoped signed data
-   Queue local events
-   Reconcile with server
-   Detect duplicate/conflicting scans

For high-value events, offline mode should have explicit operational
controls because no offline design can guarantee perfect global
uniqueness while disconnected.

## 12. Payments

Payment provider integration should use:

-   Checkout/order creation
-   Provider payment ID
-   Webhooks
-   Signature verification
-   Idempotency
-   Reconciliation

Never mark a payment as successful solely from a frontend callback.

## 13. Settlements

Financial model:

``` text
Customer Payment
      ↓
Gross Transaction
      ↓
Taxes / Fees / Refund Adjustments
      ↓
Platform Commission
      ↓
Promoter Commission
      ↓
Organizer/Venue Share
      ↓
Settlement
```

Every amount must be traceable to ledger entries.

## 14. Notifications

Use an event-driven approach:

``` text
OrderPaid
   ↓
Notification Job
   ├── Email
   ├── Push
   └── SMS/other provider
```

Notification failure must not roll back a successful payment.

## 15. Background Jobs

Examples:

-   Release expired reservations
-   Generate reports
-   Send reminders
-   Process refunds
-   Calculate commissions
-   Prepare settlements
-   Sync analytics
-   Send emails/push notifications
-   Reconcile payments

## 16. Security Architecture

-   Least privilege
-   Secret manager
-   TLS everywhere
-   Rate limiting
-   API authentication
-   Authorization middleware
-   Input validation
-   SQL parameterization/ORM safety
-   Audit logging
-   Admin MFA
-   Device/session controls
-   Sensitive action re-authentication where appropriate

## 17. Environments

``` text
local
development
staging
production
```

Never share production credentials with development.

## 18. Deployment

Use CI/CD with:

-   Automated tests
-   Lint/type checks
-   Build
-   Migration checks
-   Deployment
-   Health verification
-   Rollback strategy

## 19. Scalability Strategy

Start modular, not microservice-heavy.

A modular monolith is preferred initially.

Extract services only when there is a measurable reason:

-   Ticket validation scale
-   Search scale
-   Notification scale
-   Analytics scale
-   Payment/finance isolation

## 20. Disaster Recovery

Must include:

-   Automated database backups
-   Restore testing
-   Object storage backups/versioning
-   Secrets recovery process
-   Incident runbook
-   Data retention policy
