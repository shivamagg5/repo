-- =============================================================================
-- Migration: 0008_performance_indexes
-- Description: Add missing non-unique FK and operational query indexes across
--              the core domain tables. These are required to prevent full table
--              scans on orders, tickets, checkins, notification_outbox, and
--              inventory_holds as data volume grows.
-- Task: T9 — Performance & Index Hardening
-- Created: 2026-08-31
-- =============================================================================
-- IMPORTANT: Never edit this file after it has been applied to any database.
-- All schema changes must be new migrations.
-- =============================================================================

-- -----------------------------------------------------------------------
-- 1. ORDERS domain
-- -----------------------------------------------------------------------
-- Most frequent query pattern: "get all orders for a user"
CREATE INDEX IF NOT EXISTS idx_orders_user_id
  ON orders(user_id);

-- "get all orders for an event" (organizer dashboard, analytics)
CREATE INDEX IF NOT EXISTS idx_orders_event_id
  ON orders(event_id);

-- Filter orders by status (paid, expired, refunded) — used in settlements, analytics
CREATE INDEX IF NOT EXISTS idx_orders_status
  ON orders(status, created_at DESC);

-- -----------------------------------------------------------------------
-- 2. TICKETS domain
-- -----------------------------------------------------------------------
-- "get all tickets for an order" (order confirmation, wallet)
CREATE INDEX IF NOT EXISTS idx_tickets_order_id
  ON tickets(order_id);

-- "get all tickets for a user" (consumer wallet screen)
CREATE INDEX IF NOT EXISTS idx_tickets_user_id
  ON tickets(user_id);

-- "get all tickets for an event" (scanner, organizer, analytics)
CREATE INDEX IF NOT EXISTS idx_tickets_event_id
  ON tickets(event_id);

-- Filter revoked/refunded tickets during scanner check
CREATE INDEX IF NOT EXISTS idx_tickets_status
  ON tickets(status);

-- -----------------------------------------------------------------------
-- 3. CHECKINS domain
-- -----------------------------------------------------------------------
-- "get all check-ins for a ticket" (replay protection, duplicate detection)
CREATE INDEX IF NOT EXISTS idx_checkins_ticket_id
  ON checkins(ticket_id);

-- "get all check-ins for an event" (gate metrics dashboard)
CREATE INDEX IF NOT EXISTS idx_checkins_event_id
  ON checkins(event_id);

-- "get check-ins per device" (scanner session metrics)
CREATE INDEX IF NOT EXISTS idx_checkins_device_id
  ON checkins(device_id);

-- -----------------------------------------------------------------------
-- 4. INVENTORY HOLDS domain
-- -----------------------------------------------------------------------
-- Critical for hold-expiry worker: filter active holds by expiry time
-- Partial index on active holds only — keeps index small and fast
CREATE INDEX IF NOT EXISTS idx_inventory_holds_expires_at
  ON inventory_reservations(expires_at, status)
  WHERE status = 'active';

-- "get all holds for an order" (reservation service, expiry processing)
CREATE INDEX IF NOT EXISTS idx_inventory_holds_order_id
  ON inventory_reservations(order_id);

-- -----------------------------------------------------------------------
-- 5. NOTIFICATION OUTBOX domain
-- -----------------------------------------------------------------------
-- Worker polling: claim unprocessed/failed rows with FOR UPDATE SKIP LOCKED
CREATE INDEX IF NOT EXISTS idx_notification_outbox_status_created
  ON notification_outbox(status, created_at ASC);

-- Retry backoff: filter rows eligible for retry by next_attempt_at
CREATE INDEX IF NOT EXISTS idx_notification_outbox_next_attempt
  ON notification_outbox(next_attempt_at)
  WHERE status IN ('pending', 'failed');

-- -----------------------------------------------------------------------
-- 6. EVENTS domain
-- -----------------------------------------------------------------------
-- Public discovery: published events ordered by start time
CREATE INDEX IF NOT EXISTS idx_events_status_starts_at
  ON events(status, starts_at ASC);

-- Organizer event listing: get all events for an organization
CREATE INDEX IF NOT EXISTS idx_events_organizer_organization_id
  ON events(organizer_organization_id);

-- Venue event listing
CREATE INDEX IF NOT EXISTS idx_events_venue_id
  ON events(venue_id);

-- -----------------------------------------------------------------------
-- 7. ANALYTICS EVENTS domain
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_event_id text UNIQUE,
  event_name text NOT NULL,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  session_id text,
  platform text NOT NULL DEFAULT 'web',
  app_version text,
  properties_json text NOT NULL DEFAULT '{}',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics_aggregates_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_date timestamptz NOT NULL,
  metric_name text NOT NULL,
  dimension_type text,
  dimension_id text,
  metric_value bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unq_aggregate_dimension UNIQUE (aggregate_date, metric_name, dimension_type, dimension_id)
);

-- Funnel analysis: filter by event_name + occurred_at (time-series queries)
CREATE INDEX IF NOT EXISTS idx_analytics_events_name_occurred
  ON analytics_events(event_name, occurred_at DESC);

-- Event-scoped analytics: filter by event_id + occurred_at
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_occurred
  ON analytics_events(event_id, occurred_at DESC)
  WHERE event_id IS NOT NULL;

-- -----------------------------------------------------------------------
-- 8. LEDGER ENTRIES domain
-- -----------------------------------------------------------------------
-- Settlement reconciliation: get all entries for an organization
CREATE INDEX IF NOT EXISTS idx_ledger_entries_org_id
  ON ledger_entries(organization_id);

-- Payment lifecycle: get all ledger entries for an order
CREATE INDEX IF NOT EXISTS idx_ledger_entries_order_id
  ON ledger_entries(order_id);

-- -----------------------------------------------------------------------
-- 9. COMMISSION ENTRIES domain (supplements 0007 promoter indexes)
-- -----------------------------------------------------------------------
-- Settlement processing: get commissions for an organization/period
CREATE INDEX IF NOT EXISTS idx_commission_entries_org_status
  ON commission_entries(organization_id, status)
  WHERE organization_id IS NOT NULL;

-- -----------------------------------------------------------------------
-- 10. AUDIT LOGS domain
-- -----------------------------------------------------------------------
-- Admin audit log queries: filter by actor + time
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created
  ON audit_logs(actor_user_id, created_at DESC)
  WHERE actor_user_id IS NOT NULL;

-- Admin audit log queries: filter by entity
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON audit_logs(entity_type, entity_id)
  WHERE entity_id IS NOT NULL;
