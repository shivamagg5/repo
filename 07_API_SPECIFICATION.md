# Event Ecosystem --- API Specification

**Version:** 1.0\
**Status:** Engineering baseline

## 1. API Standards

Base path:

``` text
/api/v1
```

Transport: HTTPS JSON REST. Use WebSocket only for explicitly real-time
features.

Headers:

``` http
Authorization: Bearer <access_token>
Content-Type: application/json
Idempotency-Key: <unique-key>
X-Request-ID: <client-request-id>
```

## 2. Standard Response

Success:

``` json
{
  "data": {},
  "meta": {
    "requestId": "..."
  }
}
```

List:

``` json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 100,
    "requestId": "..."
  }
}
```

Error:

``` json
{
  "error": {
    "code": "TICKET_SOLD_OUT",
    "message": "The selected ticket type is no longer available.",
    "details": {}
  },
  "meta": {
    "requestId": "..."
  }
}
```

## 3. Authentication

``` text
POST /auth/signup
POST /auth/login
POST /auth/logout
POST /auth/refresh
POST /auth/forgot-password
POST /auth/reset-password
POST /auth/oauth
GET  /auth/me
GET  /auth/sessions
DELETE /auth/sessions/:id
```

OAuth providers may include Google and Apple.

## 4. Users

``` text
GET    /users/me
PATCH  /users/me
GET    /users/me/orders
GET    /users/me/tickets
GET    /users/me/favorites
POST   /users/me/favorites/:eventId
DELETE /users/me/favorites/:eventId
GET    /users/me/notifications
PATCH  /users/me/notification-preferences
```

## 5. Discovery

``` text
GET /events
GET /events/:eventId
GET /events/slug/:slug
GET /events/featured
GET /events/trending
GET /events/nearby
GET /categories
GET /cities
GET /search
```

Query examples:

``` text
/events?city=amritsar&from=2026-09-01&to=2026-09-30&category=music
```

## 6. Organizer

``` text
GET    /organizer/events
POST   /organizer/events
GET    /organizer/events/:id
PATCH  /organizer/events/:id
POST   /organizer/events/:id/submit
POST   /organizer/events/:id/publish
POST   /organizer/events/:id/cancel
POST   /organizer/events/:id/duplicate

GET    /organizer/events/:id/tickets
POST   /organizer/events/:id/tickets
PATCH  /organizer/tickets/:ticketTypeId

GET    /organizer/events/:id/orders
GET    /organizer/events/:id/attendance
GET    /organizer/events/:id/analytics
GET    /organizer/events/:id/guest-list
POST   /organizer/events/:id/guest-list

GET    /organizer/team
POST   /organizer/team/invitations
DELETE /organizer/team/:membershipId
```

## 7. Venues

``` text
GET   /venues
GET   /venues/:id
POST  /venue/profile
PATCH /venue/profile
GET   /venue/calendar
GET   /venue/event-requests
POST  /venue/event-requests/:id/approve
POST  /venue/event-requests/:id/reject
GET   /venue/events
GET   /venue/staff
POST  /venue/staff
DELETE /venue/staff/:id
```

## 8. Checkout

``` text
POST /checkout/sessions
GET  /checkout/sessions/:id
POST /checkout/sessions/:id/payment
POST /checkout/sessions/:id/cancel
```

Create checkout request:

``` json
{
  "eventId": "uuid",
  "items": [
    {
      "ticketTypeId": "uuid",
      "quantity": 2
    }
  ],
  "promoCode": "EARLY10"
}
```

The server calculates price, fees, tax and availability.

The client never submits an authoritative total.

## 9. Orders

``` text
GET /orders/:id
GET /orders/:id/tickets
POST /orders/:id/refund-request
```

## 10. Payments

``` text
POST /payments/create
GET  /payments/:id
POST /payments/webhooks/:provider
```

Webhook endpoints must verify provider signatures.

## 11. Tickets

``` text
GET  /tickets/:id
GET  /tickets/:id/qr
POST /tickets/:id/transfer
POST /tickets/:id/cancel
```

Ticket operations require authorization and state validation.

## 12. Scanner

``` text
POST /scanner/devices/register
GET  /scanner/events
GET  /scanner/events/:eventId/bootstrap
POST /scanner/checkins/validate
POST /scanner/checkins
POST /scanner/checkins/batch
GET  /scanner/events/:eventId/status
POST /scanner/sync
```

A check-in request:

``` json
{
  "ticketToken": "opaque-or-signed-token",
  "eventId": "uuid",
  "gateId": "uuid",
  "deviceId": "uuid",
  "scanId": "uuid",
  "scannedAt": "2026-09-01T18:00:00Z"
}
```

`scanId` is an idempotency key.

## 13. Promoters

``` text
GET  /promoter/campaigns
GET  /promoter/campaigns/:id
GET  /promoter/campaigns/:id/performance
GET  /promoter/earnings
GET  /promoter/settlements
```

## 14. Admin

``` text
GET  /admin/dashboard
GET  /admin/users
POST /admin/users/:id/suspend
POST /admin/users/:id/restore

GET  /admin/events
POST /admin/events/:id/approve
POST /admin/events/:id/reject
POST /admin/events/:id/suspend

GET  /admin/orders
GET  /admin/payments
GET  /admin/refunds
GET  /admin/settlements
POST /admin/settlements/:id/approve
POST /admin/settlements/:id/mark-paid

GET  /admin/moderation/cases
GET  /admin/audit-logs
```

## 15. Pagination

Use cursor pagination for high-volume feeds.

Example:

``` text
GET /orders?limit=50&cursor=<opaque-cursor>
```

Offset pagination is acceptable for small admin tables.

## 16. Rate Limits

Suggested starting limits:

-   Public discovery: 120 requests/min/IP
-   Auth: 10 sensitive attempts/min/account/IP
-   Checkout: 20 creation requests/min/user
-   Scanner: high-throughput authenticated limits
-   Admin: authenticated, role-aware limits

Tune from real telemetry.

## 17. API Authorization

Every protected route checks:

1.  Valid authentication
2.  User status
3.  Required permission
4.  Resource ownership/scope
5.  Entity state
6.  Business rule

## 18. API Versioning

Breaking changes require a new version.

Never silently change response semantics for existing clients.

## 19. Webhooks

All webhooks must have:

-   Signature verification
-   Provider event ID
-   Idempotency
-   Raw payload retention/reference
-   Processing status
-   Retry support
-   Dead-letter handling

## 20. OpenAPI

Generate an OpenAPI specification from the API contract and use it for:

-   Client generation
-   Contract testing
-   Documentation
-   QA
