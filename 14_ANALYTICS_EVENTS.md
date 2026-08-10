# Event Ecosystem --- Analytics Event Specification

## 1. Principles

Analytics must answer:

-   What users discover
-   What converts
-   Where checkout fails
-   Which events perform
-   Which channels sell
-   Which operational problems occur

Do not collect unnecessary sensitive data.

## 2. Common Event Schema

``` json
{
  "event": "event_view",
  "eventId": "uuid",
  "userId": "uuid-or-null",
  "sessionId": "uuid",
  "timestamp": "ISO-8601",
  "platform": "web|ios|android|admin",
  "appVersion": "1.0.0",
  "properties": {}
}
```

## 3. Consumer Events

``` text
app_open
session_start
page_view
search_started
search_completed
filter_applied
event_view
event_share
favorite_added
favorite_removed
checkout_started
checkout_ticket_selected
promo_applied
payment_started
payment_success
payment_failed
order_viewed
ticket_viewed
ticket_shared
refund_requested
notification_opened
```

## 4. Organizer Events

``` text
organizer_login
event_created
event_saved
event_submitted
event_published
ticket_type_created
ticket_price_changed
promo_created
guest_added
dashboard_viewed
report_exported
refund_processed
```

## 5. Scanner Events

``` text
scanner_login
scanner_event_selected
scanner_bootstrap
scan_started
scan_success
scan_invalid
scan_already_used
scan_wrong_event
scan_refunded
offline_mode_entered
offline_scan
sync_started
sync_completed
sync_conflict
device_revoked
```

## 6. Admin Events

``` text
admin_login
event_approved
event_rejected
event_suspended
user_suspended
refund_approved
settlement_approved
settlement_paid
role_changed
device_revoked
```

## 7. Business Metrics

### Consumer

-   DAU/MAU
-   Event views
-   Checkout conversion
-   Purchase conversion
-   Repeat purchase
-   Favorite rate

### Marketplace

-   GMV
-   Orders
-   Tickets sold
-   Average order value
-   Event sell-through
-   Refund rate

### Organizer

-   Revenue/event
-   Ticket velocity
-   Attendance rate
-   Conversion rate

### Promoter

-   Click-through
-   Attribution
-   Conversion
-   Commission

### Operations

-   Check-in rate
-   Scan latency
-   Invalid scan rate
-   Offline scan rate
-   Sync conflict rate

## 8. Funnel

``` text
Discovery
→ Event View
→ Ticket Selection
→ Checkout
→ Payment
→ Ticket Issued
→ Attendance
```

Measure drop-off between each step.

## 9. Data Quality

Analytics events should be:

-   Versioned
-   Documented
-   Validated
-   De-duplicated where needed

Business-critical finance records must never depend on analytics events.
