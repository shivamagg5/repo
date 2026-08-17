# PHASE 14 — Master UI/UX + Integration Audit

**Audit Date:** 2026-08-13  
**Backend Status:** Phases 0–13 complete (186/186 tests, typecheck clean, build clean)  
**Purpose:** Comprehensive audit of all 7 applications before implementation begins. Do NOT start implementation without reviewing this document.

---

## A. Application Scorecard

| App | Framework | Auth | Core UI | API Integration | Checkout/Payment | Missing Screens | Overall |
|:----|:----------|:-----|:--------|:----------------|:----------------|:----------------|:--------|
| **consumer-web** | Next.js 14 | MISSING | PARTIAL | PARTIAL | MISSING | Login, Tickets, Profile, Favorites, Checkout, Orders | PARTIAL |
| **consumer-mobile** | Flutter | MISSING | PLACEHOLDER | MISSING | MISSING | Everything | PLACEHOLDER |
| **organizer-web** | Next.js 14 | MISSING | PARTIAL | MOCK DATA | N/A | Analytics, Finance, Settings, Guest List | PARTIAL |
| **venue-web** | Next.js 14 | MISSING | PARTIAL | MOCK DATA | N/A | Profile editor, Staff, Finance, Event request flow | PARTIAL |
| **promoter-web** | Next.js 14 | MISSING | PARTIAL | MOCK DATA | N/A | Analytics, Earnings detail, Payout settings | PARTIAL |
| **scanner-mobile** | Flutter | MISSING | PARTIAL | SIMULATED | N/A | Login, Device reg, Gate selection, Real QR camera | PARTIAL |
| **admin-web** | Next.js 14 | MISSING | PLACEHOLDER | MISSING | N/A | Everything | PLACEHOLDER |

> CRITICAL: Authentication is MISSING in every single application. No app has login, logout, session refresh, or protected route handling wired to the real backend. This is the single most critical integration gap.

---

## B. Route Inventory

### 1. Consumer Web (apps/consumer-web)

| Route | File | Status | Notes |
|:------|:-----|:-------|:------|
| `/` | `src/app/page.tsx` | PARTIAL | Fetches live API (events, venues, categories). Hero search works. Auth-gated sections (Favorites, My Tickets) missing entirely. |
| `/events` | `src/app/events/page.tsx` | PARTIAL | Cursor-paginated feed with category/city/date/sort filters. No auth. No favorites toggle. |
| `/events/[slug]` | `src/app/events/[slug]/page.tsx` | PARTIAL | SSR + JSON-LD. Renders event detail fully. Ticket purchase CTA is a DISABLED PLACEHOLDER — no actual checkout flow. |
| `/categories/[slug]` | `src/app/categories/[slug]/` | MISSING | Directory exists but no page.tsx inside [slug]. Route 404s. |
| `/venues` | `src/app/venues/page.tsx` | PARTIAL | Venue listing page exists (small). |
| `/venues/[slug]` | — | MISSING | No page.tsx in venue slug dir. Venue detail 404s. |
| `/search` | `src/app/search/page.tsx` | PARTIAL | Search page with filter controls exists. |
| `/auth/login` | — | MISSING | No login page. |
| `/auth/register` | — | MISSING | No signup page. |
| `/auth/forgot-password` | — | MISSING | No password reset page. |
| `/profile` | — | MISSING | No user profile page. |
| `/profile/settings` | — | MISSING | No settings page. |
| `/tickets` | — | MISSING | No My Tickets page. |
| `/tickets/[id]` | — | MISSING | No ticket detail or QR display. |
| `/orders` | — | MISSING | No order history page. |
| `/orders/[id]` | — | MISSING | No order detail page. |
| `/checkout` | — | MISSING | No checkout flow. |
| `/checkout/confirmation` | — | MISSING | No order confirmation page. |
| `/favorites` | — | MISSING | No favorites page. |
| `/notifications` | — | MISSING | No notification inbox. |

**Consumer Web Components:**

| Component | Status | Issues |
|:----------|:-------|:-------|
| `Navbar.tsx` | PARTIAL | No auth state (no login button, no user avatar, no mobile hamburger menu) |
| `Footer.tsx` | PARTIAL | Static links only. No dynamic content. |
| `EventCard.tsx` | PARTIAL | Renders event. No favorites button. No sold-out badge logic. |
| `VenueCard.tsx` | PARTIAL | Renders venue. No clickable detail link to venue page. |
| Auth provider/context | MISSING | No auth provider, no session context, no query client. |

---

### 2. Consumer Mobile (apps/consumer-mobile)

| Screen | Status | Notes |
|:-------|:-------|:------|
| App shell / navigation | PLACEHOLDER | main.dart renders a _PlaceholderScreen saying "Full app implemented in Task 3.x". No bottom nav, no routing. |
| Login / Register | MISSING | No auth screens exist in any screen file. |
| Home / Discovery | MISSING | No discovery feed screen. |
| Event Detail | MISSING | No event detail screen. |
| Ticket Wallet | MISSING | No ticket list or QR display. |
| Orders | MISSING | No order history. |
| Profile | MISSING | No profile screen. |
| Favorites | MISSING | No favorites screen. |
| Push Notifications | MISSING | No FCM/APNs integration. |
| Offline ticket access | MISSING | No local ticket cache. |
| Deep links | MISSING | No deep link routing setup. |
| Payment/Checkout | MISSING | No checkout flow or Razorpay SDK. |

**Flutter Architecture Status:**

| Element | Status | Notes |
|:--------|:-------|:------|
| Supabase init | PARTIAL | main.dart initializes Supabase if env vars are set. No auth flow built on top. |
| Auth service | PARTIAL | services/auth_service.dart exists (5KB) with login/signup/logout logic. Unused by any screen. |
| API service | PARTIAL | services/api_service.dart (2.5KB) — basic HTTP client. Unused by any screen. |
| Models | MISSING | lib/models/ is empty. No domain model classes. |
| State management | MISSING | No Riverpod/Bloc/Provider setup. |
| Navigation | MISSING | No go_router or auto_route setup. |
| Design system | MISSING | Only default ThemeData.fromSeed (purple seed). No custom typography or component library. |

---

### 3. Organizer Web (apps/organizer-web)

| Route | Status | Notes |
|:------|:-------|:------|
| `/` (Dashboard Overview) | PARTIAL | KPI stat cards + event feed + order stream. ALL data is hardcoded mock data. No API call made. |
| `/events` | PARTIAL | Event list with status badges and sales progress. All hardcoded mock data. |
| `/events/new` | PARTIAL | 6-step wizard UI exists. handleSubmit uses setTimeout fake — no actual API call. |
| `/events/[id]` | PARTIAL | Event command center exists. Likely mock data. |
| `/orders` | PARTIAL | Orders page exists. Mock data. |
| `/promoters` | PARTIAL | Promoters page exists. Mock data. |
| `/team` | PARTIAL | Team management page exists. Mock data. |
| `/analytics` | MISSING | No analytics route. Required by spec. |
| `/finance` | MISSING | No finance/settlements route. Required by spec. |
| `/settings` | MISSING | No settings or org profile page. |
| `/notifications` | MISSING | No notification inbox. |
| Auth (login/logout) | MISSING | No auth guard on any route. middleware.ts exists but no auth enforcement. |

---

### 4. Venue Web (apps/venue-web)

| Route | Status | Notes |
|:------|:-------|:------|
| `/` (Dashboard) | PARTIAL | Summary cards + upcoming events list. All hardcoded mock data. |
| `/calendar` | PARTIAL | Calendar page exists. Likely a basic placeholder. |
| `/events` | PARTIAL | Events list exists. Mock. |
| `/profile` | PARTIAL | Profile page exists. |
| `/staff` | PARTIAL | Staff page exists. |
| `/finance` | MISSING | No finance/revenue/settlement route. |
| `/notifications` | MISSING | No notification page. |
| `/settings` | MISSING | No settings page. |
| Auth | MISSING | No login, no session guard. |
| Event request accept/reject | MISSING | No UI for accepting/rejecting organizer booking requests. |

---

### 5. Promoter Web (apps/promoter-web)

| Route | Status | Notes |
|:------|:-------|:------|
| `/` (Overview) | PARTIAL | KPI cards + active campaigns + attributed sales. All hardcoded mock data. Referral link copy works. |
| `/campaigns` | PARTIAL | Campaigns list page exists. |
| `/campaigns/[id]` | PARTIAL | Campaign detail exists. |
| `/analytics` | PARTIAL | Analytics page exists. Likely mock. |
| `/earnings` | PARTIAL | Earnings page exists. Likely mock. |
| `/profile` | PARTIAL | Profile page exists. |
| Auth | MISSING | No login, no session guard. |
| Payout/bank settings | MISSING | No payout destination configuration screen. |
| Notification inbox | MISSING | Missing. |

---

### 6. Scanner Mobile (apps/scanner-mobile)

| Screen | Status | Notes |
|:-------|:-------|:------|
| Login / Staff auth | MISSING | No login screen. App goes directly to ScanScreen. |
| Device registration | MISSING | No device registration flow in UI. ScannerApiService.registerDevice() exists but never called. |
| Gate/Event selection | MISSING | ScanScreen has hardcoded _assignedEventId, _assignedGateId, _assignedDeviceId. No event selection flow. |
| Authorization package download | MISSING | ScannerApiService.getEventAuthPackage() exists but never called from UI. |
| Scanner screen (QR) | PARTIAL | ScanScreen exists with simulated scan states. Uses button simulation — NO real camera or QR integration. |
| Online scan validation | MISSING | ScannerApiService.scanTicketOnline() exists but never called from UI. |
| Offline validation (crypto) | PARTIAL | CryptoService and OfflineQueueService exist. Neither wired to camera scan events. |
| Offline queue + sync | PARTIAL | OfflineQueueService and syncOfflineScans() exist but not triggered from UI. |
| Manual attendee lookup | BROKEN | Button exists in UI but onPressed: () {} — completely unimplemented. |
| Manual check-in | MISSING | API service method exists, no UI. |
| Sound / haptic feedback | MISSING | No HapticFeedback or audio playback on scan result. |
| Device revocation UX | MISSING | No UI to handle device revocation mid-session. |
| Gate attendance count | PARTIAL | Valid scan count shown in UI (_validCount). Hardcoded starting value (142). |

**Critical Scanner Packages Missing from pubspec.yaml:**
- `mobile_scanner` or `qr_code_scanner` — required for camera QR decoding
- `flutter_secure_storage` — required for auth tokens and key material
- `connectivity_plus` — required for online/offline detection
- `just_audio` or `audioplayers` — required for scan sound feedback

---

### 7. Admin Web (apps/admin-web)

| Route | Status | Notes |
|:------|:-------|:------|
| `/` (Dashboard) | PLACEHOLDER | Renders `<h1>Admin Dashboard</h1><p>Coming in Task 8.1.</p>`. Nothing implemented. |
| `/users` | MISSING | Not created. |
| `/events` (moderation) | MISSING | Not created. |
| `/orders` | MISSING | Not created. |
| `/refunds` | MISSING | Not created. |
| `/audit` | MISSING | Not created. |
| `/finance` | MISSING | Not created. |
| `/settlements` | MISSING | Not created. |
| `/cms` | MISSING | Not created. |
| `/notifications` | MISSING | Not created. |
| `/analytics` | MISSING | Not created. |
| `/health` | MISSING | Not created. |
| `/scanner-devices` | MISSING | Not created. |
| Auth (login/MFA) | MISSING | No login, no MFA enforcement. |

> CAUTION: The admin-web app is a pure placeholder. The backend admin domain (Phase 9) is fully implemented with a complete AdminModule. No frontend exists for it whatsoever.

---

## C. Screen Inventory Summary

| App | Screens Present | Screens Required | Gap Count |
|:----|:----------------|:-----------------|:----------|
| consumer-web | 5 | 20 | 15 missing |
| consumer-mobile | 0 (placeholder) | 15 | 15 missing |
| organizer-web | 7 | 14 | 7 missing |
| venue-web | 5 | 10 | 5 missing |
| promoter-web | 6 | 9 | 3 missing |
| scanner-mobile | 1 (partial/simulated) | 12 | 11 missing or broken |
| admin-web | 0 (placeholder) | 15 | 15 missing |
| **Total** | **24 partial** | **95** | **71 missing/broken** |

---

## D. API Integration Matrix

### Consumer Web

| Feature | Frontend | Backend Endpoint | Status |
|:--------|:---------|:-----------------|:-------|
| Events feed | `apiClient.getPublicEventsFeed()` | `GET /public/events` | WIRED |
| Event detail | `fetch(/public/events/:slug)` | `GET /public/events/:slug` | WIRED |
| Venues listing | `apiClient.getPublicVenues()` | `GET /public/venues` | WIRED |
| Categories | `apiClient.getPublicCategories()` | `GET /public/categories` | WIRED |
| Search | `getPublicEventsFeed()` with `?q=` | `GET /public/events?q=` | WIRED |
| Login | — | `POST /auth/login` | MISSING |
| Register | — | `POST /auth/register` | MISSING |
| Session refresh | — | `POST /auth/refresh` | MISSING |
| My Tickets | — | `GET /tickets/my` | MISSING |
| Ticket detail + QR | — | `GET /tickets/:id` | MISSING |
| Order history | — | `GET /orders/my` | MISSING |
| Create checkout | — | `POST /checkout` | MISSING |
| Payment initiation | — | `POST /payments/initiate` | MISSING |
| Favorites toggle | — | `POST/DELETE /favorites/:eventId` | MISSING |
| Notification inbox | — | `GET /notifications` | MISSING |
| Venue detail | — | `GET /public/venues/:slug` | MISSING (page 404s) |

### Organizer / Venue / Promoter Web

All dashboard data is hardcoded mock objects. Zero API calls are made to the backend from these three apps.

| App | Mocked Feature | Real Backend Endpoint |
|:----|:---------------|:----------------------|
| organizer-web | Dashboard overview | `GET /organizer/overview` |
| organizer-web | Events list | `GET /organizer/events` |
| organizer-web | Create event (fake setTimeout) | `POST /events` |
| organizer-web | Orders list | `GET /organizer/orders` |
| organizer-web | Team members | `GET /organizations/:id/members` |
| venue-web | Venue info | `GET /venues/:id` |
| venue-web | Calendar events | `GET /venues/:id/events` |
| promoter-web | Campaign overview | `GET /promoters/me/campaigns` |
| promoter-web | Earnings | `GET /promoters/me/commissions` |

### Scanner Mobile

| Feature | Service Method | Backend Endpoint | Called From UI? |
|:--------|:---------------|:-----------------|:----------------|
| Device registration | `registerDevice()` | `POST /scanner/register` | No |
| Auth package download | `getEventAuthPackage()` | `GET /scanner/events/:id/package` | No |
| Online scan | `scanTicketOnline()` | `POST /scanner/scan` | No |
| Offline sync | `syncOfflineScans()` | `POST /scanner/sync` | No |
| Attendee search | `searchAttendees()` | `GET /scanner/attendees` | No |
| Manual check-in | `manualCheckin()` | `POST /scanner/manual-checkin` | No |

> The scanner mobile has a correctly-shaped API service layer that exactly matches the backend endpoints. None of it is connected to the UI.

---

## E. Missing Functionality (Prioritized)

### P0 — Revenue/Operations Blocking

1. **Authentication UI** — Every app needs login/register/logout pages wired to real backend
2. **Session/auth context** — Shared providers + hooks making auth state available to all protected screens
3. **Consumer checkout flow** — Ticket purchase CTA is disabled. Core revenue flow doesn't exist.
4. **Consumer ticket wallet** — My Tickets + QR display + offline access
5. **Admin web** — Complete build from scratch

### P1 — Core Product

6. **Consumer mobile app** — Entire Flutter app is a placeholder screen
7. **Scanner — real camera + API wiring** — QR scanning is simulated buttons; no real camera
8. **Organizer dashboard → real API** — All data mocked; event creation is fake
9. **Venue + Promoter web → real API** — All hardcoded
10. **Analytics instrumentation** — Zero events fired from any frontend

### P2 — Feature Parity

11. Consumer web favorites (toggle + page)
12. Organizer analytics page
13. Organizer finance/settlements page
14. Consumer profile + settings
15. Notification inbox (consumer + organizer)
16. Categories page (currently 404)
17. Venue detail page (currently 404)
18. Promoter payout settings

### P3 — Polish

19. Mobile hamburger menu (consumer navbar)
20. Venue calendar interactive component
21. Scanner sound/haptics
22. Deep links in consumer mobile
23. Push notification handling in consumer mobile

---

## F. Design System Audit

### packages/design-tokens — WELL-DEFINED

- `tokens.css`: CSS custom properties for color, spacing, radius, shadow, typography
- `index.ts`: TypeScript constants mirroring CSS tokens
- Core tokens: `--color-background`, `--color-surface`, `--color-brand`, `--color-border`, `--shadow-brand`, typography scale

### packages/ui — BUILT BUT ENTIRELY UNUSED

| Component | Built | Used By Any App |
|:----------|:------|:----------------|
| `Button.tsx` | Yes | None — all apps use inline Tailwind buttons |
| `Input.tsx` | Yes | None — all apps use inline Tailwind inputs |
| `Card.tsx` | Yes | None |
| `Badge.tsx` | Yes | None |
| `Skeleton.tsx` | Yes | None |
| `EmptyState.tsx` | Yes | None |
| `Spinner.tsx` | Yes | None |
| Modal | MISSING | Required by all apps |
| Toast / Notification | MISSING | Required for success/error feedback |
| Table | MISSING | Required by organizer, venue, admin |
| Tabs | MISSING | Required by dashboards |
| DatePicker | MISSING | Required by event creation wizard |
| Chart / Graph | MISSING | Required by analytics screens |
| Pagination | MISSING | Required by orders, tickets, admin |

**Every app has built its own ad-hoc inline Tailwind components instead of using the shared library.**

### Design Inconsistencies Between Apps

| Issue | Consumer Web | Dashboard Apps |
|:------|:-------------|:---------------|
| CSS framework | Tailwind + CSS custom props | Tailwind + less CSS custom props |
| Design language | `glass-surface`, dark purple gradients | `glass-panel`, slate-800 borders |
| Button patterns | `bg-gradient-to-r from-purple-600 to-indigo-600` | Same gradient, different padding/radius conventions |
| Layout component | Navbar + Footer | DashboardLayout / VenueLayout / PromoterLayout (3 separate unshared layouts) |
| Component naming | All unique to consumer-web | All unique to each dashboard app |

---

## G. Authentication Gaps

| App | Login UI | Secure token storage | Auth headers injected | Protected routes | Token refresh | Logout |
|:----|:---------|:---------------------|:----------------------|:-----------------|:--------------|:-------|
| consumer-web | MISSING | MISSING | Not injected | No guards | MISSING | MISSING |
| consumer-mobile | auth_service.dart exists (unwired) | No flutter_secure_storage | Not injected | No guards | MISSING | MISSING |
| organizer-web | MISSING | MISSING | Not injected | middleware.ts exists but empty | MISSING | MISSING |
| venue-web | MISSING | MISSING | Not injected | Same | MISSING | MISSING |
| promoter-web | MISSING | MISSING | Not injected | Same | MISSING | MISSING |
| scanner-mobile | MISSING | MISSING | Not injected | No guards | MISSING | MISSING |
| admin-web | MISSING | MISSING | Not injected | No guards | MISSING | MISSING |

**Architecture requirement:**
- Backend issues Supabase JWTs via `POST /auth/login`
- All API calls must include `Authorization: Bearer <jwt>`
- Session refresh via Supabase auto-refresh or `POST /auth/refresh`
- Web: httpOnly cookie or memory storage (not localStorage)
- Mobile: `flutter_secure_storage`

---

## H. Payment / Checkout Gaps

**Required checkout flow (none of this exists in any frontend):**

```
Event detail page → ticket selection (tier + quantity)
    → POST /checkout/reserve (creates hold + checkout session)
    → Timer showing reservation expiry (10 minutes)
    → POST /payments/initiate (creates payment intent)
    → Razorpay SDK (opens payment modal in browser)
    → Customer completes payment
    → Razorpay webhook → backend → order confirmed → tickets issued
    → Consumer redirected to /checkout/confirmation?orderId=
    → Confirmation page shows order summary + ticket links
    → Tickets appear in /tickets (My Tickets wallet)
```

**Current status:**
- Event detail page: CTA button is **disabled** with text "Ticket Sales Opening Soon"
- No `/checkout` route exists in any app
- No Razorpay SDK integration in any web or mobile app
- No payment confirmation page
- No ticket wallet page
- Consumer API client has no checkout/payment methods at all

**Missing API client methods:**
```typescript
postCheckout(eventId, items): Promise<CheckoutDto>
initiatePayment(checkoutId): Promise<PaymentIntentDto>
getOrderDetail(orderId): Promise<OrderDetailDto>
getMyTickets(params): Promise<TicketDto[]>
getTicketDetail(ticketId): Promise<TicketDetailDto>
```

---

## I. Notification Gaps

| Notification Surface | Backend Ready | Frontend Status |
|:--------------------|:--------------|:----------------|
| Email delivery | Ready (outbox + SES adapter) | No consumer email preference UI |
| Push (FCM/APNs) | Ready (PushProviderService) | No device token registration in consumer mobile |
| SMS | Ready | No phone verification UI |
| In-app inbox | Ready | No notification inbox screen in any app |
| Notification preferences | Ready | No preferences UI in any app |
| Deep link routing from push | N/A (mobile) | Not implemented in consumer mobile |

---

## J. Analytics Gaps

**Zero analytics events are fired from any frontend application.** The complete analytics pipeline (`AnalyticsService`, `POST /analytics/events`) is ready on the backend.

| Event | Should Fire In | Current Status |
|:------|:---------------|:---------------|
| `app.session.start` | consumer-web, consumer-mobile | Not firing |
| `event.viewed` | consumer-web, consumer-mobile | Not firing |
| `event.search.performed` | consumer-web | Not firing |
| `event.favorited` | consumer-web, consumer-mobile | Not firing |
| `checkout.started` | consumer-web | Not firing |
| `checkout.abandoned` | consumer-web | Not firing |
| `payment.initiated` | consumer-web | Not firing |
| `payment.completed` | consumer-web | Not firing |
| `ticket.viewed` | consumer-web, consumer-mobile | Not firing |
| `scanner.scan.performed` | scanner-mobile | Not firing |
| `organizer.event.created` | organizer-web | Not firing |

---

## K. Scanner Gaps (Detailed)

The scanner mobile app has a strong backend + service layer but a simulated UI.

| Gap | Impact |
|:----|:-------|
| No real camera integration (`mobile_scanner` package) | Cannot scan any real QR code |
| No login screen | Cannot authenticate scanner staff |
| No device registration flow | Backend device assignment cannot happen |
| No gate selection screen | Hardcoded gate/event IDs |
| No authorization package download UI | Offline crypto validation cannot be bootstrapped |
| No offline state persistence across restarts | Queue is in-memory only |
| Manual lookup button is `onPressed: () {}` | Completely non-functional |
| No sound/haptic feedback | Poor gate UX |
| No sync status or conflict display | Cannot show reconciliation results |
| `flutter_secure_storage` not used | Auth tokens stored insecurely |

**Positive:** `ScannerApiService`, `OfflineQueueService`, and `CryptoService` are well-structured and match the backend contract exactly. The service layer is a strong foundation.

---

## L. Admin Gaps

Admin-web is the most critical completely-missing application.

The backend `AdminModule` (Phase 9) fully implements:
- User management (suspend/restore/inspect)
- Event moderation (approve/reject/suspend/feature)
- Order/ticket inspection + refund delegation
- Audit log retrieval (append-only)
- Finance overview
- Settlement review + approval (MFA-protected)
- CMS content management
- Analytics dashboards (RBAC-gated)
- Platform health monitoring
- Scanner device management

None of this is accessible to internal operators because the admin-web frontend does not exist.

---

## M. Responsiveness / Accessibility

| App | Desktop | Tablet | Mobile browser |
|:----|:--------|:-------|:---------------|
| consumer-web | Basic responsive | Partial | No mobile nav menu |
| organizer-web | Sidebar layout | Likely breaks | No mobile layout |
| venue-web | Basic responsive | Likely breaks | No mobile layout |
| promoter-web | Basic responsive | Likely breaks | No mobile layout |
| admin-web | Placeholder | — | — |

**Common accessibility gaps across all web apps:**
- No `aria-label` on icon buttons
- No keyboard navigation testing
- No WCAG contrast audit conducted
- No focus ring visibility guaranteed
- No screen reader testing

---

## N. Recommended Implementation Order for Phase 14

### Phase 14.1 — Authentication Foundation (ALL APPS)
*Unlocks everything else.*

1. Shared auth context + hooks in `packages/auth`
2. Consumer web: Login + Register + Logout + session refresh + Navbar auth state
3. Organizer/Venue/Promoter web: Login pages + middleware session guards  
4. Admin web: Login + MFA enforcement UI
5. Consumer mobile: Auth screens (login/register/reset)
6. Scanner mobile: Staff login screen + `flutter_secure_storage`

### Phase 14.2 — Consumer Checkout + Ticket Wallet
*Core revenue flow.*

1. Consumer web: Ticket selection → hold → Razorpay SDK → confirmation
2. Consumer web: My Tickets page + Ticket detail + QR display
3. Consumer web: Order history + order detail
4. Consumer mobile: Checkout + ticket wallet

### Phase 14.3 — Organizer Web → Real API Integration

1. Replace all mock data with real API calls
2. Event creation wizard → real `POST /events` + `POST /ticket-types`
3. Event command center → real data
4. Analytics page → `GET /analytics/organizer-summary`
5. Finance/settlements page → `GET /settlements`
6. Orders page → real data + refund action

### Phase 14.4 — Scanner Mobile — Real Camera + API Wiring

1. Login screen → `POST /auth/login` (scanner staff role)
2. Device registration → `POST /scanner/register`
3. Gate/event selection → assigned events list
4. Authorization package download → `GET /scanner/events/:id/package`
5. Real camera via `mobile_scanner` → decrypt QR → `POST /scanner/scan`
6. Offline queue with persistent storage → `syncOfflineScans`
7. Manual lookup screen
8. Sound + haptic feedback

### Phase 14.5 — Admin Web (Full Build from Scratch)

1. Admin layout + navigation shell
2. Users management: search, inspect, suspend, restore
3. Events moderation: pending review queue, approve/reject/feature
4. Orders: inspect, initiate refund
5. Audit log viewer
6. Finance overview + settlement approval (with MFA enforcement)
7. CMS: banners, collections, featured events
8. Platform health dashboard
9. Analytics dashboards
10. Scanner device management

### Phase 14.6 — Venue + Promoter Web → Real API

1. Venue web: real venue data, calendar, event request workflow
2. Promoter web: real campaign data, real earnings, payout settings

### Phase 14.7 — Consumer Web Polish + Consumer Mobile

1. Consumer web: Favorites, Notification inbox, Profile, Categories, Venue detail
2. Consumer mobile: Full app shell, navigation, discovery, event detail, deep links, push notifications

### Phase 14.8 — Analytics Instrumentation

1. Add `POST /analytics/events` calls at all canonical events in all apps
2. Validate against taxonomy in `14_ANALYTICS_EVENTS.md`

### Phase 14.9 — Design System Consolidation

1. Update all apps to use `packages/ui` shared components
2. Add missing components: Modal, Toast, Table, Tabs, DatePicker, Charts, Pagination
3. Responsive audit and mobile navigation

---

## Summary

The platform backend (Phases 0-13) is complete and production-architected.

The frontend is in an early-scaffold state:
- **5 of 7 apps** have partial UI with all business data mocked
- **2 of 7 apps** are pure placeholders (consumer-mobile, admin-web)
- **0 of 7 apps** have working authentication wired to the backend
- **0 of 7 apps** have real API integration beyond consumer-web's 5 public discovery routes
- **The revenue-critical checkout flow does not exist in any application**
- **Zero analytics events are fired from any frontend**

Phase 14 recommended implementation order:
1. Auth foundation (unblocks everything)
2. Consumer checkout + ticket wallet (revenue)
3. Organizer real API integration (supply side operations)
4. Scanner real camera + API wiring (event day operations)
5. Admin web full build (internal operations)
6. Venue + Promoter real API (ecosystem completion)
7. Consumer web polish + consumer mobile full app
8. Analytics instrumentation
9. Design system consolidation + responsive audit
