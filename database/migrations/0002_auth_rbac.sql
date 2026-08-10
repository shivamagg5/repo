-- =============================================================================
-- Migration: 0002_auth_rbac
-- Description: Auth identity bridge, organization invitations, and RLS policies
-- Task: 1.1 — Authentication + Organizations + RBAC
-- Created: Task 1.1
-- =============================================================================
-- IMPORTANT: Never edit this file after it has been applied to any database.
-- All schema changes must be new migrations (0003_*, 0004_*, etc.)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add supabase_auth_id to users
-- ---------------------------------------------------------------------------
-- This is a new project with no production users.
-- The column is NOT NULL from day one — no backfill phase required.
-- supabase_auth_id maps auth.users.id → public.users.id
-- users.id remains the application PK used by all FKs.
-- ---------------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN supabase_auth_id uuid NOT NULL UNIQUE;

CREATE INDEX idx_users_supabase_auth_id ON users(supabase_auth_id);

-- ---------------------------------------------------------------------------
-- 2. Organization invitations
-- ---------------------------------------------------------------------------
CREATE TABLE organization_invitations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_email    citext NOT NULL,
  role_id          uuid NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  invited_by       uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  -- token is the raw opaque value returned to the inviter (one-time, response only)
  -- token_hash is SHA-256(token) stored in the DB — never the plaintext token
  token_hash       text NOT NULL UNIQUE,
  -- status: pending | accepted | expired | revoked
  status           text NOT NULL DEFAULT 'pending',
  expires_at       timestamptz NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at      timestamptz,
  accepted_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invitations_token_hash    ON organization_invitations(token_hash);
CREATE INDEX idx_invitations_org_status    ON organization_invitations(organization_id, status, expires_at);
CREATE INDEX idx_invitations_email_status  ON organization_invitations(invited_email, status);

-- ---------------------------------------------------------------------------
-- 3. RLS — Enable and create policies
-- ---------------------------------------------------------------------------
-- The backend uses the SERVICE ROLE KEY which bypasses RLS.
-- RLS is a defense-in-depth safety net for any access that bypasses the backend.
-- ---------------------------------------------------------------------------

-- users: authenticated users may read only their own record
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (auth.uid()::uuid = supabase_auth_id);
CREATE POLICY "users_update_own_profile"
  ON users FOR UPDATE
  USING (auth.uid()::uuid = supabase_auth_id)
  WITH CHECK (auth.uid()::uuid = supabase_auth_id);

-- notifications: own only
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE supabase_auth_id = auth.uid()::uuid));

-- notification_preferences: own only
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_prefs_own"
  ON notification_preferences FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE supabase_auth_id = auth.uid()::uuid));

-- device_tokens: own only
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "device_tokens_own"
  ON device_tokens FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE supabase_auth_id = auth.uid()::uuid));

-- orders: own only
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_select_own"
  ON orders FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE supabase_auth_id = auth.uid()::uuid));

-- tickets: own only
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tickets_select_own"
  ON tickets FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE supabase_auth_id = auth.uid()::uuid));

-- order_items: accessible if the parent order belongs to the user
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_select_own"
  ON order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE user_id IN (SELECT id FROM users WHERE supabase_auth_id = auth.uid()::uuid)
    )
  );

-- events: authenticated users can read published/live events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_select_published"
  ON events FOR SELECT
  USING (status IN ('published', 'live'));

-- venues: authenticated users can read active venues
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venues_select_active"
  ON venues FOR SELECT
  USING (status = 'active');

-- event_categories: public read for active categories
ALTER TABLE event_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event_categories_select_active"
  ON event_categories FOR SELECT
  USING (status = 'active');

-- ticket_types: readable for active types on published events
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ticket_types_select_active"
  ON ticket_types FOR SELECT
  USING (
    status = 'active'
    AND event_id IN (SELECT id FROM events WHERE status IN ('published', 'live'))
  );

-- ---------------------------------------------------------------------------
-- Block all direct client access to financial/security/RBAC tables
-- No policies = effectively blocked for anon/authenticated (non-service-role) callers
-- ---------------------------------------------------------------------------
ALTER TABLE payment_transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_accounts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements             ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_cases        ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_flags              ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_devices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins                ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoter_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoter_campaigns      ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_clicks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_attributions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages        ENABLE ROW LEVEL SECURITY;
