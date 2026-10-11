# Complete Authentication System — Architecture & Implementation Plan

**Target Platforms:** Consumer Website (`apps/consumer-web`) & Consumer Android Mobile App (`apps/consumer-android`)  
**Backend:** NestJS API (`backend/api`) & Supabase PostgreSQL  
**Shared Packages:** `@platform/types`, `@platform/validation`, `@platform/auth`, `@platform/api-client`

---

## 1. Canonical Account & Identity Architecture

### 1.1 Source of Truth
- **Identity & Credentials:** Supabase Auth (`auth.users`) remains the secure source of truth for passwords, tokens, and email confirmation timestamps.
- **Application Profile & Metadata:** `public.users` stores application-level profile details, phone verification status, email verification status, date of birth, marketing consents, and terms acceptance records.
- **Relational Bridge:** `public.users.supabase_auth_id` (UUID UNIQUE NOT NULL) maps 1:1 to `auth.users.id`. All foreign keys across the ecosystem reference `public.users.id`.

### 1.2 Database Changes (`0010_auth_canonical_identity.sql`)
1. **Extend `users` table:**
   - `phone_verified` (BOOLEAN NOT NULL DEFAULT false)
   - `email_verified` (BOOLEAN NOT NULL DEFAULT false)
   - `dob` (TEXT) — stored in standard ISO format `YYYY-MM-DD`
   - `whatsapp_consent` (BOOLEAN NOT NULL DEFAULT false)
   - `whatsapp_consent_updated_at` (TIMESTAMPTZ)
   - `terms_accepted_at` (TIMESTAMPTZ)
   - `terms_version` (TEXT DEFAULT '1.0')
   - Unique constraint: `CREATE UNIQUE INDEX idx_users_unique_phone ON users(phone) WHERE phone IS NOT NULL;`
2. **New `otp_verifications` table:**
   - `id` (UUID PRIMARY KEY DEFAULT gen_random_uuid())
   - `destination` (TEXT NOT NULL) — E.164 phone or lowercase email
   - `destination_type` (TEXT NOT NULL) — 'phone' | 'email'
   - `purpose` (TEXT NOT NULL) — 'signup' | 'forgot_password' | 'phone_change'
   - `otp_hash` (TEXT NOT NULL) — SHA-256 of 6-digit OTP
   - `token_hash` (TEXT) — SHA-256 of verification token
   - `attempts` (INTEGER NOT NULL DEFAULT 0)
   - `max_attempts` (INTEGER NOT NULL DEFAULT 5)
   - `expires_at` (TIMESTAMPTZ NOT NULL)
   - `verified_at` (TIMESTAMPTZ)
   - `consumed_at` (TIMESTAMPTZ)
   - `created_at` (TIMESTAMPTZ NOT NULL DEFAULT now())
   - Indexes on `(destination, purpose, expires_at)` and `token_hash`.

---

## 2. Pluggable SMS OTP Gateway Architecture

1. **Service Interface (`ISmsOtpProvider`):**
   - Independent from UI and core auth logic.
   - Configurable via environment variables:
     - `SMS_PROVIDER`: 'twilio' | 'msg91' | 'console' (for local staging)
     - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
     - `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`
2. **Production Safeguards:**
   - No hardcoded universal OTPs in live paths.
   - If unconfigured in production, throws a clear `SMS_PROVIDER_NOT_CONFIGURED` exception.
   - 60-second cooldown per destination.
   - Max 5 verification attempts.
   - 10-minute validity.

---

## 3. End-to-End Authentication Flows

### 3.1 Signup Flow
1. **Step 1:** User submits normalized mobile number (E.164) and email. Uniqueness is checked against existing accounts.
2. **Step 2:** Mobile OTP is dispatched. User enters 6-digit OTP. Backend verifies OTP and issues a short-lived, signed verification token.
3. **Step 3:** Customer enters Name, DOB (must be at least 18 years old), Password, optional WhatsApp consent, and required Terms agreement.
4. **Step 4:** Account creation creates the user in Supabase Auth and `public.users` with `phone_verified: true`.
5. **Step 5:** Supabase Auth triggers an email confirmation link.

### 3.2 Unified Sign-In (Email OR Mobile)
- Accepts identifier (email or phone) and password.
- Server-side resolver normalizes phone numbers and securely authenticates with Supabase Auth.
- Never exposes internal account IDs or enumeration signals.

### 3.3 Forgot Password Flow
1. User enters registered email or mobile number.
2. Backend identifies account and dispatches recovery OTP to the verified destination.
3. User verifies recovery OTP and receives a single-use password reset token.
4. User sets new password. Sessions are refreshed.

### 3.4 Profile Management & Status Sync
- Profile displays authoritative `email_verified` and `phone_verified` statuses.
- "Resend verification email" action with rate limiting.
- Change mobile number flow protected by OTP to the new number.
- Change password flow requiring current password verification.
- WhatsApp updates consent toggle with timestamp tracking.
