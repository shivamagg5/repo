-- =============================================================================
-- Migration 0002: Add Persistent Payment Profiles, Marketing Ledgers, Notes & Promoter Payouts
-- =============================================================================

CREATE TABLE IF NOT EXISTS "payment_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "account_name" text NOT NULL,
  "nickname" text NOT NULL,
  "masked_account_number" text NOT NULL,
  "ifsc" text NOT NULL,
  "pan_card" text NOT NULL,
  "gst_registered" boolean NOT NULL DEFAULT false,
  "gstin" text,
  "business_address" text,
  "city" text,
  "state" text,
  "country" text DEFAULT 'India',
  "status" text NOT NULL DEFAULT 'active',
  "is_default" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_payment_profiles_org" ON "payment_profiles" ("organization_id");

CREATE TABLE IF NOT EXISTS "marketing_credit_ledgers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "transaction_number" text NOT NULL UNIQUE,
  "delta_credits" integer NOT NULL,
  "balance_after" integer NOT NULL,
  "reason" text NOT NULL,
  "idempotency_key" text UNIQUE,
  "metadata_json" text NOT NULL DEFAULT '{}',
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_marketing_ledger_org" ON "marketing_credit_ledgers" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_marketing_ledger_created" ON "marketing_credit_ledgers" ("created_at");

CREATE TABLE IF NOT EXISTS "customer_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "admin_notes" text NOT NULL,
  "updated_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_customer_notes_user" ON "customer_notes" ("user_id");

CREATE TABLE IF NOT EXISTS "promoter_payouts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "promoter_id" uuid NOT NULL REFERENCES "promoter_profiles"("id") ON DELETE CASCADE,
  "amount_minor" bigint NOT NULL,
  "currency" char(3) NOT NULL DEFAULT 'INR',
  "status" text NOT NULL DEFAULT 'pending',
  "payout_method" text NOT NULL DEFAULT 'bank_transfer',
  "destination_reference" text NOT NULL,
  "idempotency_key" text NOT NULL UNIQUE,
  "notes" text,
  "paid_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_promoter_payouts_promoter" ON "promoter_payouts" ("promoter_id");
CREATE INDEX IF NOT EXISTS "idx_promoter_payouts_status" ON "promoter_payouts" ("status");
