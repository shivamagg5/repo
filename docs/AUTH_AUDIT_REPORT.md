# Complete Authentication System — Comprehensive Audit Report

**Date:** October 2026  
**Auditor:** Senior Authentication Engineer & Security Architect  
**Scope:** `backend/api`, `database`, `packages/auth`, `packages/types`, `packages/validation`, `apps/consumer-web`, `apps/consumer-android`

---

## 1. Executive Summary

A comprehensive audit was conducted across the backend services, database migrations, shared packages, consumer web application, and consumer Android mobile app. The existing codebase possesses a solid architectural foundation based on Supabase Auth JWT verification in NestJS and Gotrue client libraries. However, consumer authentication is currently limited to basic email/password registration with several missing production features:

1. **No Mobile OTP verification** for registration, password recovery, or phone change.
2. **No phone-or-email unified sign-in**: Only email is accepted by existing login interfaces.
3. **No Forgot Password flow** on either the consumer website or mobile app.
4. **Missing Profile & Legal Compliance Data** in the database schema (Date of birth, Phone verification status, Email verification status, WhatsApp marketing consent, Terms of service acceptance timestamp & version).
5. **No SMS gateway integration for OTPs**: Although a Twilio SMS adapter exists in `notifications/providers/sms-provider.service.ts`, it is uncoupled from user authentication and OTP state management.

---

## 2. Detailed Findings by Area

### 2.1 Backend Authentication & Session Handling
- **What works:**
  - `AuthMiddleware` verifies Supabase JWTs using the service-role client, fetches application users from `public.users` via `supabase_auth_id`, checks account status (`suspended`, `deleted`), and attaches `AuthContext` to `req.user`.
  - `AuthGuard` and `RbacGuard` correctly enforce token presence and platform permissions.
  - `POST /api/v1/auth/sync` is idempotent and safe; it derives `supabaseAuthId` and `email` strictly from verified JWT claims.
  - `AuditService` logs security events to `audit_logs` without leaking sensitive secrets.
- **What is missing/broken:**
  - `AuthController` only exposes `GET /me`, `POST /sync`, and `POST /logout`.
  - Missing registration orchestration (`POST /auth/signup`) supporting verified mobile OTP + customer details.
  - Missing unified login (`POST /auth/login`) supporting both email and phone numbers with password.
  - Missing OTP lifecycle endpoints (`/auth/otp/send`, `/auth/otp/verify`).
  - Missing password reset endpoints (`/auth/forgot-password/*`).
  - Missing sensitive profile actions (`/auth/phone/change/*`, `/auth/password/change`, `/auth/resend-confirmation-email`).

### 2.2 Database Schema & Row-Level Security (RLS)
- **What works:**
  - `users.supabase_auth_id` links `auth.users.id` to `public.users.id`.
  - RLS policies exist on `users`, allowing authenticated users to read and update only their own profile.
- **What is missing/broken:**
  - `users.phone` is currently nullable and lacks a unique constraint.
  - Missing columns on `users`:
    - `phone_verified` (BOOLEAN DEFAULT false)
    - `email_verified` (BOOLEAN DEFAULT false)
    - `dob` (DATE or TEXT)
    - `whatsapp_consent` (BOOLEAN DEFAULT false)
    - `whatsapp_consent_updated_at` (TIMESTAMPTZ)
    - `terms_accepted_at` (TIMESTAMPTZ)
    - `terms_version` (TEXT)
  - Missing dedicated `otp_verifications` table with hashed tokens, attempt limits, expiration, and rate-limiting audit fields.

### 2.3 Shared Packages (`@platform/auth`, `@platform/types`, `@platform/validation`)
- **What works:**
  - `@platform/auth` wraps `@supabase/supabase-js` using the public anon key.
  - `@platform/types` has `UserProfile`, `User`, `AuthContext`.
  - `@platform/validation` provides foundational schemas (`emailSchema`, `phoneSchema`).
- **What is missing:**
  - `UserProfile` type lacks `phoneVerified`, `emailVerified`, `dob`, `whatsappConsent`, `termsAcceptedAt`.
  - Missing Zod validation schemas for: phone OTP request, OTP verify, multi-step signup, forgot password, phone change, password change.

### 2.4 Consumer Website (`apps/consumer-web`)
- **What works:**
  - Dark-mode responsive UI with branded aesthetics.
  - Next.js `middleware.ts` protecting `/profile`, `/orders`, `/tickets`, `/checkout`.
  - OAuth callback handler (`/auth/callback`).
- **What is missing/broken:**
  - `/auth/register` is a single-step email/password form with no phone input, no OTP verification, and no DOB/WhatsApp/Terms fields.
  - `/auth/login` only accepts an email input; does not support mobile number sign-in.
  - Missing Forgot Password page and flows.
  - Profile page (`/profile`) does not display email verification status, has no "Resend verification email" action, no phone verification badge, and no change password/phone workflows.

### 2.5 Consumer Android App (`apps/consumer-android`)
- **What works:**
  - Native Kotlin + Jetpack Compose + Slack Circuit architecture.
  - App opens to `LoginRoute` as gateway, with an "Explore Events & Passes" guest fallback.
  - Supabase Kotlin SDK (`io.github.jan.supabase.auth`) initialized with anonymous key; tokens shared with Ktor via `AuthTokenProvider`.
  - Profile screen displays account details with logout capability.
- **What is missing/broken:**
  - `LoginScreen` & `LoginPresenter` only provide basic email/password fields in a single tab.
  - No mobile number + country code input, no OTP entry, no customer details flow.
  - No mobile sign-in option.
  - No Forgot Password flow.
  - Profile screen lacks email verification state, phone verification badge, change password, and WhatsApp consent controls.

---

## 3. Security Vulnerabilities & Architectural Hazards
1. **Account Enumeration Timing Leaks:** Without a generic response strategy for forgot-password and login lookups, attackers could determine whether a phone or email is registered.
2. **Direct Client Phone Lookup Hazard:** Clients must never query the database directly to resolve which email belongs to a mobile number. This must be handled securely server-side.
3. **OTP Abuse & Brute Force:** In-memory or client-managed OTPs are dangerous. OTPs must be stored hashed (SHA-256), with strict maximum attempts (5 tries), short expiry (10 minutes), and resend cooldowns (60 seconds).
4. **Phone Identity Hijacking:** Changing a phone number must require OTP verification of the *new* number before updating the database.
5. **Session Invalidation on Password Change:** Changing a password must invalidate existing refresh tokens to prevent session hijacking.

---

## 4. Reusable Assets & Migration Plan
- **Reusable:**
  - `users` table as base; add new columns via migration `0010_auth_canonical_identity.sql`.
  - Supabase Auth as credential & session authority.
  - `AuditService` in `backend/api` for recording auth events.
  - `SmsProviderService` interface in `backend/api` adapted into pluggable `SmsOtpService`.
  - Existing design system tokens and colors on both web and Android.
