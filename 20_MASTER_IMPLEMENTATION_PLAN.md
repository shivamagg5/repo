# Event Ecosystem --- Master Implementation Plan

**Version:** 1.0\
**Purpose:** Convert the product and engineering specifications into an
executable build program for AI coding agents and human engineers.

------------------------------------------------------------------------

# 1. Master Objective

Build a production-grade event ecosystem consisting of:

1.  Consumer Website
2.  Consumer Flutter App --- iOS + Android
3.  Organizer Web Dashboard
4.  Venue Web Dashboard
5.  Promoter/Affiliate Web Dashboard
6.  Scanner Flutter App --- iOS + Android
7.  Admin/HQ Web Panel
8.  Central backend/API
9.  PostgreSQL database
10. Redis/cache/queue infrastructure
11. Payment and settlement system
12. Notification infrastructure
13. CMS
14. Analytics
15. Security, moderation and support systems

The system must behave as **one platform with one source of truth**, not
seven independently built applications.

------------------------------------------------------------------------

# 2. Non-Negotiable Build Rules

## Rule 1 --- Backend first for business-critical logic

Never implement authoritative:

-   pricing
-   inventory
-   payment status
-   ticket status
-   check-in state
-   refunds
-   commissions
-   settlements
-   permissions

inside clients.

Clients display and request state. The backend decides it.

## Rule 2 --- Database migrations are mandatory

Every schema change must be committed as a migration.

Never manually change production schema.

## Rule 3 --- No duplicate business logic

There must be one canonical implementation of:

-   pricing
-   inventory
-   ticket validation
-   payment verification
-   commission calculation
-   settlement calculation
-   authorization

## Rule 4 --- AI agents work in bounded tasks

No agent receives:

> "Build the entire platform."

Each agent receives a specific phase/task with acceptance criteria.

## Rule 5 --- Existing code must be inspected first

Before modifying a repository, an agent must inspect:

-   directory structure
-   package configuration
-   environment configuration
-   database
-   existing APIs
-   existing components
-   tests
-   documentation

## Rule 6 --- Never silently redesign architecture

If implementation conflicts with the specification:

1.  Identify the conflict.
2.  Explain it.
3.  Choose the documented design unless explicitly changed.
4.  Update documentation if the architecture changes.

------------------------------------------------------------------------

# 3. Repository Target Structure

Recommended monorepo:

``` text
event-platform/
│
├── apps/
│   ├── consumer-web/
│   ├── consumer-mobile/
│   ├── organizer-web/
│   ├── venue-web/
│   ├── promoter-web/
│   ├── scanner-mobile/
│   └── admin-web/
│
├── backend/
│   ├── api/
│   ├── workers/
│   └── jobs/
│
├── packages/
│   ├── api-client/
│   ├── types/
│   ├── validation/
│   ├── auth/
│   ├── ui/
│   ├── design-tokens/
│   └── config/
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── fixtures/
│
├── infrastructure/
│   ├── development/
│   ├── staging/
│   └── production/
│
├── docs/
│
├── scripts/
│
└── README.md
```

Actual framework choices may be adjusted during Phase 0, but the modular
separation should remain.

------------------------------------------------------------------------

# 4. Implementation Sequence

``` text
PHASE 0  Foundation
   ↓
PHASE 1  Auth + RBAC
   ↓
PHASE 2  Organizations + Venues + Events
   ↓
PHASE 3  Consumer Discovery
   ↓
PHASE 4  Ticketing Engine
   ↓
PHASE 5  Payments
   ↓
PHASE 6  Consumer Tickets
   ↓
PHASE 7  Scanner
   ↓
PHASE 8  Organizer Operations
   ↓
PHASE 9  Admin/HQ
   ↓
PHASE 10 Finance + Settlements
   ↓
PHASE 11 Promoters
   ↓
PHASE 12 Notifications + CMS
   ↓
PHASE 13 Analytics
   ↓
PHASE 14 Security + Performance
   ↓
PHASE 15 Production Launch
```

------------------------------------------------------------------------

# 5. Phase 0 --- Foundation

## Goal

Create a clean development platform before building business features.

## Tasks

### 0.1 Repository

Create:

-   monorepo
-   package manager configuration
-   workspace configuration
-   linting
-   formatting
-   TypeScript configuration
-   shared environment handling
-   Git hooks if appropriate

### 0.2 Environments

Create:

``` text
local
development
staging
production
```

Define environment variable conventions.

### 0.3 CI

Pipeline:

``` text
install
→ lint
→ typecheck
→ unit tests
→ build
```

### 0.4 Shared packages

Create:

``` text
@platform/types
@platform/validation
@platform/api-client
@platform/ui
@platform/design-tokens
```

### 0.5 Backend skeleton

Create modules:

``` text
auth
users
organizations
events
venues
tickets
orders
payments
scanner
notifications
finance
analytics
admin
```

Do not implement full business logic yet.

### 0.6 Database

-   PostgreSQL
-   migration framework
-   base schema
-   seed mechanism
-   test database

### Acceptance Criteria

-   Entire monorepo installs
-   All apps build
-   Backend starts
-   Database connects
-   First migration runs
-   CI passes
-   Environment separation works

------------------------------------------------------------------------

# 6. Phase 1 --- Authentication + RBAC

## Goal

Create one identity system shared by every product.

## Build

### Authentication

-   signup
-   login
-   logout
-   session refresh
-   password reset if password authentication is used
-   Google OAuth
-   Apple OAuth
-   account recovery

### User profile

-   name
-   email
-   phone if required
-   avatar
-   status

### Organizations

-   organizer organization
-   venue organization
-   promoter organization

### Membership

``` text
user
→ organization membership
→ role
→ permissions
```

### RBAC

Implement explicit permissions.

Examples:

``` text
event.create
event.edit
event.publish
ticket.manage
ticket.refund
finance.view
settlement.approve
user.suspend
```

## Acceptance Criteria

-   User can authenticate
-   User can belong to multiple organizations
-   Role determines access
-   Resource ownership is enforced
-   Unauthorized requests return proper errors
-   RBAC tests pass

------------------------------------------------------------------------

# 7. Phase 2 --- Organizations + Venues + Events

## Goal

Create the marketplace supply side.

## Organizer

Build:

-   organization profile
-   team members
-   roles
-   event creation
-   event draft
-   event submission
-   event editing
-   media upload

## Venue

Build:

-   venue profile
-   address
-   capacity
-   photos
-   availability
-   venue staff
-   event requests

## Event lifecycle

``` text
DRAFT
→ SUBMITTED
→ UNDER_REVIEW
→ APPROVED
→ PUBLISHED
→ LIVE
→ COMPLETED
```

## Admin approval

Admin can:

-   approve
-   reject
-   suspend

## Acceptance Criteria

Organizer creates event → submits → admin approves → event becomes
publicly visible.

------------------------------------------------------------------------

# 8. Phase 3 --- Consumer Discovery

## Goal

Build the consumer marketplace experience.

## Consumer Web

Build:

-   homepage
-   search
-   categories
-   cities
-   event listing
-   event page
-   favorites
-   account

## Flutter App

Build:

-   navigation shell
-   authentication
-   homepage
-   discovery
-   event detail
-   favorites
-   profile

## Search

Initial implementation:

-   PostgreSQL filtering
-   category
-   city
-   date
-   price
-   keyword

## Acceptance Criteria

A customer can discover an event from:

-   homepage
-   category
-   search
-   location

and open its full details.

------------------------------------------------------------------------

# 9. Phase 4 --- Ticketing Engine

## Goal

Create the financial/operational core of the marketplace.

## Build

### Ticket types

Support:

-   name
-   price
-   quantity
-   sale start
-   sale end
-   max/order

### Inventory

Implement atomic reservation.

Invariant:

``` text
sold + reserved <= total
```

### Reservation

Flow:

``` text
Create checkout
→ reserve inventory
→ expiry timer
→ payment
→ finalize
```

### Orders

Implement:

-   order creation
-   order items
-   pricing
-   status
-   cancellation

### Tickets

Implement:

-   ticket issuance
-   ticket number
-   secure credential
-   QR
-   ticket status

## Critical Tests

-   100 simultaneous buyers cannot oversell 100 tickets
-   expired reservations release inventory
-   duplicate checkout requests do not duplicate orders
-   duplicate payment confirmation does not issue duplicate tickets

## Acceptance Criteria

Ticketing passes concurrency and idempotency tests.

------------------------------------------------------------------------

# 10. Phase 5 --- Payments

## Goal

Connect the ticketing engine to real payment infrastructure.

## Build

-   payment provider adapter
-   payment creation
-   payment status
-   webhook verification
-   webhook idempotency
-   reconciliation
-   refund foundation

## Critical Flow

``` text
Order
→ Payment Pending
→ Provider
→ Verified Webhook
→ Paid
→ Ticket Issued
```

Never issue tickets based solely on browser redirect.

## Acceptance Criteria

Test payment produces exactly:

``` text
1 order
1 successful payment
correct amount
correct number of tickets
```

No duplicate effects after webhook replay.

------------------------------------------------------------------------

# 11. Phase 6 --- Consumer Ticket Experience

## Goal

Complete the customer purchase journey.

## Build

-   My Tickets
-   Ticket detail
-   QR display
-   Order history
-   Payment confirmation
-   Push notification
-   Email confirmation
-   Offline display of already-issued tickets

## Mobile

Add:

-   deep links
-   push
-   native share
-   calendar integration
-   secure local ticket cache

## Acceptance Criteria

Customer can buy → receive → open ticket without support intervention.

------------------------------------------------------------------------

# 12. Phase 7 --- Scanner

## Goal

Create reliable event-day operations.

## Build

### Authentication

-   scanner staff login
-   device registration
-   event assignment

### Event

-   assigned events
-   gates

### Scanning

-   camera
-   QR decode
-   online validation
-   duplicate detection
-   wrong event
-   refunded
-   cancelled

### Offline

-   bootstrap
-   encrypted local storage
-   offline validation
-   local check-in
-   sync
-   conflict reporting

## Acceptance Criteria

Scanner can:

-   validate a ticket quickly
-   reject duplicate
-   reject wrong event
-   operate under temporary network loss
-   reconcile scans after reconnect

------------------------------------------------------------------------

# 13. Phase 8 --- Organizer Operations

## Goal

Make organizers independently capable of running events.

## Build

### Dashboard

-   revenue
-   tickets sold
-   attendance
-   orders
-   ticket mix

### Event management

-   edit
-   ticket management
-   promo codes
-   guest list
-   complimentary tickets

### Orders

-   search
-   inspect
-   refund where authorized
-   resend ticket

### Team

-   invite
-   assign
-   revoke

### Reports

-   sales
-   attendance
-   exports

## Acceptance Criteria

Normal organizer operations do not require admin intervention.

------------------------------------------------------------------------

# 14. Phase 9 --- Admin/HQ

## Goal

Create centralized operational control.

## Build

### Dashboard

-   GMV
-   orders
-   events
-   users
-   check-ins
-   refunds
-   settlements

### Users

-   search
-   inspect
-   suspend
-   restore

### Events

-   review
-   approve
-   reject
-   suspend
-   feature

### Orders

-   inspect
-   support operations
-   refund under permission

### Moderation

-   cases
-   risk flags

### Audit

-   admin actions
-   security events
-   financial actions

## Acceptance Criteria

Internal team can operate the marketplace without direct database edits.

------------------------------------------------------------------------

# 15. Phase 10 --- Finance + Settlements

## Goal

Make platform financial operations auditable.

## Build

-   ledger
-   commission calculation
-   settlement generation
-   settlement review
-   approval
-   payout tracking
-   reconciliation
-   statements

## Rules

No settlement amount may be manually typed as the source of truth.

It must derive from transactions.

## Acceptance Criteria

Finance can reproduce every settlement from underlying orders, refunds
and commissions.

------------------------------------------------------------------------

# 16. Phase 11 --- Promoter System

## Goal

Create a distribution/growth channel.

## Build

-   promoter onboarding
-   campaign
-   referral code
-   referral link
-   click tracking
-   attribution
-   commission
-   earnings
-   settlement

## Attribution

Define and document:

-   attribution window
-   last-click vs first-click
-   direct code usage
-   refund treatment

## Acceptance Criteria

Promoter sale is attributed exactly once and commission is calculated
correctly.

------------------------------------------------------------------------

# 17. Phase 12 --- Notifications + CMS

## Notifications

Build:

-   push
-   email
-   in-app
-   templates
-   preferences
-   queue
-   retry
-   delivery status

## CMS

Build:

-   homepage banners
-   featured events
-   collections
-   categories
-   editorial blocks
-   pages

## Acceptance Criteria

Admin/content team can update consumer content without deploying code.

------------------------------------------------------------------------

# 18. Phase 13 --- Analytics

## Goal

Make product and operational decisions using reliable data.

## Build

-   event instrumentation
-   consumer funnel
-   organizer analytics
-   promoter analytics
-   scanner analytics
-   admin dashboards

## Critical funnel

``` text
Event View
→ Ticket Selection
→ Checkout
→ Payment
→ Ticket Issued
→ Check-In
```

## Acceptance Criteria

Every critical step is measurable and analytics failures cannot affect
transactions.

------------------------------------------------------------------------

# 19. Phase 14 --- Security + Performance

## Security

-   MFA for privileged users
-   SAST
-   dependency scanning
-   DAST
-   authorization audit
-   webhook security review
-   QR replay testing
-   scanner abuse testing
-   admin security review

## Performance

Test:

-   consumer traffic spike
-   checkout concurrency
-   event-day scan load
-   notification burst
-   admin reporting

## Database

Optimize:

-   indexes
-   slow queries
-   connection pooling
-   query plans

## Acceptance Criteria

Critical paths meet the production performance targets agreed before
launch.

------------------------------------------------------------------------

# 20. Phase 15 --- Production Launch

## Product

-   consumer website
-   consumer apps
-   organizer
-   venue
-   promoter
-   scanner
-   admin

## Finance

-   payments
-   refunds
-   reconciliation
-   settlements

## Operations

-   support
-   event-day support
-   scanner support
-   incident response

## Technical

-   backups
-   monitoring
-   alerts
-   rollback
-   production secrets
-   disaster recovery

## Compliance

Obtain professional review for:

-   privacy
-   terms
-   refund rules
-   tax/GST treatment
-   organizer agreements
-   venue agreements
-   payment/settlement structure
-   data retention

------------------------------------------------------------------------

# 21. AI Agent Work Allocation

Agents should be assigned by domain.

## Agent A --- Platform Architect

Owns:

-   architecture
-   shared contracts
-   dependency decisions
-   technical documentation

Should not independently rewrite domain implementations.

## Agent B --- Backend Core

Owns:

-   API
-   database
-   business services
-   authentication integration

## Agent C --- Consumer Web

Owns:

-   consumer web
-   responsive UI
-   discovery
-   checkout UI

## Agent D --- Flutter Consumer

Owns:

-   iOS/Android consumer app
-   push
-   deep links
-   local ticket experience

## Agent E --- Organizer/Venue

Owns:

-   organizer dashboard
-   venue dashboard

## Agent F --- Scanner

Owns:

-   scanner app
-   offline engine
-   check-in

## Agent G --- Admin/Finance

Owns:

-   admin
-   finance
-   settlement
-   moderation

## Agent H --- QA/Security

Owns:

-   automated tests
-   security tests
-   load tests
-   regression

Only one agent should be the final authority over a shared domain at a
time.

------------------------------------------------------------------------

# 22. Standard AI Coding Task Template

Every coding-agent task should follow this structure:

``` text
TASK ID:
PHASE:
DOMAIN:

OBJECTIVE:

CONTEXT:
Read the relevant documentation before coding.

FILES/DOMAINS:
- ...

IMPLEMENT:
- ...

DO NOT:
- ...
- ...

ACCEPTANCE CRITERIA:
1.
2.
3.

TESTS:
- ...

DATABASE:
- migrations required?
- indexes required?

API:
- endpoints added/changed?

SECURITY:
- authorization requirements

ANALYTICS:
- events required

OUTPUT REPORT:
- files changed
- migrations
- API changes
- tests
- known limitations
```

------------------------------------------------------------------------

# 23. Dependency Rules

Do not start a task until dependencies are complete.

Examples:

``` text
Auth
  ↓
RBAC
  ↓
Organizations
  ↓
Events
  ↓
Ticketing
  ↓
Payments
  ↓
Tickets
  ↓
Scanner
```

Do not build scanner business logic before ticket state is
authoritative.

Do not build settlements before payments/refunds are stable.

Do not build promoter commissions before order attribution is stable.

------------------------------------------------------------------------

# 24. Definition of Done

A feature is complete only when:

-   UI complete
-   API complete
-   database migration complete
-   validation complete
-   authorization complete
-   tests complete
-   analytics complete where applicable
-   audit logging complete where applicable
-   error states complete
-   loading states complete
-   documentation updated

------------------------------------------------------------------------

# 25. Production Readiness Gates

## Gate A --- Technical

-   CI green
-   no critical security issues
-   backups verified
-   monitoring active

## Gate B --- Financial

-   payment reconciliation tested
-   refund reconciliation tested
-   settlement reconciliation tested

## Gate C --- Ticketing

-   oversell tests pass
-   duplicate issuance tests pass
-   QR replay tests pass
-   check-in tests pass

## Gate D --- Scanner

-   online mode tested
-   offline mode tested
-   sync tested
-   device revocation tested

## Gate E --- Operations

-   support workflow ready
-   incident workflow ready
-   event-day support ready

## Gate F --- Mobile

-   iOS beta
-   Android beta
-   crash monitoring
-   release signing
-   store metadata

------------------------------------------------------------------------

# 26. Recommended MVP Scope

Do not delay launch by building every advanced feature.

### Consumer

-   signup/login
-   discovery
-   search
-   event page
-   checkout
-   payment
-   tickets
-   favorites

### Organizer

-   signup
-   organization
-   event creation
-   ticket types
-   sales
-   guest list
-   basic analytics

### Venue

-   profile
-   availability
-   event coordination

### Scanner

-   login
-   event
-   gate
-   QR scan
-   duplicate detection
-   basic offline mode

### Admin

-   users
-   organizers
-   venues
-   events
-   orders
-   refunds
-   basic finance
-   audit

### Backend

-   auth
-   RBAC
-   events
-   ticketing
-   orders
-   payments
-   check-in
-   notifications

------------------------------------------------------------------------

# 27. Features Explicitly Deferred

Unless business requirements change, defer:

-   complex reserved seating
-   social feed
-   direct messaging
-   full native organizer app
-   full native venue app
-   AI event generation
-   advanced dynamic pricing
-   sophisticated recommendation engine
-   multi-country tax engine
-   multi-currency settlement
-   complex marketplace add-ons

------------------------------------------------------------------------

# 28. Final Build Philosophy

The platform should be built as:

``` text
ONE PRODUCT
ONE BACKEND
ONE DATABASE
ONE AUTHORITY MODEL
ONE TICKETING ENGINE
ONE FINANCIAL TRUTH
MULTIPLE EXPERIENCES
```

The consumer website, consumer app, organizer, venue, promoter, scanner
and admin products are interfaces into the same ecosystem.

The most important technical priorities are:

1.  Ticket correctness
2.  Payment correctness
3.  Authorization correctness
4.  Scanner reliability
5.  Financial auditability
6.  Consumer speed
7.  Operational simplicity
8.  Security
9.  Observability
10. Scalability

Do not sacrifice the first five for visual polish.

------------------------------------------------------------------------

# 29. First Implementation Task

The first AI coding task should **not** be "build the website."

It should be:

``` text
TASK 0.1 — Repository + Architecture Foundation

Read:
- 01_BUILD_BIBLE.md
- 02_PRD.md
- 03_SYSTEM_ARCHITECTURE.md
- 04_DATABASE_MODEL.md
- 05_ROLE_PERMISSION_MATRIX.md
- 06_APP_FEATURE_SPECIFICATIONS.md
- 07_API_SPECIFICATION.md
- 08_EXACT_DATABASE_SCHEMA.sql
- 09_DESIGN_SYSTEM.md
- 19_IMPLEMENTATION_RULES_FOR_AI_AGENTS.md
- 20_MASTER_IMPLEMENTATION_PLAN.md

Then inspect the repository.

Do not build business features yet.

Create the monorepo foundation, environments, CI, shared packages,
backend skeleton, database migration system and documentation structure.

Run all builds and tests.

Report every created/changed file and any architecture conflict.
```

That task establishes the foundation on which every subsequent agent
operates.
