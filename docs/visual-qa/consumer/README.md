# Visual QA Evidence: Consumer Experience (`apps/consumer-web` & `apps/consumer-mobile`)

## Audited Routes & Viewport Matrix

| Route / Screen | 320px Reflow | 375×812 (SE) | 390×844 (i14) | 430×932 (ProMax) | 768×1024 (iPad) | 1440×900 (Laptop) | 1920×1080 (Desktop) | Status | Findings / Remediation |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Homepage (`/`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | **PASS** | Hero Outfit typography scales fluidly; category pills scroll smoothly without body overflow; 16:9 EventCards maintain aspect ratio. |
| **Discovery (`/events`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | **PASS** | Filter chips adapt to wrap; search input has 44px touch target and clear button; empty state CTA verified. |
| **Event Detail (`/events/[slug]`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | **PASS** | Mobile Sticky Booking Bar displays below 1024px; smooth scroll to tickets section; performer lineup cards wrap cleanly. |
| **Checkout Hold (`/checkout`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | **PASS** | 3-step progress stepper; server 10-min countdown timer with non-aggressive reassurance; attendee session verification. |
| **Order Confirmation (`/checkout/confirmation/[id]`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | **PASS** | Auto-polling delayed-webhook handler; itemized price breakdown; immediate CTA to digital ticket wallet. |
| **Ticket Wallet (`/tickets`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | **PASS** | Tabs switch between Upcoming and Past; pass cards show live status badges and view QR actions. |
| **Digital Pass (`/tickets/[id]`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | **PASS** | Notch perforations render with zero overlap; live status freshness clock updates every second; high-contrast QR display with brightness guidance; `.ics` calendar download. |
| **Order History (`/orders`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | **PASS** | Order receipt table wraps cleanly on mobile; status badges reflect paid/pending/refunded states. |

## Accessibility & Semantic HTML Check
- **4.5:1 Body Contrast**: High contrast (`#F8FAFC` on `#090C15` = 16.8:1).
- **Focus Rings**: `2px solid #7C3AED` with `2px` offset visible across all clickable elements.
- **44px Touch Targets**: All buttons, links, and search inputs meet min 44px touch standard.
- **320px Reflow**: Zero page-level horizontal overflow under 400% zoom.
