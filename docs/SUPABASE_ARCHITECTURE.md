# Supabase Architecture

**Project:** Event Ecosystem
**Version:** 1.0

---

## 1. What Supabase Provides

We use Supabase for three infrastructure components:

```
┌─────────────────────────────────────────────┐
│                  Supabase                   │
│                                             │
│  ┌─────────────┐  ┌─────┐  ┌─────────────┐ │
│  │ PostgreSQL  │  │Auth │  │   Storage   │ │
│  │  Database   │  │     │  │   (Media)   │ │
│  └─────────────┘  └─────┘  └─────────────┘ │
└─────────────────────────────────────────────┘
```

**Supabase is NOT:**
- The application logic layer
- The authorization system (we build RBAC on top)
- The queue or caching layer (Redis handles this)
- A replacement for our Node.js backend

---

## 2. Architecture Diagram

```
Consumer Web ─────────────────────────────────┐
Consumer Mobile (Flutter) ────────────────────┤
Organizer Web ────────────────────────────────┤──► Supabase Auth (login/logout/OAuth)
Venue Web ────────────────────────────────────┤    (SUPABASE_ANON_KEY only)
Promoter Web ─────────────────────────────────┤
Scanner Mobile (Flutter) ─────────────────────┤
Admin Web ────────────────────────────────────┘
         │
         │  All authenticated API requests (JWT Bearer token)
         ▼
    ┌──────────────────────────────────────────────┐
    │         Node.js / NestJS Backend API         │
    │                                              │
    │  1. Verify Supabase JWT                     │
    │  2. Load application user + roles           │
    │  3. RBAC authorization                      │
    │  4. Business logic                          │
    │  5. Database operations (Drizzle ORM)       │
    └──────────────────────────────────────────────┘
         │                           │
         │  SUPABASE_SERVICE_ROLE_KEY│
         ▼                           ▼
    Supabase PostgreSQL          Supabase Storage
    (via Drizzle ORM /           (signed upload URLs,
     direct SQL)                  media serving)
```

---

## 3. Supabase Auth Integration

### How Authentication Works

1. Client (web/mobile) signs in via Supabase Auth SDK using the **anon key**
2. Supabase issues a signed JWT containing `sub` (user's Supabase Auth UUID)
3. Client sends the JWT as `Authorization: Bearer <token>` on every backend API request
4. Backend verifies the JWT using Supabase's public key (JWKS endpoint)
5. Backend loads the application user record from `users` table using the `sub` claim
6. Backend enforces RBAC based on `organization_members → roles → permissions`

### Auth User ↔ Application User Mapping

```
Supabase Auth (auth.users)
       │ sub (UUID)
       ▼
application users table
       │ id (same UUID or mapped)
       ├── organization_members
       │    ├── role_id → roles → role_permissions → permissions
       │    └── organization_id → organizations
       ├── orders
       ├── tickets
       └── notification_preferences
```

**Implementation note:** On first successful authentication, the backend creates an application `users` record if one does not exist. The `users.id` uses the Supabase Auth `sub` UUID for direct mapping.

### What the Backend Does NOT Do

- Does NOT store passwords
- Does NOT hash passwords
- Does NOT manage session tokens
- Does NOT implement OAuth flows
- All authentication identity is owned by Supabase Auth

### What the Backend DOES Do

- Verifies JWT authenticity and expiry
- Loads application roles and permissions
- Enforces authorization (RBAC + resource scope)
- Creates/syncs the application user on first login
- Manages organization memberships and role assignments

---

## 4. Supabase Auth Configuration Required

In your Supabase project dashboard, configure:

1. **Email auth** — enabled
2. **Google OAuth** — configure OAuth app credentials
3. **Apple OAuth** — configure Apple Sign-In credentials
4. **JWT expiry** — set to appropriate value (e.g., 3600s for access token)
5. **Redirect URLs** — add production and development URLs
6. **Email templates** — customize for brand

---

## 5. Supabase Storage Architecture

Used for:

| Bucket | Contents | Access |
|--------|----------|--------|
| `event-images` | Event hero images and gallery | Public read, authenticated write |
| `venue-images` | Venue photos | Public read, authenticated write |
| `user-avatars` | User profile pictures | Public read, authenticated write |
| `exports` | Financial exports, reports | Private — signed URLs only |

**Upload flow:**
1. Client requests a signed upload URL from backend
2. Backend verifies authorization (user has permission to upload for this entity)
3. Backend generates a signed Supabase Storage URL using the service role key
4. Client uploads directly to Supabase Storage using the signed URL
5. Client reports success; backend records the storage reference

**The service role key is used server-side only to generate signed URLs. It is never sent to the client.**

---

## 6. Key Security Boundaries

| Component | Allowed Keys | NOT Allowed |
|-----------|-------------|-------------|
| Consumer Web (Next.js) | `SUPABASE_ANON_KEY` | Service role key |
| Organizer/Venue/Promoter/Admin Web | `SUPABASE_ANON_KEY` | Service role key |
| Consumer Flutter App | `SUPABASE_ANON_KEY` | Service role key |
| Scanner Flutter App | `SUPABASE_ANON_KEY` | Service role key |
| Node.js Backend | `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_ANON_KEY` | — |

---

## 7. Supabase Realtime

Not used in Phase 0.1. Realtime subscriptions may be considered in later phases for:
- Admin dashboard live metrics
- Organizer live attendance counts

All Realtime access must also be authorized (RLS applies to Realtime subscriptions).

---

## 8. Local Development Without Supabase

For unit and integration tests that do not require a live Supabase project:
- Use a local PostgreSQL instance (via Docker Compose) as `DATABASE_URL`
- Auth middleware includes a `TEST_AUTH_BYPASS` mode for integration tests only
- Never use bypass mode in production builds

To verify real Supabase connectivity:
```bash
cd backend/api
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL
pnpm db:migrate
# Expected: migrations run successfully
```
