# Event Ecosystem — Secret Management Matrix

This document provides an authoritative inventory of all production secrets, consuming services, storage mechanisms, rotation procedures, and emergency revocation workflows.

---

## 1. Production Secrets Inventory

| Secret Name | Consuming Service | Environment Variable | Storage Mechanism | Rotation Schedule | Emergency Revocation Workflow |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **JWT Signing Secret / Private Key** | `backend/api` (`AuthModule`) | `JWT_SECRET` | AWS Secrets Manager / Vault | 90 days | Invalidate active session tokens; deploy updated signing key to backend cluster. |
| **PostgreSQL DB Password** | `backend/api` (`DatabaseService`) | `DATABASE_URL` | AWS Secrets Manager | 90 days | Rotate password in database instance; update connection secret in container environment. |
| **Redis Connection Secret** | `backend/api` (Cache & Rate Limiting) | `REDIS_URL` | Environment Secret | 180 days | Update Redis instance auth password; update application connection string. |
| **Razorpay API Secret** | `backend/api` (`PaymentsModule`) | `RAZORPAY_KEY_SECRET` | AWS Secrets Manager | 180 days | Generate new key pair in Razorpay dashboard; update backend secret; revoke old key. |
| **Razorpay Webhook Secret** | `backend/api` (`PaymentsModule`) | `RAZORPAY_WEBHOOK_SECRET` | AWS Secrets Manager | 180 days | Update webhook secret in Razorpay portal and backend environment simultaneously. |
| **Scanner Signing EC Private Key** | `backend/api` (`ScannerModule`) | `SCANNER_ECDSA_PRIVATE_KEY` | KMS / Vault | 365 days | Deploy new public key version to scanners; activate new key ID in backend key store. |
| **SendGrid Email API Key** | `backend/api` (`NotificationsModule`) | `SENDGRID_API_KEY` | AWS Secrets Manager | 180 days | Revoke API key in SendGrid portal; replace backend secret. |
| **Twilio SMS Auth Token** | `backend/api` (`NotificationsModule`) | `TWILIO_AUTH_TOKEN` | AWS Secrets Manager | 180 days | Regenerate secondary token in Twilio console; update backend; promote to primary. |
| **FCM Push Service Account Key** | `backend/api` (`NotificationsModule`) | `FCM_SERVICE_ACCOUNT_JSON` | KMS / Vault | 365 days | Re-key Google Cloud IAM service account; deploy new JSON key. |
| **Supabase Service Role Key** | `backend/api` (`AuthModule`) | `SUPABASE_SERVICE_ROLE_KEY` | AWS Secrets Manager | 180 days | Regenerate key in Supabase dashboard; update application secrets. |

---

## 2. Security Boundaries & Bundle Exposure Policies

1. **Zero Browser/Mobile Secret Leakage**:
   - Backend secrets (`JWT_SECRET`, `RAZORPAY_KEY_SECRET`, `DATABASE_URL`, `SCANNER_ECDSA_PRIVATE_KEY`) MUST NEVER be included in frontend bundles (`apps/consumer-web`, `apps/organizer-web`, `apps/admin-web`, `apps/promoter-web`) or Flutter mobile builds.
   - Web/mobile applications communicate exclusively with the backend via public REST/GraphQL contracts using user session tokens or signed request headers.

2. **Automated Secret Audit**:
   - Run `pnpm run audit:secrets` in CI/CD pipeline to verify no API keys, private keys, or credentials exist in codebase source files or environment templates.
