-- =============================================================================
-- Migration: 0007_promoters_engine
-- Description: Promoters engine snapshot columns, performance indexes, unique constraints
-- Task: 6.1 — Promoters & Affiliate Engine
-- Created: Task 6.1
-- =============================================================================
-- IMPORTANT: Never edit this file after it has been applied to any database.
-- All schema changes must be new migrations.
-- =============================================================================

-- 1. Add historical snapshot columns to commission_entries
ALTER TABLE commission_entries ADD COLUMN IF NOT EXISTS commission_type text;
ALTER TABLE commission_entries ADD COLUMN IF NOT EXISTS commission_value numeric(12,4);
ALTER TABLE commission_entries ADD COLUMN IF NOT EXISTS calculation_base_minor bigint;
ALTER TABLE commission_entries ADD COLUMN IF NOT EXISTS ticket_quantity integer DEFAULT 1;
ALTER TABLE commission_entries ADD COLUMN IF NOT EXISTS currency char(3) DEFAULT 'INR';

-- 2. Performance & Unique Indexes on Promoters Domain
CREATE INDEX IF NOT EXISTS idx_promoter_campaigns_event ON promoter_campaigns(event_id, status);
CREATE INDEX IF NOT EXISTS idx_promoter_campaigns_promoter ON promoter_campaigns(promoter_id);
CREATE INDEX IF NOT EXISTS idx_commission_entries_campaign_status ON commission_entries(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_commission_entries_order ON commission_entries(order_id);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_campaign ON referral_clicks(campaign_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_referral_attributions_order ON referral_attributions(order_id);
