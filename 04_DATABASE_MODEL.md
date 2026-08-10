# Event Ecosystem --- Database Model

## 1. Database

Primary database: PostgreSQL.

Use UUIDs for public identifiers where appropriate. Store monetary
values as integer minor units or an equivalent exact representation;
never use floating point for financial calculations.

## 2. Core Tables

### users

-   id
-   email
-   phone
-   name
-   avatar_url
-   status
-   created_at
-   updated_at

### user_sessions

-   id
-   user_id
-   device_id
-   refresh/session metadata
-   expires_at
-   revoked_at
-   created_at

### organizations

Represents organizer/promoter/venue businesses where needed.

-   id
-   type
-   name
-   slug
-   description
-   logo_url
-   status
-   created_at
-   updated_at

### organization_members

-   id
-   organization_id
-   user_id
-   role_id
-   status
-   created_at

### roles

-   id
-   organization_type
-   name

### permissions

-   id
-   key
-   description

### role_permissions

-   role_id
-   permission_id

## 3. Venues

### venues

-   id
-   organization_id
-   name
-   slug
-   description
-   address
-   city
-   state
-   country
-   latitude
-   longitude
-   capacity
-   status
-   created_at
-   updated_at

### venue_media

-   id
-   venue_id
-   url
-   type
-   sort_order

### venue_availability

-   id
-   venue_id
-   starts_at
-   ends_at
-   status
-   notes

## 4. Events

### events

-   id
-   organizer_organization_id
-   venue_id
-   title
-   slug
-   description
-   category_id
-   status
-   starts_at
-   ends_at
-   timezone
-   capacity
-   age_restriction
-   published_at
-   created_at
-   updated_at

### event_media

-   id
-   event_id
-   url
-   type
-   sort_order

### event_categories

-   id
-   name
-   slug
-   status

### event_lineups

-   id
-   event_id
-   name
-   role
-   sort_order

## 5. Tickets

### ticket_types

-   id
-   event_id
-   name
-   description
-   price_minor
-   currency
-   quantity
-   sold_quantity
-   max_per_order
-   sale_starts_at
-   sale_ends_at
-   status

### inventory_reservations

-   id
-   ticket_type_id
-   order_id
-   quantity
-   expires_at
-   status

### orders

-   id
-   user_id
-   event_id
-   status
-   subtotal_minor
-   fees_minor
-   tax_minor
-   discount_minor
-   total_minor
-   currency
-   idempotency_key
-   created_at
-   updated_at

### order_items

-   id
-   order_id
-   ticket_type_id
-   quantity
-   unit_price_minor
-   total_minor

### tickets

-   id
-   order_id
-   order_item_id
-   ticket_type_id
-   event_id
-   user_id
-   ticket_number
-   status
-   qr_token_hash
-   issued_at
-   checked_in_at
-   voided_at

## 6. Check-In

### checkin_devices

-   id
-   organization_id
-   device_identifier
-   status
-   last_seen_at

### checkin_gates

-   id
-   event_id
-   name
-   status

### checkins

-   id
-   ticket_id
-   event_id
-   gate_id
-   device_id
-   staff_user_id
-   result
-   scanned_at
-   server_recorded_at
-   sync_id

Add a uniqueness strategy appropriate to the final online/offline model
to prevent duplicate successful check-ins.

## 7. Payments

### payment_transactions

-   id
-   order_id
-   provider
-   provider_payment_id
-   amount_minor
-   currency
-   status
-   provider_payload_reference
-   created_at
-   updated_at

### payment_events

-   id
-   payment_transaction_id
-   provider_event_id
-   event_type
-   payload_reference
-   received_at
-   processed_at
-   status

## 8. Refunds

### refunds

-   id
-   order_id
-   payment_transaction_id
-   amount_minor
-   reason
-   status
-   provider_refund_id
-   requested_by
-   created_at
-   completed_at

## 9. Promoters

### promoter_profiles

-   id
-   organization_id
-   status

### promoter_campaigns

-   id
-   promoter_id
-   event_id
-   code
-   commission_type
-   commission_value
-   status

### referral_clicks

-   id
-   campaign_id
-   session_reference
-   created_at

### referral_attributions

-   id
-   campaign_id
-   order_id
-   attributed_at

### commission_entries

-   id
-   campaign_id
-   order_id
-   amount_minor
-   status
-   created_at

## 10. Finance

### ledger_accounts

-   id
-   owner_type
-   owner_id
-   currency
-   status

### ledger_entries

-   id
-   account_id
-   transaction_type
-   reference_type
-   reference_id
-   debit_minor
-   credit_minor
-   created_at

### settlements

-   id
-   beneficiary_organization_id
-   period_start
-   period_end
-   gross_minor
-   deductions_minor
-   commission_minor
-   net_minor
-   status
-   approved_at
-   paid_at

### settlement_items

-   id
-   settlement_id
-   reference_type
-   reference_id
-   amount_minor

## 11. CMS

### cms_banners

### cms_collections

### cms_collection_events

### cms_pages

### cms_blocks

## 12. Notifications

### notification_preferences

-   id
-   user_id
-   channel
-   category
-   enabled

### notifications

-   id
-   user_id
-   type
-   title
-   body
-   data_reference
-   status
-   sent_at
-   read_at

### device_tokens

-   id
-   user_id
-   platform
-   token
-   status
-   updated_at

## 13. Support

### support_tickets

-   id
-   user_id
-   category
-   priority
-   status
-   subject
-   created_at
-   updated_at

### support_messages

-   id
-   ticket_id
-   sender_user_id
-   body
-   created_at

## 14. Moderation

### moderation_cases

-   id
-   entity_type
-   entity_id
-   reason
-   severity
-   status
-   assigned_to
-   created_at
-   resolved_at

### risk_flags

-   id
-   entity_type
-   entity_id
-   rule
-   severity
-   status
-   created_at

## 15. Audit

### audit_logs

-   id
-   actor_user_id
-   action
-   entity_type
-   entity_id
-   metadata_reference
-   ip_hash/reference
-   created_at

## 16. Relationships

``` text
User
 ├── OrganizationMembership ── Organization
 │                               ├── Events
 │                               ├── Venues
 │                               └── PromoterProfile
 │
 ├── Orders
 │    └── OrderItems
 │         └── Tickets
 │
 └── Notifications

Event
 ├── Venue
 ├── TicketTypes
 ├── Orders
 ├── Checkins
 └── PromoterCampaigns

Order
 ├── Payments
 ├── Refunds
 └── Tickets

Organization
 └── Settlements
      └── SettlementItems
```

## 17. Indexing Priorities

Index:

-   events(status, starts_at)
-   events(city/location strategy)
-   ticket_types(event_id, status)
-   orders(user_id, created_at)
-   orders(event_id, status)
-   tickets(event_id, status)
-   tickets(order_id)
-   checkins(event_id, scanned_at)
-   notifications(user_id, status)
-   organization_members(user_id, organization_id)
-   audit_logs(entity_type, entity_id, created_at)

Use geographic indexing if location-based discovery becomes significant.

## 18. Data Rules

-   Never hard-delete financial records.
-   Avoid hard deletion of tickets/orders.
-   Use status transitions.
-   Store exact currency amounts.
-   Maintain immutable transaction references.
-   Protect personal data.
-   Define retention policies before production launch.
