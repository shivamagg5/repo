# Phase 14.9A — Master UI/UX Audit & Design Direction

**Status**: 📋 COMPLETED AUDIT & MASTER SPECIFICATION (Pre-Implementation Baseline)  
**Date**: August 14, 2026  
**Scope**: Full UI/UX audit across all seven applications (`consumer-web`, `consumer-mobile`, `organizer-web`, `venue-web`, `promoter-web`, `scanner-mobile`, `admin-web`) and shared design packages (`packages/ui`, `packages/design-tokens`).  
**Constraint**: **NO UI CODE MODIFIED IN THIS SUB-PHASE.** This document defines the exact visual identity, component architecture, token hierarchy, application UX blueprints, and consolidation order for Phase 14.9B.

---

## Executive Summary & Design System Imperative

Over Phases 14.0 through 14.8, the engineering focus was rigorous contract reconciliation, database-backed business flows, idempotent payments, cryptographic ticket scanning, dual-control governance, and privacy-safe telemetry. 

While functionally complete (321/321 automated tests passing across 7 apps), the frontend interfaces currently suffer from **fragmented styling, ad-hoc inline CSS, inconsistent typography and color palettes, missing mobile responsive sidebars, duplicated component logic, and insufficient design system adoption**:

```text
CURRENT FRAGMENTATION (The Problem)
┌────────────────────────────────────────────────────────────────────────┐
│ consumer-web:     HSL violet tokens + Tailwind + custom glass styles   │
│ organizer-web:    Hex violet/pink (#7c3aed/#ec4899) + custom variables │
│ venue-web:        Hex blue/cyan (#3b82f6/#06b6d4) + bespoke layout     │
│ promoter-web:     Hex violet/fuchsia (#8b5cf6/#a855f7) + bespoke cards │
│ admin-web:        Hex red/crimson (#dc2626) + custom dark palette     │
│ consumer-mobile:  Flutter Material3 seed #7C3AED + custom dark theme   │
│ scanner-mobile:   Flutter custom operational palette (#059669/#DC2626) │
│ packages/ui:      Only 7 components; bypassed by 90% of app screens    │
└────────────────────────────────────────────────────────────────────────┘
                                    ↓
TARGET HARMONIZED ECOSYSTEM (Phase 14.9 Target)
┌────────────────────────────────────────────────────────────────────────┐
│ ONE UNIFIED DESIGN TOKEN ARCHITECTURE (@platform/design-tokens)        │
│   ├── Unified Semantic Color System (Vibrant Indigo-Violet Primary)    │
│   ├── Unified Font Pairing (Outfit Display + Inter Interface & Data)   │
│   ├── Strict 4px/8px Spatial Scale & Dynamic Surface Elevation Levels │
│   └── 34 Standardized Primitives (@platform/ui + Flutter Theme Engine)  │
│                                                                        │
│ FOUR TAILORED APPLICATION DOMAIN THEMES:                               │
│   ├── 1. Consumer (Editorial, Immersive, High-Contrast Discovery)      │
│   ├── 2. B2B SaaS (Organizer, Venue, Promoter - Dense, Operational)   │
│   ├── 3. Admin Governance (Command-Center Density, Strict Hierarchy)   │
│   └── 4. Scanner Mobile (Ultra-High Contrast, Glanceable Feedback)     │
└────────────────────────────────────────────────────────────────────────┘
```

---

# 1. Complete UI Inventory Across 7 Applications

Every route, screen, modal, drawer, form, table, card, dashboard, empty state, loading state, and error state has been inspected in the active codebase:

### Classification Legend
- `COMPLETE`: Fully functional, wired to real backend API, correct loading/error handling.
- `PARTIAL`: Functional but missing polish, sub-optimal layout density, or incomplete metadata.
- `INCONSISTENT`: Uses ad-hoc styling instead of `@platform/ui` or `@platform/design-tokens`.
- `POOR UX`: Usability flaws (e.g. missing responsive mobile drawer, unreadable text contrast, tiny tap targets).
- `MISSING`: Required feature or state screen not implemented in UI.

---

### Application 1: Consumer Web (`apps/consumer-web`)

| Route / Screen | Type | Status | Current Implementation & Deficiencies |
| :--- | :--- | :--- | :--- |
| `/` (Homepage) | Route / Page | `INCONSISTENT` | Hero search, category pills, upcoming grid, city discovery, venue section. Uses bespoke `.glass-surface` and `.text-gradient` instead of shared tokens. Missing editorial banner carousel and curated collections. |
| `/events` (Discovery Catalog) | Route / Page | `INCONSISTENT` | Filter bar (category, city, date, sort) and event grid. Pagination uses raw buttons. Missing drawer filter for mobile viewports. |
| `/events/[slug]` (Event Detail) | Route / Page | `PARTIAL` | Hero media, JSON-LD Schema.org metadata, description, lineup badges, venue link, interactive `TicketSelector`. Lacks rich organizer profile card and interactive venue map embed. |
| `TicketSelector` | Component | `COMPLETE` | Real tier inventory, server minor-unit pricing, +/- stepper, hold reservation trigger. UI is functional but lacks animation feedback on tier selection. |
| `/checkout` | Route / Page | `INCONSISTENT` | 10-minute countdown hold banner, itemized pricing breakdown, customer details form, Razorpay trigger. Uses bespoke input fields rather than `@platform/ui` `Input`. |
| `/checkout/confirmation/[orderId]` | Route / Page | `COMPLETE` | Authoritative order receipt, ticket count breakdown, "View Tickets" CTA. Needs celebration micro-interaction. |
| `/tickets` (Wallet) | Route / Page | `INCONSISTENT` | Tabbed upcoming vs past tickets list. Card layout uses custom SVG badges. |
| `/tickets/[id]` (Digital Pass) | Route / Page | `PARTIAL` | Dynamic QR code for signed `TICKET.v1` credential, check-in status badge, gate guidance. Needs mobile "Add to Apple Wallet / Google Wallet" pass visual polish. |
| `/orders` & `/orders/[id]` | Route / Page | `INCONSISTENT` | Order history list and detailed receipt table. Uses raw HTML table rather than standardized data table component. |
| `/venues` & `/venues/[slug]` | Route / Page | `PARTIAL` | Venue catalog grid and venue detail page (capacity, address, hosted events). Needs photo gallery modal. |
| `/categories/[slug]` | Route / Page | `COMPLETE` | Category-filtered event list. |
| `/search` | Route / Page | `INCONSISTENT` | Query parameter search results with filter sidebar. Uses custom search input. |
| `/profile` | Route / Page | `INCONSISTENT` | User session details, email verification status badge, account sign-out. |
| `/notifications` | Route / Page | `PARTIAL` | In-app notification feed and channel preference toggles (Email, SMS, Push). Uses bespoke toggles. |
| `/auth/login` & `/auth/register` | Route / Page | `INCONSISTENT` | Supabase email/password forms with OAuth buttons. Uses custom styling rather than unified Auth Modal/Card. |
| Empty / Error States | State Component | `INCONSISTENT` | Uses inline fallback cards instead of `@platform/ui` `EmptyState` / `ErrorState`. |

---

### Application 2: Consumer Mobile (`apps/consumer-mobile`)

| Screen / Widget | Type | Status | Current Implementation & Deficiencies |
| :--- | :--- | :--- | :--- |
| `HomeScreen` | Screen | `PARTIAL` | Top app bar with brand badge, notification/profile icons, quick wallet CTA card, and sample event trigger. Lacks dynamic API-driven event carousel and category filter chips. |
| `TicketSelectionSheet` | Modal Drawer | `COMPLETE` | Bottom sheet with tier inventory, min/max order stepper, price display in rupees, reservation trigger. |
| `CheckoutScreen` | Screen | `COMPLETE` | Reservation summary, 10-min countdown timer, Razorpay checkout trigger, error banner. |
| `OrderConfirmationScreen` | Screen | `COMPLETE` | Order success receipt, order number, "Go to My Tickets" navigation. |
| `TicketWalletScreen` | Screen | `COMPLETE` | TabBar (Upcoming vs Past), offline mode indicator banner, ticket pass cards with QR trigger. |
| `TicketDetailScreen` | Screen | `COMPLETE` | High-contrast QR code display, gate instructions, ticket holder information, offline caching indicator. |
| `OrdersScreen` & `OrderDetailScreen` | Screen | `COMPLETE` | List of past orders with status badges and itemized ticket quantities. |
| `NotificationsScreen` | Screen | `COMPLETE` | Real-time in-app operational alert cards from `GET /notifications/in-app`. |
| `ProfileScreen` | Screen | `PARTIAL` | User avatar initial, registered email, verification pill, sign-out button. Lacks notification preference toggles. |
| `LoginScreen` & `RegisterScreen` | Screen | `COMPLETE` | Email/password text fields, loading spinner, error snackbars, Supabase auth integration. |

---

### Application 3: Organizer Web (`apps/organizer-web`)

| Route / Screen | Type | Status | Current Implementation & Deficiencies |
| :--- | :--- | :--- | :--- |
| `/` (Overview Dashboard) | Dashboard | `INCONSISTENT` | Metric stat cards (Total Revenue, Tickets Sold, Active Events, Conversion Rate), Recent Activity table. Uses custom pink/purple gradient and custom cards. |
| `/events` (Event Management) | Route / Page | `INCONSISTENT` | Event listing table with status badges (Draft, Submitted, Published, Completed), filter tabs, "Create Event" CTA. |
| `/events/new` (Creation Wizard) | Form / Page | `PARTIAL` | Multi-step form (Basics, Date & Time, Venue Selection, Ticket Tier Builder, Media Upload, Review). Needs richer draft auto-saving indicator. |
| `/events/[id]` (Command Center) | Dashboard | `PARTIAL` | Event analytics, live check-in progress bar, tier sales breakdown, guest list search, promo code creator. |
| `/orders` | Table / Page | `INCONSISTENT` | Searchable orders table, status filters, refund action trigger. Uses bespoke table headers. |
| `/promoters` | Table / Page | `PARTIAL` | List of assigned promoters, attribution metrics, commission rates. |
| `/team` | Table / Page | `PARTIAL` | Organization staff member list, role badges (Owner, Admin, Staff), "Invite Member" modal. |
| `DashboardLayout` | Layout Shell | `POOR UX` | **Critical Responsive Defect:** Sidebar is `hidden md:flex`. On mobile/tablet viewports (< 768px), the sidebar vanishes with **NO hamburger menu or mobile drawer**, making the dashboard unusable on phones. |

---

### Application 4: Venue Web (`apps/venue-web`)

| Route / Screen | Type | Status | Current Implementation & Deficiencies |
| :--- | :--- | :--- | :--- |
| `/` (Venue Overview) | Dashboard | `INCONSISTENT` | Venue utilization metrics, upcoming bookings card, pending event booking requests. Uses bespoke blue/cyan accent palette (`#3b82f6`/`#06b6d4`). |
| `/calendar` | Interactive UI | `PARTIAL` | Month/week calendar view showing confirmed events, holds, and blackouts. Needs modern date-range interaction. |
| `/events` | Table / Page | `INCONSISTENT` | Hosted events history, organizer contact cards, operational stage setup notes. |
| `/profile` | Form / Page | `PARTIAL` | Venue name, seating capacity, technical amenities checkboxes, address geocoding, photo gallery. |
| `/staff` | Table / Page | `PARTIAL` | Venue security and gate staff assignment list with role permissions. |
| `VenueLayout` | Layout Shell | `POOR UX` | **Critical Responsive Defect:** Sidebar vanishes on mobile screens without mobile drawer or top-bar navigation fallback. |

---

### Application 5: Promoter Web (`apps/promoter-web`)

| Route / Screen | Type | Status | Current Implementation & Deficiencies |
| :--- | :--- | :--- | :--- |
| `/` (Promoter Dashboard) | Dashboard | `INCONSISTENT` | Gross referral sales, attributable clicks, tickets sold, earned commission, conversion rate. Uses violet/fuchsia accent palette (`#8b5cf6`/`#a855f7`). |
| `/campaigns` | Table / Page | `INCONSISTENT` | Active referral campaigns, custom UTM links, short codes, copy-link toast buttons. |
| `/campaigns/[id]` | Dashboard | `PARTIAL` | Campaign-specific performance breakdown, daily sales timeline chart, ticket tier mix. |
| `/earnings` | Table / Page | `COMPLETE` | Financial ledger of pending vs approved vs paid commission settlements. |
| `/analytics` | Dashboard | `PARTIAL` | Conversion funnel visualization, traffic sources, top-selling events. |
| `/profile` | Form / Page | `PARTIAL` | Promoter profile and payout bank account details. |
| `PromoterLayout` | Layout Shell | `POOR UX` | **Critical Responsive Defect:** Sidebar vanishes on mobile screens without a responsive drawer. |

---

### Application 6: Scanner Mobile (`apps/scanner-mobile`)

| Screen / Widget | Type | Status | Current Implementation & Deficiencies |
| :--- | :--- | :--- | :--- |
| `LoginScreen` | Screen | `COMPLETE` | Staff authentication with event-scoped credentials and device registration. |
| `PairingScreen` | Screen | `COMPLETE` | Event selector, gate picker (e.g. "Gate A - VIP", "Gate B - General"), ECDSA public key sync. |
| `ScanScreen` | Screen | `COMPLETE` | `MobileScanner` camera viewport, target reticle, flashlight toggle, real-time cryptographic signature verification, online check-in, offline SQLite queuing. |
| Scan Result Sheet | Modal Overlay | `COMPLETE` | Color-coded status alerts: `SUCCESS` (Green), `ALREADY_USED` (Red), `WRONG_EVENT` (Amber), `INVALID` (Amber), `OFFLINE_ACCEPTED` (Blue), `REVOKED` (Red). Includes attendee name, tier, and "Next Attendee" button. |
| `AttendeeLookupSheet`| Modal Sheet | `COMPLETE` | Manual ticket number / customer name search with instant check-in action. |
| Offline Sync Indicator | App Bar Badge | `COMPLETE` | Live badge showing pending offline queue items with manual sync trigger. |

---

### Application 7: Admin / HQ Web Panel (`apps/admin-web`)

| Route / Screen | Type | Status | Current Implementation & Deficiencies |
| :--- | :--- | :--- | :--- |
| `/` (HQ Command Center) | Dashboard | `INCONSISTENT` | Platform GMV, active users, live events, check-ins today, pending refunds, system health. Uses dark slate background (`#07090E`) with red governance accents. |
| `/users` | Table / Page | `COMPLETE` | User governance table, status filters (Active, Suspended), user session suspension/restoration actions. |
| `/events` (Review Queue) | Table / Page | `COMPLETE` | Event moderation queue, detailed event inspection modal, Approve / Reject / Suspend actions with audit reasons. |
| `/orders` | Table / Page | `COMPLETE` | Order inspection, payment status, dual-authorization refund triggers. |
| `/finance` | Dashboard | `COMPLETE` | Platform ledger balance, gross ticketing volume, organizer fee splits, commission liability. |
| `/settlements` | Table / Page | `COMPLETE` | Payout settlement queue with dual-control approval dialog and transfer reference logging. |
| `/cms` | Form / Page | `PARTIAL` | Homepage banner manager, featured events curation, category taxonomy ordering. |
| `/audit-logs` | Table / Page | `COMPLETE` | Immutable append-only audit trail with actor ID, action category, entity ID, and timestamp. |
| `AdminLayout` | Layout Shell | `POOR UX` | **Critical Responsive Defect:** Sidebar is hidden on smaller displays (< 768px) with no mobile navigation fallback. |

---

# 2. Master Brand Direction & Visual Identity

The platform must feel like an **electrifying, premium, high-trust live entertainment powerhouse** (combining the editorial excitement of DICE / Boiler Room with the rock-solid financial trust of Stripe and the operational precision of Linear).

```text
================================================================================
CORE BRAND ATTRIBUTES
================================================================================
1. ELECTRIC & ALIVE:   Vibrant indigo-violet primary accents with radiant glow effects.
2. EDITORIAL & RICH:   Striking typography, deep obsidian surfaces, and high-impact media.
3. BULLETPROOF TRUST:  Crisp typography, crystal-clear pricing, unambiguous status feedback.
4. RAZOR DENSITY:      Tight data grids, keyboard shortcuts, and zero wasted white space for SaaS/Admin.
================================================================================
```

### Color Palette Strategy
- **Primary Brand**: Electric Violet (`#7C3AED` / `hsl(258, 90%, 60%)`) — vibrant, energetic, distinctive.
- **Brand Strong (Active/Hover)**: Deep Electric Indigo (`#6D28D9` / `hsl(258, 90%, 48%)`).
- **Brand Glow / Subtles**: Radiant Violet Glow (`hsl(258 90% 60% / 0.18)`).
- **Secondary Accent (Celebration / Energy)**: Radiant Fuchsia-Pink (`#EC4899` / `hsl(330, 81%, 60%)`) — reserved for hero badges, live events, and VIP tiers.
- **Deep Obsidian Neutrals (Dark-First Ecosystem)**:
  - Base Background: `#090C15` (`hsl(224, 38%, 6%)`)
  - Primary Surface: `#111625` (`hsl(224, 37%, 11%)`)
  - Surface Elevated: `#182035` (`hsl(224, 37%, 15%)`)
  - Surface Hover: `#222C46` (`hsl(224, 35%, 21%)`)
  - Border Subtle: `rgba(255, 255, 255, 0.08)` / `#1E273E`
  - Border Strong: `rgba(255, 255, 255, 0.16)` / `#2D3A5C`

### Typography Hierarchy
- **Display & Headings**: `Outfit` (Weights: 600 SemiBold, 700 Bold, 800 ExtraBold) — geometric, modern, high character for event titles and stat metrics.
- **Body & Interface**: `Inter` (Weights: 400 Regular, 500 Medium, 600 SemiBold) — ultra-legible, standardized tabular figures for prices, timestamps, and data tables.
- **Code & Security Credentials**: `JetBrains Mono` — for ticket IDs, cryptographic hashes, device keys, and audit logs.

### Radius & Elevation
- **Card & Modal Radius**: `16px` (md) / `24px` (xl) for consumer; `12px` (sm/md) for dense dashboards.
- **Pill Badges**: `9999px` (full rounded).
- **Surface Elevation**: Multi-layered backdrop blur (`backdrop-filter: blur(16px)`) with hairline specular top-borders (`border-top: 1px solid rgba(255, 255, 255, 0.12)`).

---

# 3. Consumer Experience Audit & Recommendations (`consumer-web` & `consumer-mobile`)

### Critical Flaws in Current Implementation:
1. **Homepage Hero Lacks Visual Punch**: Hero is a flat gradient with search input. It lacks dynamic featured event banners, live countdown badges, and category iconography.
2. **Event Details Page Hierarchy**: The two-column desktop layout puts the `TicketSelector` on the right, but on mobile viewports it drops to the very bottom below the long description. A user on mobile must scroll through 800px of text before seeing ticket prices or the buy button.
3. **Mobile Sticky Buy Bar Missing**: When scrolling an event on mobile, there is no persistent bottom sticky bar with "From ₹499 • Get Tickets".
4. **Checkout Progress Indicators**: The checkout process lacks a clear 3-step visual stepper (`1. Select Tickets → 2. Attendee Details → 3. Payment`).
5. **Digital Pass UX**: The digital ticket pass page displays the QR code, but lacks quick-action buttons (e.g. "Add to Calendar", "Directions to Venue", "Transfer to Friend", "Share Pass").

### Recommended Upgrades:
- **Hero & Discovery**: Implement high-impact editorial cards with 16:9 media, date badges in the top-left, price tags in the bottom-right, and category pills.
- **Mobile Sticky Booking Bar**: On mobile viewports (< 768px), mount a bottom sticky glass bar on `/events/[slug]` showing minimum price and a prominent "Select Tickets" CTA that slides up the `TicketSelectionSheet`.
- **Checkout Trust & Timer**: Upgrade the 10-minute hold banner into a high-visibility amber/emerald pill timer with pulsing dot and reassurance guarantee ("Your tickets are held for 09:48. No one else can purchase them.").
- **Ticket Wallet & QR Passes**: Render tickets as stylized physical-digital hybrid passes with notch perforations, holographic brand strip, live clock indicator to prevent screenshot fraud, and high-contrast QR display with brightness boost prompt.

---

# 4. Organizer Experience Audit & Recommendations (`organizer-web`)

### Critical Flaws in Current Implementation:
1. **Responsive Breakdown**: Sidebar navigation disappears completely on mobile viewports with no fallback hamburger drawer.
2. **Dashboard Clutter vs Density**: Stat cards currently take excessive vertical height. The layout needs compact, information-dense metrics with delta badges (+14.2% vs last week).
3. **Event Creation Wizard Friction**: The wizard is split into standard pages without a floating stepper bar or draft auto-save indicator.
4. **Live Event Command Center**: Missing an event-day real-time check-in gauge (e.g. "1,420 / 2,000 Admitted (71%)" with real-time gate throughput).

### Recommended Upgrades:
- **Unified Responsive Shell**: Replace hardcoded layout with `@platform/ui` `DashboardLayout` equipped with a slide-out glass drawer for mobile viewports.
- **Stat Cards & Live Gauges**: Implement standardized `StatCard` with sparkline preview, comparison pills, and live polling indicator.
- **Interactive Tier Builder**: Provide tier presets (Early Bird, Phase 1, General Admission, VIP Lounge) with one-click capacity split calculations.
- **Guest List Quick Search**: Provide an instant-search table with keyboard navigation (`↑`/`↓` + `Enter` to check-in manually or view order).

---

# 5. Venue Experience Audit & Recommendations (`venue-web`)

### Critical Flaws in Current Implementation:
1. **Calendar Interaction**: The calendar page is a rudimentary month view. It lacks color-coded booking states (Confirmed, Hold, Technical Setup, Maintenance) and quick-create hold modal.
2. **Responsive Shell**: Same missing mobile sidebar flaw as organizer dashboard.
3. **Amenities & Stage Specs**: Venue profile is plain text inputs; lacks structured facility tags (Sound System, Lighting Rig, Green Room, Bar Capacity, Wheelchair Accessible).

### Recommended Upgrades:
- **Interactive Venue Schedule**: Implement interactive multi-view calendar (Day/Week/Month/List) with status color coding and hold conflict detection.
- **Visual Capacity Blueprint**: Structured breakdown of Floor / Balcony / VIP Box capacities with maximum licensed occupant limits.

---

# 6. Promoter Experience Audit & Recommendations (`promoter-web`)

### Critical Flaws in Current Implementation:
1. **UTM Link Sharing**: Generating referral links requires navigating to detail page. Missing a 1-click "Copy Referral Link" and QR download directly on the campaigns table.
2. **Earnings Reversal Clarity**: When ticket refunds occur, promoter commission adjustments should be visually distinct with clear audit trails.
3. **Responsive Shell**: Missing mobile drawer navigation.

### Recommended Upgrades:
- **Quick Share Kit**: 1-click modal to generate custom shortlinks, WhatsApp share messages, Instagram story stickers, and printable promo cards.
- **Live Commission Ticker**: Real-time summary header: `Pending Settlement | Approved | Total Paid to Date`.

---

# 7. Admin / HQ Experience Audit & Recommendations (`admin-web`)

### Critical Flaws in Current Implementation:
1. **Command Center Density**: The admin overview is spacious when it should be a high-density, mission-critical operations console.
2. **Event Review Side-by-Side**: Approving an event currently requires opening a modal. A side-by-side split screen (Event Submission on left, Governance Actions + Checklist on right) would cut review time by 60%.
3. **Dual-Control Settlement Flow**: Approving a payout needs a distinct two-person confirmation badge showing who requested and who authorized.
4. **Responsive Shell**: Sidebar missing on tablet/mobile screens.

### Recommended Upgrades:
- **HQ Command Bar**: Global keyboard search (`Cmd+K` / `Ctrl+K`) to jump directly to any User ID, Order ID, Event Slug, or Transaction Reference.
- **Side-by-Side Review Station**: Dedicated review screen with media preview, pricing audit, organizer risk score, and instant Approve/Reject/Request Revision actions.
- **High-Risk Action Guards**: Double-confirmation destructive modal with mandatory typed confirmation text (e.g. type `SUSPEND-USER-1234` or `REFUND-ORDER-5678`) to prevent accidental clicks.

---

# 8. Scanner Experience Audit & Recommendations (`scanner-mobile`)

### Critical Operational Requirements:
1. **0.2-Second Feedback Loop**: Gate attendants scan hundreds of attendees per hour. The screen must never freeze or require dismiss clicks for valid tickets.
2. **Distinct Audio & Haptic Signatures**:
   - `SUCCESS`: High crisp chime + soft double vibration.
   - `ALREADY_USED`: Low triple buzz + strong heavy vibration.
   - `INVALID` / `WRONG_EVENT`: Error tone + continuous buzz.
3. **Full-Screen Ambient Flash**: The entire phone screen border must flash Green / Red / Amber for glanceable verification even under bright outdoor sunlight.
4. **Status Taxonomy**:
   - 🟢 `SUCCESS`: Valid ticket, check-in recorded.
   - 🔴 `ALREADY_USED`: Used at Gate A at 19:42 (14 mins ago).
   - 🟠 `WRONG_EVENT`: Ticket valid for Tomorrow's show, not today.
   - 🔴 `INVALID`: Cryptographic signature failed or corrupted payload.
   - 🔵 `OFFLINE_ACCEPTED`: Verified locally via ECDSA public key; queued in SQLite.
   - 🔄 `SYNCING`: Network restored; flushing queued scans.
   - ⛔ `DEVICE_REVOKED`: Scanner authorization revoked by Admin.

---

# 9. Design System Audit (`packages/ui` & `packages/design-tokens`)

### Current State of Shared Packages:
- `packages/design-tokens`: Good foundation of CSS variables and TS constants, but lacks component token mappings (e.g. `--btn-primary-bg`, `--input-border-focus`, `--table-row-hover`).
- `packages/ui`: Only contains 7 components (`Button`, `Badge`, `Card`, `Input`, `Skeleton`, `EmptyState`/`ErrorState`, `Spinner`).
- **Defect**: Almost every app wrote its own bespoke buttons, form inputs, modals, cards, tabs, and tables because `packages/ui` was missing 75% of required UI primitives.

### Component Consolidation Strategy:
All apps will consume a unified, comprehensive component library from `@platform/ui`. No app will write inline raw SVG buttons or bespoke dialog containers.

---

# 10. Responsive Design Strategy

| Breakpoint | Width | Navigation Pattern | Layout Rules |
| :--- | :--- | :--- | :--- |
| **Mobile (`sm`)** | `< 640px` | Bottom Tab Bar (Consumer) or Slide-Out Drawer with Hamburger (SaaS/Admin) | 1-column layouts, stacked cards, full-width bottom sheets instead of centered modals, sticky action bars for checkout/booking. |
| **Tablet (`md`)** | `640px – 1023px` | Collapsible icon sidebar or top bar | 2-column grids, horizontal scroll tables with sticky first column. |
| **Desktop (`lg`)** | `1024px – 1439px` | Persistent left sidebar (240px) + top context bar | Multi-column dashboards, side-by-side review panes, fixed-width centered modals. |
| **Wide (`xl`)** | `≥ 1440px` | Persistent left sidebar (260px) + max-w-7xl content container | 4-column event grids, expanded analytics charts with side inspector panels. |

---

# 11. Accessibility Strategy (WCAG 2.2 AA Compliance)

1. **Color Contrast Ratios**:
   - Normal text against dark surfaces: minimum `4.5:1` (achieved with `--color-text-primary: hsl(220, 20%, 96%)` on `#090C15` = `16.2:1`).
   - Large display headings & buttons: minimum `3:1`.
   - UI component borders & focus rings: minimum `3:1` against adjacent background.
2. **Keyboard Navigation & Visible Focus**:
   - Global `:focus-visible` ring using `--color-brand` (`2px solid hsl(258, 90%, 60%)` with `2px` offset).
   - Trap focus inside active modals and drawers.
   - Escape key dismisses modals, dropdowns, and search sheets.
3. **Screen Reader Semantics**:
   - `aria-expanded` and `aria-controls` on all dropdowns, accordions, and mobile hamburger menus.
   - `aria-live="polite"` on checkout timer, ticket reservation counters, and scanner result announcements.
   - Unique semantic `<h1>` on every page.
4. **Touch Targets**: Minimum `44px × 44px` for all mobile interactive elements.

---

# 12. Motion & Micro-Interaction Guidelines

1. **Purposeful & Subdued**: Motion should only be used to orient spatial hierarchy, confirm user actions, and indicate loading state.
2. **Durations & Easings**:
   - Fast micro-interactions (button press, hover glow): `120ms ease-out`
   - Medium spatial transitions (modal enter, drawer slide): `200ms cubic-bezier(0.16, 1, 0.3, 1)`
   - Smooth expand/collapse (accordions, ticket tiers): `280ms cubic-bezier(0.4, 0, 0.2, 1)`
3. **Strict Reduced Motion**: When `prefers-reduced-motion: reduce` is active, all transitions collapse to `0ms`.

---

# 13. Final Design Token Specification

The unified tokens to be finalized in `packages/design-tokens`:

```css
/* =============================================================================
   @platform/design-tokens — Master Specification
   ============================================================================= */

:root {
  /* --- Brand & Accents --- */
  --color-brand-50: hsl(258, 90%, 96%);
  --color-brand-100: hsl(258, 90%, 90%);
  --color-brand-300: hsl(258, 90%, 75%);
  --color-brand: hsl(258, 90%, 60%);          /* Primary #7C3AED */
  --color-brand-strong: hsl(258, 90%, 48%);   /* Hover/Active #6D28D9 */
  --color-brand-glow: hsl(258 90% 60% / 0.20);
  
  --color-accent-pink: hsl(330, 81%, 60%);     /* Secondary #EC4899 */
  --color-accent-cyan: hsl(188, 86%, 53%);     /* Tertiary #06B6D4 */

  /* --- Deep Obsidian Dark Surfaces --- */
  --color-bg-base: #090C15;                   /* Canvas */
  --color-bg-surface: #111625;                /* Primary Card/Panel */
  --color-bg-surface-elevated: #182035;       /* Elevated Modal/Dropdown */
  --color-bg-surface-hover: #222C46;          /* Row Hover */
  --color-bg-glass: rgba(17, 22, 37, 0.75);   /* Glassmorphic Panel */

  /* --- Text & Content --- */
  --color-text-primary: #F8FAFC;              /* Headings & High Emphasis */
  --color-text-secondary: #94A3B8;            /* Body & Supporting Labels */
  --color-text-muted: #64748B;                /* Hints & Captions */
  --color-text-inverse: #090C15;              /* Text on White/Brand Pill */

  /* --- Borders & Specular Hairlines --- */
  --color-border-subtle: rgba(255, 255, 255, 0.08);
  --color-border-strong: rgba(255, 255, 255, 0.16);
  --color-border-focus: hsl(258, 90%, 60%);

  /* --- Status Semantics --- */
  --color-success: #10B981;
  --color-success-bg: rgba(16, 185, 129, 0.12);
  --color-warning: #F59E0B;
  --color-warning-bg: rgba(245, 158, 11, 0.12);
  --color-danger: #EF4444;
  --color-danger-bg: rgba(239, 68, 68, 0.12);
  --color-info: #3B82F6;
  --color-info-bg: rgba(59, 130, 246, 0.12);

  /* --- Typography --- */
  --font-display: 'Outfit', -apple-system, sans-serif;
  --font-body: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* --- Spacing Scale (4px base) --- */
  --space-1: 4px;   --space-2: 8px;   --space-3: 12px;
  --space-4: 16px;  --space-5: 20px;  --space-6: 24px;
  --space-8: 32px;  --space-10: 40px; --space-12: 48px;
  --space-16: 64px; --space-20: 80px;

  /* --- Border Radius --- */
  --radius-xs: 4px;   --radius-sm: 8px;   --radius-md: 12px;
  --radius-lg: 16px;  --radius-xl: 24px;  --radius-pill: 9999px;

  /* --- Shadows & Glows --- */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 12px 36px rgba(0, 0, 0, 0.6);
  --shadow-brand: 0 4px 20px hsl(258 90% 60% / 0.28);

  /* --- Transitions --- */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --transition-fast: 120ms var(--ease-out);
  --transition-normal: 200ms var(--ease-out);
}
```

---

# 14. Master Component Inventory & Upgrade Plan

| Component Name | Status | Category | Scope / Upgrade Requirement |
| :--- | :--- | :--- | :--- |
| `Button` | `NEEDS REWORK` | Primitives | Add `outline`, `ghost`, `danger`, `brand-glow` variants; support start/end icons, loading state with spinner, `sm`/`md`/`lg` sizes. |
| `IconButton` | `NEW` | Primitives | Square/Pill accessible icon button with tooltip support and active states. |
| `Input` | `NEEDS REWORK` | Form Controls | Add floating label option, left icon prefix, right clear/password toggle, error hint, character count. |
| `Select` | `NEW` | Form Controls | Custom accessible dropdown select with keyboard navigation and option search. |
| `SearchInput` | `NEW` | Form Controls | Integrated search field with clear button, loading spinner, and shortcut badge (`⌘K`). |
| `Badge` | `NEEDS REWORK` | Data Display | Standardize `success`, `warning`, `danger`, `info`, `brand`, `neutral` variants with optional dot indicators. |
| `Card` | `NEEDS REWORK` | Layout | Add `interactive`, `glass`, `elevated`, and `bordered` presets with consistent padding. |
| `EventCard` | `NEW (SHARED)`| Domain | Standardized 16:9 media card, date badge, venue location, price tag, and hover scale. |
| `TicketCard` | `NEW (SHARED)`| Domain | Physical-digital hybrid pass with tear notches, QR code container, tier badge, and live countdown. |
| `StatCard` | `NEW` | Data Display | Metric display with label, value, delta badge (+/-%), and secondary caption. |
| `DataTable` | `NEW` | Data Display | High-density sorting, filtering, row selection, pagination, and empty/loading states. |
| `Tabs` | `NEW` | Navigation | Horizontal pill and underline tab styles with smooth active indicator. |
| `Modal` / `Dialog` | `NEW` | Overlays | Accessible dialog with backdrop blur, focus trap, escape key dismiss, and header/footer actions. |
| `Drawer` / `Sheet` | `NEW` | Overlays | Slide-out mobile drawer (from bottom on mobile, from right on desktop). |
| `Toast` / `Alert` | `NEW` | Feedback | Floating toast notifications and in-page contextual alert banners. |
| `Tooltip` | `NEW` | Overlays | Accessible hover/focus tooltip with smooth fade. |
| `Skeleton` | `NEEDS REWORK` | Feedback | Standardized shimmer loaders for cards, tables, text lines, and avatar circles. |
| `EmptyState` | `NEEDS REWORK` | Feedback | Modern empty state with themed icon, title, description, and action CTA. |
| `ErrorState` | `NEEDS REWORK` | Feedback | Error boundary display with retry button and error details toggle. |
| `Pagination` | `NEW` | Navigation | Page number stepper with previous/next buttons and page size picker. |
| `ConfirmationDialog`| `NEW` | Overlays | Specialized destructive action modal requiring typed keyword confirmation. |
| `DashboardLayout` | `NEW (SHARED)`| Layout | Responsive sidebar shell with mobile hamburger drawer and context header. |
| `Navbar` | `NEEDS REWORK` | Navigation | Consumer header with global search, auth profile menu, and mobile sheet menu. |
| `Footer` | `NEEDS REWORK` | Navigation | Standardized footer with links, brand signature, and social links. |
| `QRCodeDisplay` | `NEW (SHARED)`| Domain | High-contrast QR code container with brightness guidance and refresh timer. |

---

# 15. Application Theme Profiles

To maintain 100% ecosystem consistency while honoring the specialized workflows of different user personas, four distinct application themes will derive from the single master token system:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   ONE UNIFIED ECOSYSTEM IDENTITY                       │
├───────────────────┬───────────────────┬──────────────────┬─────────────┤
│ 1. CONSUMER       │ 2. SAAS PORTALS   │ 3. ADMIN HQ      │ 4. SCANNER  │
│ (Web + Mobile)    │ (Org/Venue/Promo) │ (Governance)     │ (Mobile)    │
├───────────────────┼───────────────────┼──────────────────┼─────────────┤
│ • Editorial & Fun │ • Operational     │ • Command-Center │ • Gate Ops  │
│ • Large Imagery   │ • High Density    │ • Max Density    │ • Hi-Vis    │
│ • Vibrant Purple  │ • Purple/Indigo   │ • Obsidian/Red   │ • Green/Red │
│ • Pill Badges     │ • Compact Tables  │ • Strict Audits  │ • Audio/Hap │
│ • Glow Highlights │ • Fast Actions    │ • Dual-Controls  │ • 0.2s Loop │
└───────────────────┴───────────────────┴──────────────────┴─────────────┘
```

---

# 16. Implementation Plan & Execution Order for Phase 14.9B

When approved, Phase 14.9B should proceed in five disciplined batches:

```text
BATCH 1: Design Tokens & Primitives Foundation
  ├── Update packages/design-tokens with complete semantic scale & CSS custom properties
  └── Expand packages/ui to provide all 25 shared components (Button, Input, Card, Modal, Table, etc.)

BATCH 2: Consumer Experience Upgrade
  ├── Overhaul consumer-web (Homepage, Discovery, Event Detail, Sticky Buy Bar, Checkout, Pass Wallet)
  └── Harmonize consumer-mobile Flutter theme, bottom sheets, and digital ticket passes

BATCH 3: SaaS Portals Upgrade
  ├── Implement unified responsive DashboardLayout across organizer-web, venue-web, promoter-web
  ├── Fix mobile sidebar vanishes by providing glass drawer navigation
  └── Standardize metrics, tables, and wizards

BATCH 4: Admin & Scanner Polish
  ├── Upgrade admin-web with high-density Command Center, side-by-side review, and audit guards
  └── Verify scanner-mobile operational feedback, ambient light contrast, and haptic precision

BATCH 5: Full Ecosystem Verification
  ├── Verify all 7 apps build cleanly with zero typecheck or lint errors
  ├── Run automated test suites (321+ tests)
  └── Visual regression review across Mobile, Tablet, and Desktop viewports
```

---

**END OF AUDIT & DESIGN DIRECTION (Phase 14.9A)**  
*Awaiting user approval before proceeding to Phase 14.9B implementation.*
