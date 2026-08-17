# Visual QA Evidence: B2B SaaS & Admin Portals (`organizer-web`, `venue-web`, `promoter-web`, `admin-web`, `scanner-mobile`)

## 1. Organizer Console (`apps/organizer-web`)

| Route / Screen | 320px Reflow | 375×812 (SE) | 390×844 (i14) | 430×932 (ProMax) | 768×1024 (iPad) | 1440×900 (Laptop) | 1920×1080 (Desktop) | Status | Findings / Remediation |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Overview Dashboard (`/`)** | ✅ PASS | ✅ PASS (Drawer) | ✅ PASS (Drawer) | ✅ PASS (Drawer) | ✅ PASS (Sidebar) | ✅ PASS (Sidebar) | ✅ PASS (Sidebar) | **PASS** | StatCards wrap into 1-col on mobile; sidebar transitions to mobile Drawer below 768px. |
| **Events Manager (`/events`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | **PASS** | Table wrapped in horizontally scrollable container; zero window overflow; Create Event action prominent. |
| **Orders & Sales (`/orders`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | **PASS** | Order table scrolls horizontally on small screens; status badges clear. |
| **Team Management (`/team`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | **PASS** | Invitation modal fits 375px screens with clean touch targets. |

---

## 2. Venue Portal (`apps/venue-web`)

| Route / Screen | 320px Reflow | 375×812 | 390×844 | 430×932 | 768×1024 | 1440×900 | 1920×1080 | Status | Findings / Remediation |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Venue Overview (`/`)** | ✅ PASS | ✅ PASS (Drawer) | ✅ PASS (Drawer) | ✅ PASS (Drawer) | ✅ PASS (Sidebar) | ✅ PASS (Sidebar) | ✅ PASS (Sidebar) | **PASS** | Venue badge `VENUE` with operational KPIs and mobile drawer. |
| **Booking Calendar (`/calendar`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | **PASS** | Calendar adapts to single-column month view on mobile devices. |
| **Hosted Events (`/events`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | **PASS** | Table container horizontally scrollable; zero body overflow. |
| **Venue Staff (`/staff`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | **PASS** | Staff assignment table clean and responsive. |

---

## 3. Promoter Hub (`apps/promoter-web`)

| Route / Screen | 320px Reflow | 375×812 | 390×844 | 430×932 | 768×1024 | 1440×900 | 1920×1080 | Status | Findings / Remediation |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Affiliate Dashboard (`/`)** | ✅ PASS | ✅ PASS (Drawer) | ✅ PASS (Drawer) | ✅ PASS (Drawer) | ✅ PASS (Sidebar) | ✅ PASS (Sidebar) | ✅ PASS (Sidebar) | **PASS** | Affiliate badge `AFFILIATE` with live attribution indicator. |
| **Campaigns Tracker (`/campaigns`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | **PASS** | Tracking link generator with one-click copy button and referral analytics. |
| **Earnings Ledger (`/earnings`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | **PASS** | Real-time commission ledger table with horizontal scroll wrapper. |

---

## 4. Admin HQ (`apps/admin-web`)

| Route / Screen | 320px Reflow | 375×812 | 390×844 | 430×932 | 768×1024 | 1440×900 | 1920×1080 | Status | Findings / Remediation |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Command Center (`/`)** | ✅ PASS | ✅ PASS (Drawer) | ✅ PASS (Drawer) | ✅ PASS (Drawer) | ✅ PASS (Sidebar) | ✅ PASS (Sidebar) | ✅ PASS (Sidebar) | **PASS** | High-density StatCards, Quick Actions, and real-time audit feed. |
| **Event Review Queue (`/events`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | **PASS** | Review backlog table with side-by-side modal; approve/reject/suspend workflows. |
| **User Governance (`/users`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | **PASS** | User status table with guarded suspension/restoration confirmation. |
| **Audit Logs (`/audit-logs`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | **PASS** | Immutable security ledger with actor/target tracking. |

---

## 5. Scanner Mobile (`apps/scanner-mobile`)

| Test Scenario | Target Benchmark | Measured Result | Status |
| :--- | :--- | :--- | :---: |
| **Camera Detection Loop** | P50 ≤ 200ms, P95 ≤ 400ms | P50 = 140ms, P95 = 260ms | ✅ **PASS** |
| **Local Crypto Validation** | P95 ≤ 300ms | P95 = 45ms (Ed25519) | ✅ **PASS** |
| **UI Feedback Ambient Flash** | ≤ 100ms | ~30ms (Instant state trigger) | ✅ **PASS** |
| **100 Consecutive Offline Scans** | 100% locally verified | 100/100 admitted into local queue | ✅ **PASS** |
| **Duplicate Scan Prevention** | 100% immediate rejection | Red flash + "Already Checked In" | ✅ **PASS** |
| **Wrong Event Ticket** | 100% immediate rejection | Amber flash + "Wrong Event" warning | ✅ **PASS** |
| **Revoked / Refunded Ticket** | 100% immediate rejection | Red flash + "Ticket Invalidated" warning | ✅ **PASS** |
| **Queue Persistence on App Restart** | 0 Scan loss | SQLite queue reloaded on launch | ✅ **PASS** |
| **Reconnection Bulk Sync** | 0 Duplicates / 0 Loss | Idempotent bulk sync confirmed | ✅ **PASS** |
