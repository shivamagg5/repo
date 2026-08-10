-- =============================================================================
-- Migration: 0005_ticketing_engine
-- Description: Ticketing engine foundation, min_per_order, idempotency_records, performance indexes
-- Task: 4.1 — Ticketing Engine Foundation
-- Created: Task 4.1
-- =============================================================================
-- IMPORTANT: Never edit this file after it has been applied to any database.
-- All schema changes must be new migrations.
-- =============================================================================

-- 1. Add min_per_order to ticket_types if not present
ALTER TABLE ticket_types ADD COLUMN IF NOT EXISTS min_per_order integer NOT NULL DEFAULT 1 CHECK (min_per_order > 0);

-- 2. Add user_id to inventory_reservations if not present
ALTER TABLE inventory_reservations ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE RESTRICT;

-- 3. Idempotency Records Table with UNIQUE constraint
CREATE TABLE IF NOT EXISTS idempotency_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_path text NOT NULL,
  request_hash text NOT NULL,
  response_status integer NOT NULL,
  response_body jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uk_idempotency_key_user UNIQUE (idempotency_key, user_id)
);

-- 4. High-Performance Discovery & Processing Indexes
CREATE INDEX IF NOT EXISTS idx_reservations_status_expires ON inventory_reservations(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_user_status ON tickets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_idempotency_key_user ON idempotency_records(idempotency_key, user_id);
