-- =============================================================================
-- Migration: 0001_initial_schema
-- Description: Baseline schema for the Event Ecosystem platform
-- Source: docs/08_EXACT_DATABASE_SCHEMA.sql
-- Created: Task 0.1 — Foundation
-- =============================================================================
-- This is the canonical source of schema truth.
-- Changes to this schema must be made as new migrations (0002_*, 0003_*, etc.)
-- Never edit this file after it has been applied to any database.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------------------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------------------
CREATE TYPE user_status AS ENUM ('active','suspended','deleted');
CREATE TYPE organization_type AS ENUM ('organizer','venue','promoter');
CREATE TYPE organization_status AS ENUM ('pending','active','suspended','rejected');
CREATE TYPE event_status AS ENUM (
  'draft','submitted','under_review','approved','published',
  'live','completed','rejected','suspended','cancelled'
);
CREATE TYPE ticket_status AS ENUM ('issued','checked_in','refunded','void','cancelled','expired');
CREATE TYPE order_status AS ENUM (
  'created','payment_pending','paid','tickets_issued','completed',
  'payment_failed','cancelled','refund_pending','partially_refunded','refunded'
);
CREATE TYPE payment_status AS ENUM (
  'pending','authorized','paid','failed','cancelled','refunded','partially_refunded'
);
CREATE TYPE refund_status AS ENUM (
  'requested','pending','processing','completed','failed','cancelled'
);
CREATE TYPE settlement_status AS ENUM (
  'draft','pending_review','approved','processing','paid','failed','cancelled'
);
CREATE TYPE checkin_result AS ENUM (
  'success','invalid','already_used','wrong_event',
  'refunded','cancelled','expired','access_denied','offline_pending'
);
CREATE TYPE notification_status AS ENUM ('queued','sent','delivered','failed','read');

-- ---------------------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext UNIQUE,
  phone text,
  name text NOT NULL,
  avatar_url text,
  status user_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- ROLES & PERMISSIONS
-- ---------------------------------------------------------------------------
CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_type organization_type,
  name text NOT NULL,
  UNIQUE (organization_type, name)
);

CREATE TABLE permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  description text
);

CREATE TABLE role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ---------------------------------------------------------------------------
-- ORGANIZATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type organization_type NOT NULL,
  name text NOT NULL,
  slug citext UNIQUE NOT NULL,
  description text,
  logo_url text,
  status organization_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

-- ---------------------------------------------------------------------------
-- VENUES
-- ---------------------------------------------------------------------------
CREATE TABLE venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  name text NOT NULL,
  slug citext UNIQUE NOT NULL,
  description text,
  address text,
  city text,
  state text,
  country text DEFAULT 'IN',
  latitude numeric(9,6),
  longitude numeric(9,6),
  capacity integer CHECK (capacity IS NULL OR capacity > 0),
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- EVENTS
-- ---------------------------------------------------------------------------
CREATE TABLE event_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug citext UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active'
);

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  venue_id uuid REFERENCES venues(id) ON DELETE RESTRICT,
  category_id uuid REFERENCES event_categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug citext UNIQUE NOT NULL,
  description text,
  status event_status NOT NULL DEFAULT 'draft',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  capacity integer CHECK (capacity IS NULL OR capacity > 0),
  age_restriction text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE event_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  url text NOT NULL,
  type text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE event_lineups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  sort_order integer NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- TICKET TYPES & INVENTORY
-- ---------------------------------------------------------------------------
CREATE TABLE ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_minor bigint NOT NULL CHECK (price_minor >= 0),
  currency char(3) NOT NULL DEFAULT 'INR',
  quantity integer NOT NULL CHECK (quantity > 0),
  sold_quantity integer NOT NULL DEFAULT 0 CHECK (sold_quantity >= 0),
  reserved_quantity integer NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  max_per_order integer NOT NULL DEFAULT 10 CHECK (max_per_order > 0),
  sale_starts_at timestamptz,
  sale_ends_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sold_quantity + reserved_quantity <= quantity)
);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  status order_status NOT NULL DEFAULT 'created',
  subtotal_minor bigint NOT NULL DEFAULT 0 CHECK (subtotal_minor >= 0),
  fees_minor bigint NOT NULL DEFAULT 0 CHECK (fees_minor >= 0),
  tax_minor bigint NOT NULL DEFAULT 0 CHECK (tax_minor >= 0),
  discount_minor bigint NOT NULL DEFAULT 0 CHECK (discount_minor >= 0),
  total_minor bigint NOT NULL DEFAULT 0 CHECK (total_minor >= 0),
  currency char(3) NOT NULL DEFAULT 'INR',
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  ticket_type_id uuid NOT NULL REFERENCES ticket_types(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price_minor bigint NOT NULL CHECK (unit_price_minor >= 0),
  total_minor bigint NOT NULL CHECK (total_minor >= 0)
);

CREATE TABLE inventory_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_type_id uuid NOT NULL REFERENCES ticket_types(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
  ticket_type_id uuid NOT NULL REFERENCES ticket_types(id) ON DELETE RESTRICT,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  ticket_number text UNIQUE NOT NULL,
  status ticket_status NOT NULL DEFAULT 'issued',
  qr_token_hash text UNIQUE NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  checked_in_at timestamptz,
  voided_at timestamptz
);

-- ---------------------------------------------------------------------------
-- PAYMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  provider text NOT NULL,
  provider_payment_id text UNIQUE,
  amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
  currency char(3) NOT NULL DEFAULT 'INR',
  status payment_status NOT NULL DEFAULT 'pending',
  provider_payload_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_transaction_id uuid REFERENCES payment_transactions(id) ON DELETE SET NULL,
  provider_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  payload_reference text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  status text NOT NULL DEFAULT 'received'
);

-- ---------------------------------------------------------------------------
-- REFUNDS
-- ---------------------------------------------------------------------------
CREATE TABLE refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  payment_transaction_id uuid REFERENCES payment_transactions(id) ON DELETE RESTRICT,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  reason text,
  status refund_status NOT NULL DEFAULT 'requested',
  provider_refund_id text UNIQUE,
  requested_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- CHECK-INS
-- ---------------------------------------------------------------------------
CREATE TABLE checkin_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  device_identifier text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active',
  last_seen_at timestamptz
);

CREATE TABLE checkin_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  UNIQUE (event_id, name)
);

CREATE TABLE checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  gate_id uuid REFERENCES checkin_gates(id) ON DELETE SET NULL,
  device_id uuid REFERENCES checkin_devices(id) ON DELETE SET NULL,
  staff_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  result checkin_result NOT NULL,
  scanned_at timestamptz NOT NULL,
  server_recorded_at timestamptz NOT NULL DEFAULT now(),
  sync_id uuid UNIQUE NOT NULL
);

-- ---------------------------------------------------------------------------
-- PROMOTERS
-- ---------------------------------------------------------------------------
CREATE TABLE promoter_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active'
);

CREATE TABLE promoter_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id uuid NOT NULL REFERENCES promoter_profiles(id) ON DELETE RESTRICT,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  code text NOT NULL,
  commission_type text NOT NULL,
  commission_value numeric(12,4) NOT NULL CHECK (commission_value >= 0),
  status text NOT NULL DEFAULT 'active',
  UNIQUE (event_id, code)
);

CREATE TABLE referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES promoter_campaigns(id) ON DELETE CASCADE,
  session_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE referral_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES promoter_campaigns(id) ON DELETE RESTRICT,
  order_id uuid UNIQUE NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  attributed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE commission_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES promoter_campaigns(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- FINANCE / LEDGER
-- ---------------------------------------------------------------------------
CREATE TABLE ledger_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type text NOT NULL,
  owner_id uuid NOT NULL,
  currency char(3) NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'active'
);

CREATE TABLE ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
  transaction_type text NOT NULL,
  reference_type text NOT NULL,
  reference_id uuid NOT NULL,
  debit_minor bigint NOT NULL DEFAULT 0 CHECK (debit_minor >= 0),
  credit_minor bigint NOT NULL DEFAULT 0 CHECK (credit_minor >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((debit_minor = 0) <> (credit_minor = 0))
);

CREATE TABLE settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  gross_minor bigint NOT NULL DEFAULT 0,
  deductions_minor bigint NOT NULL DEFAULT 0,
  commission_minor bigint NOT NULL DEFAULT 0,
  net_minor bigint NOT NULL DEFAULT 0,
  status settlement_status NOT NULL DEFAULT 'draft',
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end > period_start)
);

CREATE TABLE settlement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id uuid NOT NULL REFERENCES settlements(id) ON DELETE RESTRICT,
  reference_type text NOT NULL,
  reference_id uuid NOT NULL,
  amount_minor bigint NOT NULL
);

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel text NOT NULL,
  category text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  UNIQUE (user_id, channel, category)
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data_reference text,
  status notification_status NOT NULL DEFAULT 'queued',
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform text NOT NULL,
  token text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- SUPPORT
-- ---------------------------------------------------------------------------
CREATE TABLE support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  category text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  subject text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- MODERATION & AUDIT
-- ---------------------------------------------------------------------------
CREATE TABLE moderation_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  reason text NOT NULL,
  severity text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE risk_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  rule text NOT NULL,
  severity text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX idx_events_status_start ON events(status, starts_at);
CREATE INDEX idx_events_category ON events(category_id, starts_at);
CREATE INDEX idx_events_organizer ON events(organizer_organization_id, starts_at);
CREATE INDEX idx_ticket_types_event ON ticket_types(event_id, status);
CREATE INDEX idx_orders_user ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_event ON orders(event_id, status);
CREATE INDEX idx_tickets_event ON tickets(event_id, status);
CREATE INDEX idx_tickets_order ON tickets(order_id);
CREATE INDEX idx_checkins_event_time ON checkins(event_id, scanned_at DESC);
CREATE INDEX idx_notifications_user_status ON notifications(user_id, status, created_at DESC);
CREATE INDEX idx_members_user_org ON organization_members(user_id, organization_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_reservations_expiry ON inventory_reservations(expires_at, status);
CREATE INDEX idx_payment_events_status ON payment_events(status, received_at);
