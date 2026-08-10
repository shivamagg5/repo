# Event Ecosystem --- Design System

## 1. Design Direction

Position the product as:

**Modern + premium + energetic + trustworthy**

Avoid looking like a generic ticket-booking portal.

Consumer experience should feel editorial and discovery-led. Dashboards
should feel operational and data-dense without becoming cluttered.

## 2. Design Tokens

Do not hard-code visual values inside individual components. Define
tokens centrally.

### Color roles

Use semantic roles:

``` text
background
surface
surface-elevated
text-primary
text-secondary
text-muted
border
brand
brand-strong
success
warning
danger
info
```

The exact final brand palette should be approved before production UI is
frozen.

### Typography

Use a modern sans-serif family with:

-   Display
-   Heading
-   Body
-   Label
-   Caption
-   Numeric/data styles

Recommended scale:

``` text
display: 48–64
h1: 36–48
h2: 28–36
h3: 22–28
body-large: 18
body: 16
body-small: 14
caption: 12
```

Mobile typography should use a reduced scale.

## 3. Spacing

Use a 4px/8px-based spacing system.

``` text
4, 8, 12, 16, 20, 24, 32, 40, 48, 64
```

## 4. Radius

Suggested semantic tokens:

``` text
small: 8
medium: 12
large: 16
xl: 24
pill: 999
```

## 5. Components

Create shared components:

-   Button
-   IconButton
-   Input
-   Select
-   SearchBox
-   Checkbox
-   Radio
-   Toggle
-   Tabs
-   Badge
-   Avatar
-   Card
-   EventCard
-   TicketCard
-   Modal
-   Drawer
-   Toast
-   Tooltip
-   Dropdown
-   DatePicker
-   Table
-   Pagination
-   EmptyState
-   ErrorState
-   Skeleton
-   StatCard
-   ChartCard
-   QR display
-   ConfirmationDialog

## 6. Consumer UI

Priorities:

1.  Visual event discovery
2.  Strong imagery
3.  Fast scanning of information
4.  Clear ticket prices
5.  Strong CTA
6.  Trust indicators
7.  Minimal checkout friction

Event cards should communicate:

-   Image
-   Date
-   Event name
-   Venue
-   City
-   Starting price
-   Category

## 7. Event Page

Above the fold:

-   Hero media
-   Event title
-   Date/time
-   Venue
-   Price/CTA

Below:

-   About
-   Lineup
-   Venue
-   Ticket options
-   Policies
-   Organizer

## 8. Checkout

Checkout should be linear:

``` text
Tickets → Details → Payment → Confirmation
```

Avoid unnecessary fields.

## 9. Dashboard UI

Use:

-   Left navigation
-   Top context bar
-   Breadcrumbs where useful
-   Data tables
-   Filters
-   Bulk actions
-   Charts
-   Status badges
-   Responsive layouts

## 10. Scanner UI

Scanner is an operational tool, not a marketing UI.

Priorities:

-   Camera opens quickly
-   Large scan area
-   Immediate result
-   Very clear success/error state
-   Haptic/audio feedback
-   Minimal navigation
-   Offline status visible

## 11. Accessibility

Target WCAG 2.2 AA where practical.

Minimum:

-   Keyboard navigation
-   Visible focus
-   Accessible labels
-   Sufficient contrast
-   Touch targets
-   Screen-reader semantics
-   Reduced-motion support

## 12. Responsive Breakpoints

Use logical breakpoints rather than designing separate unrelated
layouts.

Suggested:

``` text
mobile: < 640
tablet: 640–1023
desktop: 1024+
wide: 1440+
```

## 13. Motion

Use motion to communicate:

-   Navigation
-   State change
-   Confirmation
-   Loading

Do not animate critical scanner feedback in a way that delays the
result.

## 14. Brand Consistency

All products share:

-   Logo rules
-   Typography
-   Icon language
-   Color semantics
-   Spacing
-   Status colors
-   Voice

Admin may be denser but must remain recognizably part of the same
platform.
