-- =============================================================================
-- Migration: 0010_auth_canonical_identity
-- Description: Canonical user identity schema, verification statuses, consent,
--              terms records, and OTP verification storage.
-- Task: Complete Authentication System — Phase 2 Architecture
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extend users table with canonical identity fields
-- ---------------------------------------------------------------------------
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "phone_verified" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "email_verified" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "dob" text,
  ADD COLUMN IF NOT EXISTS "whatsapp_consent" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "whatsapp_consent_updated_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "terms_accepted_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "terms_version" text DEFAULT '1.0';

-- Enforce uniqueness for registered mobile numbers (partial index allows nulls)
CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_unique_phone"
  ON "users" ("phone")
  WHERE "phone" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_users_phone_verified"
  ON "users" ("phone_verified");

CREATE INDEX IF NOT EXISTS "idx_users_email_verified"
  ON "users" ("email_verified");

-- ---------------------------------------------------------------------------
-- 2. OTP Verifications Table
-- ---------------------------------------------------------------------------
-- Stores hashed verification codes (SHA-256) for signup, password recovery,
-- and contact changes. Plaintext OTPs are NEVER stored.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "otp_verifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "destination" text NOT NULL,
  "destination_type" text NOT NULL, -- 'phone' | 'email'
  "purpose" text NOT NULL,          -- 'signup' | 'forgot_password' | 'phone_change'
  "otp_hash" text NOT NULL,
  "token_hash" text,
  "attempts" integer NOT NULL DEFAULT 0,
  "max_attempts" integer NOT NULL DEFAULT 5,
  "expires_at" timestamptz NOT NULL,
  "verified_at" timestamptz,
  "consumed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_otp_verifications_dest_purpose"
  ON "otp_verifications" ("destination", "purpose", "expires_at");

CREATE INDEX IF NOT EXISTS "idx_otp_verifications_token_hash"
  ON "otp_verifications" ("token_hash");

-- ---------------------------------------------------------------------------
-- 3. RLS for otp_verifications
-- ---------------------------------------------------------------------------
-- OTP records are backend-only. No direct client access allowed.
-- ---------------------------------------------------------------------------
ALTER TABLE "otp_verifications" ENABLE ROW LEVEL SECURITY;
