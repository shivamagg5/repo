# Route and Screen Inventory

Static audit of every routable page/screen. “API” is the actual call site found in source. This does not claim a live runtime success.

## consumer-web

| Route | Current implementation / API | State and gaps | Status |
| --- | --- | --- | --- |
| `/` | Public feed, venues, categories via typed client | Loading/error/empty paths; fixed popular-city list is benign UI default | PARTIAL |
| `/events`, `/search` | Typed `GET /public/events`, categories; query-driven filters | Local filter/search UI, error/empty states; no server-result verification | PARTIAL |
| `/categories/[slug]` | Direct SSR `GET /public/events` | Bypasses client; fallback base URL points to port 3000 | BROKEN |
| `/events/[slug]` | Direct SSR public event and ticket-type fetches | Same URL bypass/default issue; ticket selection component creates reservation | PARTIAL |
| `/venues`, `/venues/[slug]` | Typed venue list; direct SSR venue/event fetches | Detail repeats wrong direct-fetch fallback | PARTIAL |
| `/checkout` | Reservation/order/intent/cancel/confirm; Razorpay Checkout JS | SDK is loaded; placeholder key fallback; confirmation is race-prone but does not grant authority itself | PARTIAL |
| `/checkout/confirmation/[orderId]` | Repeated typed order fetch | Pending state exists; depends on payment path | PARTIAL |
| `/tickets`, `/tickets/[id]` | Typed user tickets/ticket lookup | Ticket QR UI and `.ics`; backend signing key problem applies | PARTIAL |
| `/orders`, `/orders/[id]` | Typed user orders/order lookup | Standard loading/error states | PARTIAL |
| `/notifications` | In-app notification/preferences APIs | Read action/API not surfaced in this route audit | PARTIAL |
| `/profile` | Auth-context session only | No profile mutation path | PARTIAL |
| `/auth/login`, `/auth/register`, `/auth/callback` | Supabase through auth package | Redirect and errors present; depends on environment and backend sync | PARTIAL |

## organizer-web

| Route | Current implementation / API | State and gaps | Status |
| --- | --- | --- | --- |
| `/` | Organizer overview and paginated events | Loading/error states; metrics rely on backend scope correctness | PARTIAL |
| `/events` | Organizer events | Working list source; backend build currently fails | PARTIAL |
| `/events/new` | Create event, tier, lineup, media; analytics emits create/tier events | Real calls, multi-step form; compensation/recovery after partial submit is not transactionally demonstrated | PARTIAL |
| `/events/[id]` | Dashboard, attendance, orders, promoters; state transitions/tier create | Real calls; depends on unscoped analytics and scanner state | PARTIAL |
| `/orders` | Organizer event then event orders | Real API, selection/search UI | PARTIAL |
| `/promoters` | Organizer events/promoters | No campaign lifecycle controls | PARTIAL |
| `/team` | Team and invitation APIs | `setTimeout` only closes UI feedback; not a fake data fallback | PARTIAL |
| `/auth/login`, `/auth/callback` | Supabase | Auth flow only | PARTIAL |

## venue-web

| Route | Current implementation / API | State and gaps | Status |
| --- | --- | --- | --- |
| `/` | Venue profile/events | First resolved venue-org behavior; no multi-org selector | PARTIAL |
| `/calendar` | Venue calendar/profile | Backend calendar source exists, no runtime evidence | PARTIAL |
| `/events` | Venue events/profile | Real client calls | PARTIAL |
| `/profile` | Venue profile update | UI success timer only; payload validation is controller `as any` | PARTIAL |
| `/staff` | Staff list/invitation | UI timer only; depends on membership security | PARTIAL |
| `/auth/login`, `/auth/callback` | Supabase | Auth flow only | PARTIAL |

## promoter-web

| Route | Current implementation / API | State and gaps | Status |
| --- | --- | --- | --- |
| `/` | Campaign list + earnings | Typed calls, copy-state timer | PARTIAL |
| `/campaigns` | Campaign list/create | Requires raw event UUID; no event picker | PARTIAL |
| `/campaigns/[id]` | Calls campaign detail and performance | Detail endpoint is absent; page cannot load fully | BROKEN |
| `/analytics` | Campaign list then performance per campaign | N+1 calls and no pagination | PARTIAL |
| `/earnings` | Earnings API | Data source exists but finance lifecycle is incomplete | PARTIAL |
| `/profile` | Auth-context identity only | No payout/profile persistence | PARTIAL |
| `/auth/login`, `/auth/callback` | Supabase | Auth flow only | PARTIAL |

## admin-web

| Route | Current implementation / API | State and gaps | Status |
| --- | --- | --- | --- |
| `/` | Users, review queue, audit logs, admin metrics | Dashboard metrics include hardcoded/unverified backend values | PARTIAL |
| `/events` | Review queue/review action, admin analytics events | Approve/reject/suspend UI; depends on server moderation semantics | PARTIAL |
| `/users` | User list/suspend/restore | Reason required; client analytics emits suspension | PARTIAL |
| `/orders` | Manual UUID order lookup/refund | Refund endpoint is not a provider/ledger/ticket refund engine | BROKEN |
| `/finance` | Transactions/reconciliation | Reconciliation is not provider reconciliation and uses created date | PARTIAL |
| `/settlements` | Generate/review settlement | UI exposes cross-org/global calculation defect; feedback uses timers only | BROKEN |
| `/cms` | Banners/featured/create collection | No full CMS lifecycle; consumer web does not consume CMS endpoints | PARTIAL |
| `/audit-logs` | Audit log list | API backed; no export/retention verification | PARTIAL |
| `/auth/login`, `/auth/callback` | Supabase + local `AdminGuard` UX | Server permissions remain authority; MFA implementation was not found | PARTIAL |

## consumer-mobile

| Screen / route | Current implementation / API | State and gaps | Status |
| --- | --- | --- | --- |
| Shell, onboarding | Local navigation/onboarding state | No backend required | IMPLEMENTED |
| Login, register, forgot password | Supabase auth | Demo-account path can fabricate local authenticated state after failure | PARTIAL |
| Home | Direct public event/category HTTP | Event error is surfaced; categories silently fall back to fixed categories; “tonight/trending” are client slices, not authoritative queries | PARTIAL |
| Search + filters | Direct public events HTTP with debounce | Loading/error/empty; category defaults are static and filter semantics depend on backend | PARTIAL |
| Event detail | Direct public event/tier HTTP + passed visual placeholder | Does not fabricate event record; selection is blocked until authoritative detail arrives | PARTIAL |
| Ticket selection | `POST /reservations` through local API service | Server-authoritative intent, but downstream order parsing breaks checkout | PARTIAL |
| Checkout | Intent + Razorpay Flutter + order polling | Real SDK source present; hardcoded test key fallback; order envelope bug; `ord_` branch can show false confirmation | BROKEN |
| Confirmation | Order fetch / pending handling | Depends on broken order parsing and actual webhook | BROKEN |
| Ticket wallet/detail | Tickets APIs + secure cache | Offline cache is an honest fallback; QR validity depends on server keys | PARTIAL |
| Orders/list-detail | List works through envelope-aware list helper; detail uses broken order helper | Detail broken | PARTIAL |
| Notifications | In-app notification list | Loading/error/empty; no mark-as-read action | PARTIAL |
| Saved | Explicit “Coming Soon” | No saved-events API | DEFERRED |
| Profile | Supabase/backend profile display | No editable profile setting endpoint/UI | PARTIAL |

## scanner-mobile

| Screen / flow | Current implementation / API | State and gaps | Status |
| --- | --- | --- | --- |
| Login | Supabase auth service | Hardcoded demo credentials/session bypass remains | BROKEN |
| Device initialization | Registers device public key | Backend discards key; failed call stores fake device ID and marks registered | CRITICAL |
| Pairing | Public event list + pair API | Fixed fake gate IDs/events; pair failure creates local authorization package and returns success | CRITICAL |
| Scan | Camera, offline queue, online scan API | Ticket/package crypto is structural only; API envelope read fails and drops to offline admission | CRITICAL |
| Manual attendee lookup/check-in | Search/manual APIs plus UI fallback | No server assignment scope, fake fallback records possible, call response envelope not normalized | CRITICAL |
| Offline sync/metrics | SQLite queue/sync API | Assumes missing `syncedSyncIds/conflicts` then treats all queued records successful; metrics are local/fake names | CRITICAL |

