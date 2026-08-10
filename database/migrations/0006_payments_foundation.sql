-- =============================================================================
-- Migration: 0006_payments_foundation
-- Description: Payment transactions provider_order_id, provider event uniqueness, and indexes
-- Task: 5.1 — Payments + Checkout Foundation
-- Created: Task 5.1
-- =============================================================================
-- IMPORTANT: Never edit this file after it has been applied to any database.
-- All schema changes must be new migrations.
-- =============================================================================

-- 1. Add provider_order_id to payment_transactions if not present
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS provider_order_id text;

-- 2. Performance & Unique Indexes on payment_transactions
CREATE INDEX IF NOT EXISTS idx_payment_tx_order_id ON payment_transactions(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_payment_tx_provider_order ON payment_transactions(provider, provider_order_id) WHERE provider_order_id IS NOT NULL;

-- 3. Payment Events Uniqueness & Index
CREATE INDEX IF NOT EXISTS idx_payment_events_tx ON payment_events(payment_transaction_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_payment_events_provider_event ON payment_events(provider_event_id) WHERE provider_event_id IS NOT NULL;
