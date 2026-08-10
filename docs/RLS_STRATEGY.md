# Row Level Security (RLS) Strategy

**Project:** Event Ecosystem
**Version:** 1.0

---

## 1. Defense-in-Depth Model

We use three authorization layers:

```
Layer 1: Supabase RLS
         Prevents direct database access without proper credentials.
         Last line of defense if backend authorization fails.

Layer 2: Backend RBAC
         Primary authorization. Every protected API operation
         verifies permissions before executing queries.

Layer 3: Resource/Organization Scope
         Even authorized users can only access resources they own
         or are members of.
```

**RLS does NOT replace backend authorization.**
**Backend authorization does NOT replace RLS.**

---

## 2. Who Accesses the Database Directly?

| Actor | Access Method | Uses RLS? |
|-------|--------------|-----------|
| Node.js Backend (service role) | Drizzle ORM via `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ Bypasses RLS — backend must enforce authorization |
| Supabase Auth trigger (if used) | Internal Supabase function | Uses RLS |
| Direct Supabase client in frontend | ❌ NEVER — frontend goes through backend API | N/A |
| Supabase Studio (admin) | Manual admin access | Bypasses RLS — audit trail required |

**The backend uses the service role key, which bypasses RLS.** This means the backend is responsible for ALL authorization decisions. RLS serves as a safety net for any access that bypasses the backend.

---

## 3. RLS Policies by Table

### Tables with RLS Enabled (Defensive)

These tables have RLS enabled as a safety net. Direct client access is not intended but must be safe if it occurs.

| Table | Policy Intent |
|-------|--------------|
| `users` | User can read own record only |
| `notifications` | User can read own notifications only |
| `notification_preferences` | User can read/write own preferences only |
| `device_tokens` | User can read/write own device tokens only |
| `orders` | User can read own orders only |
| `tickets` | User can read own tickets only |
| `order_items` | User can read items of own orders only |

### Tables with RLS Enabled (Business Logic)

| Table | Policy Intent |
|-------|--------------|
| `events` | Authenticated users can read `published` or `live` events |
| `venues` | Authenticated users can read `active` venues |
| `event_categories` | Anyone can read `active` categories |
| `ticket_types` | Authenticated users can read active ticket types for published events |

### Tables Blocked from Direct Client Access

These tables must never be directly accessible from client code. Backend only.

| Table | Reason |
|-------|--------|
| `payment_transactions` | Financial data — backend only |
| `payment_events` | Webhook data — backend only |
| `refunds` | Financial data — backend only |
| `ledger_accounts` | Financial data — backend only |
| `ledger_entries` | Financial data — backend only |
| `settlements` | Financial data — backend only |
| `settlement_items` | Financial data — backend only |
| `commission_entries` | Financial data — backend only |
| `audit_logs` | Security — backend only |
| `moderation_cases` | Security — backend only |
| `risk_flags` | Security — backend only |
| `checkin_devices` | Operational — backend only |
| `checkins` | Operational — backend only |
| `organization_members` | RBAC — backend only |
| `roles` | RBAC — backend only |
| `permissions` | RBAC — backend only |
| `role_permissions` | RBAC — backend only |

### Default Policy

For all tables not explicitly listed:

```sql
-- RLS is enabled; no SELECT/INSERT/UPDATE/DELETE is allowed
-- without matching a policy.
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
-- Deny all unless a policy grants access
```

The service role key bypasses all policies (backend use only).

---

## 4. RLS Policy Examples

```sql
-- Users can read only their own record
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can read only published/live events
CREATE POLICY "events_select_published"
  ON events FOR SELECT
  USING (status IN ('published', 'live'));

-- Users can read only their own notifications
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Block all direct client access to financial tables
-- (no policy = no access for non-service-role callers)
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
-- No policies defined = effectively blocked for anon/authenticated roles
```

---

## 5. Organization-Scoped Access

Organization membership is enforced at the backend level, not at the RLS level.

The backend pattern:

```typescript
// Before any org-scoped operation:
const membership = await db.query.organizationMembers.findFirst({
  where: and(
    eq(organizationMembers.userId, currentUser.id),
    eq(organizationMembers.organizationId, targetOrgId),
    eq(organizationMembers.status, 'active'),
  ),
});

if (!membership) {
  throw new ForbiddenException('Not a member of this organization');
}

// Then check specific permission:
const hasPermission = await rbacService.check(
  membership.roleId,
  'event.publish',
);
```

---

## 6. Implementation Status (Task 0.1)

| Item | Status |
|------|--------|
| RLS strategy documented | ✅ (this document) |
| RLS SQL policies written | ⏳ Phase 1 — when auth is implemented |
| Backend RBAC guard scaffolded | ✅ (Task 0.1) |
| Organization scope check scaffolded | ⏳ Phase 1 |
| Financial table block policies | ⏳ Phase 1 |

RLS policies are applied in migration files alongside schema changes.
