-- =============================================================================
-- Migration: 0009_dashboard_operations_and_kyb
-- Description: Dashboard operations, KYB, settlement lifecycle, broadcast campaigns, 
--              scanner pairing tokens, and canonical RBAC platform role permissions.
-- Created: Task Phase 14 Hardening
-- =============================================================================

-- 1. Extend settlement_status enum
ALTER TYPE "settlement_status" ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE "settlement_status" ADD VALUE IF NOT EXISTS 'on_hold';

-- 2. Organizations KYB & Commission fields
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "kyb_status" text NOT NULL DEFAULT 'unsubmitted';
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "kyb_submitted_at" timestamptz;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "kyb_verified_at" timestamptz;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "kyb_rejection_reason" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "legal_entity_name" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "tax_id_pan" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "gstin" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "business_address_json" text DEFAULT '{}';
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "custom_commission_rate_bps" integer;
CREATE INDEX IF NOT EXISTS "idx_organizations_kyb_status" ON "organizations" ("kyb_status");

-- 3. Events affiliate campaign setting
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "affiliate_campaigns_enabled" boolean NOT NULL DEFAULT true;

-- 4. Settlements lifecycle, payment profile reference, and disbursement audit fields
ALTER TABLE "settlements" ADD COLUMN IF NOT EXISTS "payment_profile_id" uuid REFERENCES "payment_profiles"("id") ON DELETE RESTRICT;
ALTER TABLE "settlements" ADD COLUMN IF NOT EXISTS "masked_account_number" text;
ALTER TABLE "settlements" ADD COLUMN IF NOT EXISTS "ifsc" text;
ALTER TABLE "settlements" ADD COLUMN IF NOT EXISTS "transaction_reference" text;
ALTER TABLE "settlements" ADD COLUMN IF NOT EXISTS "paid_at" timestamptz;
ALTER TABLE "settlements" ADD COLUMN IF NOT EXISTS "disbursed_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "settlements" ADD COLUMN IF NOT EXISTS "disbursed_idempotency_key" text;
CREATE UNIQUE INDEX IF NOT EXISTS "uk_settlements_disbursed_idempotency" ON "settlements" ("disbursed_idempotency_key") WHERE "disbursed_idempotency_key" IS NOT NULL;

-- 5. Promoter payouts processing audit & idempotency
ALTER TABLE "promoter_payouts" ADD COLUMN IF NOT EXISTS "processed_idempotency_key" text;
ALTER TABLE "promoter_payouts" ADD COLUMN IF NOT EXISTS "processed_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "uk_promoter_payouts_processed_idempotency" ON "promoter_payouts" ("processed_idempotency_key") WHERE "processed_idempotency_key" IS NOT NULL;

-- 6. CMS Featured Events unique constraint (prevent parallel click duplicate slots)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unq_cms_featured_events_event_id'
  ) THEN
    ALTER TABLE "cms_featured_events" ADD CONSTRAINT "unq_cms_featured_events_event_id" UNIQUE ("event_id");
  END IF;
END $$;

-- 7. Broadcast Marketing Campaigns Table
CREATE TABLE IF NOT EXISTS "marketing_campaigns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "type" text NOT NULL DEFAULT 'sms',
  "content" text NOT NULL,
  "target_audience_count" integer NOT NULL DEFAULT 0,
  "credits_cost" integer NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'scheduled',
  "delivered_at" timestamptz,
  "created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_marketing_campaigns_org" ON "marketing_campaigns" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_marketing_campaigns_status" ON "marketing_campaigns" ("status");

-- 8. Scanner Pairing Tokens Table (10-minute temporary single-use staff onboarding)
CREATE TABLE IF NOT EXISTS "scanner_pairing_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "gate_id" uuid REFERENCES "checkin_gates"("id") ON DELETE SET NULL,
  "pairing_code_hash" text NOT NULL UNIQUE,
  "created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "used_by_device_id" uuid REFERENCES "checkin_devices"("id") ON DELETE SET NULL,
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_scanner_pairing_tokens_hash" ON "scanner_pairing_tokens" ("pairing_code_hash");
CREATE INDEX IF NOT EXISTS "idx_scanner_pairing_tokens_org" ON "scanner_pairing_tokens" ("organization_id");

-- 9. Canonical RBAC Permissions and Role Grants
INSERT INTO "permissions" ("id", "key", "description") VALUES
  (gen_random_uuid(), 'organization.kyb.review', 'Review and approve/reject organizer KYB verification'),
  (gen_random_uuid(), 'organization.status.manage', 'Suspend or restore organization accounts'),
  (gen_random_uuid(), 'organization.commission.manage', 'Override platform commission rate for organization'),
  (gen_random_uuid(), 'marketing.credits.grant', 'Grant promotional marketing credits to organization ad wallets'),
  (gen_random_uuid(), 'marketing.campaign.moderate', 'Moderate and flag/approve broadcast marketing campaigns'),
  (gen_random_uuid(), 'promoter.status.manage', 'Freeze or activate promoter network profiles'),
  (gen_random_uuid(), 'promoter.payout.process', 'Authorize and disburse promoter commission payout requests'),
  (gen_random_uuid(), 'settlement.disburse', 'Authorize bank transfer disbursement for approved settlements'),
  (gen_random_uuid(), 'event.review', 'Review, approve, or reject submitted events')
ON CONFLICT ("key") DO NOTHING;

-- Grant all permissions to super_admin
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r.name = 'super_admin' AND r.organization_type IS NULL
ON CONFLICT DO NOTHING;

-- Grant to finance_admin
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r.name = 'finance_admin' AND r.organization_type IS NULL
  AND p.key IN ('finance.view', 'settlement.view', 'settlement.approve', 'settlement.disburse', 'promoter.payout.process', 'marketing.credits.grant')
ON CONFLICT DO NOTHING;

-- Grant to operations_admin
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r.name = 'operations_admin' AND r.organization_type IS NULL
  AND p.key IN ('organization.kyb.review', 'organization.status.manage', 'promoter.status.manage', 'event.approve', 'event.reject', 'event.review', 'event.feature', 'marketing.campaign.moderate')
ON CONFLICT DO NOTHING;

-- Grant to content_admin
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r.name = 'content_admin' AND r.organization_type IS NULL
  AND p.key IN ('cms.manage', 'event.feature', 'event.review')
ON CONFLICT DO NOTHING;
