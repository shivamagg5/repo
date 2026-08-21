-- =============================================================================
-- Gate A2: Security Layer & Row Level Security (RLS) Execution Script
-- Applies idempotent RLS enablement, tenant isolation policies, and grants.
-- =============================================================================

DO $$
BEGIN
  -- 1. Enable RLS on core user and tenant tables
  ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS notification_preferences ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS device_tokens ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS tickets ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS order_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS events ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS venues ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS event_categories ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS ticket_types ENABLE ROW LEVEL SECURITY;

  -- 2. Enable RLS on sensitive financial, audit, checkin, and administrative tables
  -- (No public policies = 100% blocked for direct non-service-role clients)
  ALTER TABLE IF EXISTS payment_transactions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS payment_events ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS refunds ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS ledger_accounts ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS ledger_entries ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS settlements ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS settlement_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS commission_entries ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS moderation_cases ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS risk_flags ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS checkin_devices ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS checkins ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS checkin_gates ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS organizations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS organization_members ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS roles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS permissions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS role_permissions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS organization_invitations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS promoter_profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS promoter_campaigns ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS referral_clicks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS referral_attributions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS support_tickets ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS support_messages ENABLE ROW LEVEL SECURITY;
END $$;

-- 3. Idempotent Policy Creation for User-Scoped Tables

-- Users: Read/Update own profile
DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users FOR SELECT
  USING (auth.uid()::uuid = supabase_auth_id);

DROP POLICY IF EXISTS "users_update_own_profile" ON users;
CREATE POLICY "users_update_own_profile" ON users FOR UPDATE
  USING (auth.uid()::uuid = supabase_auth_id)
  WITH CHECK (auth.uid()::uuid = supabase_auth_id);

-- Orders: Read own orders
DROP POLICY IF EXISTS "orders_select_own" ON orders;
CREATE POLICY "orders_select_own" ON orders FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE supabase_auth_id = auth.uid()::uuid));

-- Tickets: Read own tickets
DROP POLICY IF EXISTS "tickets_select_own" ON tickets;
CREATE POLICY "tickets_select_own" ON tickets FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE supabase_auth_id = auth.uid()::uuid));

-- Order Items: Read items belonging to own orders
DROP POLICY IF EXISTS "order_items_select_own" ON order_items;
CREATE POLICY "order_items_select_own" ON order_items FOR SELECT
  USING (order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM users WHERE supabase_auth_id = auth.uid()::uuid)));

-- Events: Public read for published/live events
DROP POLICY IF EXISTS "events_select_published" ON events;
CREATE POLICY "events_select_published" ON events FOR SELECT
  USING (status IN ('published', 'live'));

-- Venues: Public read for active venues
DROP POLICY IF EXISTS "venues_select_active" ON venues;
CREATE POLICY "venues_select_active" ON venues FOR SELECT
  USING (status = 'active');

-- Event Categories: Public read for active categories
DROP POLICY IF EXISTS "event_categories_select_active" ON event_categories;
CREATE POLICY "event_categories_select_active" ON event_categories FOR SELECT
  USING (status = 'active');

-- Ticket Types: Public read for active tiers on published/live events
DROP POLICY IF EXISTS "ticket_types_select_active" ON ticket_types;
CREATE POLICY "ticket_types_select_active" ON ticket_types FOR SELECT
  USING (status = 'active' AND event_id IN (SELECT id FROM events WHERE status IN ('published', 'live')));

-- 4. Idempotent Policy Creation for Tenant and Administrative Tables

-- Helper function to prevent RLS recursion
CREATE OR REPLACE FUNCTION public.user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id 
  FROM public.organization_members 
  WHERE user_id = (SELECT id FROM public.users WHERE supabase_auth_id = auth.uid()::uuid LIMIT 1);
$$;

CREATE OR REPLACE FUNCTION public.auth_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM public.users WHERE supabase_auth_id = auth.uid()::uuid LIMIT 1;
$$;

-- Organizations: Members can read own org, active orgs are publicly viewable
DROP POLICY IF EXISTS "organizations_select_member" ON organizations;
CREATE POLICY "organizations_select_member" ON organizations FOR SELECT
  USING (
    status = 'active'
    OR id IN (SELECT public.user_org_ids())
  );

-- Organization Members: Members can read members of own organization
DROP POLICY IF EXISTS "org_members_select_own_org" ON organization_members;
CREATE POLICY "org_members_select_own_org" ON organization_members FOR SELECT
  USING (
    organization_id IN (SELECT public.user_org_ids())
  );

-- Payment Transactions: Users can view payments for own orders
DROP POLICY IF EXISTS "payment_transactions_select_own" ON payment_transactions;
CREATE POLICY "payment_transactions_select_own" ON payment_transactions FOR SELECT
  USING (
    order_id IN (SELECT id FROM orders WHERE user_id = public.auth_user_id())
  );

-- Settlements: Members can view settlements for own organization
DROP POLICY IF EXISTS "settlements_select_own_org" ON settlements;
CREATE POLICY "settlements_select_own_org" ON settlements FOR SELECT
  USING (
    organization_id IN (SELECT public.user_org_ids())
  );

-- Notifications: Users can view own notifications
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  USING (user_id = public.auth_user_id());

-- Notification Preferences: Users can view & update own preferences
DROP POLICY IF EXISTS "notification_preferences_select_own" ON notification_preferences;
CREATE POLICY "notification_preferences_select_own" ON notification_preferences FOR SELECT
  USING (user_id = public.auth_user_id());

DROP POLICY IF EXISTS "notification_preferences_update_own" ON notification_preferences;
CREATE POLICY "notification_preferences_update_own" ON notification_preferences FOR UPDATE
  USING (user_id = public.auth_user_id())
  WITH CHECK (user_id = public.auth_user_id());

