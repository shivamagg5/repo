# Event Ecosystem --- Role & Permission Matrix

## 1. Permission Model

Permissions use:

``` text
domain.action
```

Examples:

``` text
event.create
event.publish
ticket.refund
finance.view
settlement.approve
user.suspend
```

Authorization requires both:

1.  Permission
2.  Resource scope

## 2. Customer

  Capability                Access
  ------------------------- --------
  Manage own profile        Yes
  Browse events             Yes
  Purchase tickets          Yes
  View own tickets          Yes
  Request eligible refund   Yes
  Manage favorites          Yes
  Create events             No
  Scan tickets              No
  View finance              No

## 3. Organizer Owner

  Capability              Access
  ----------------------- -------------------
  Organization settings   Full
  Manage organizer team   Full
  Create events           Full
  Publish events          Full
  Ticket configuration    Full
  Guest lists             Full
  Sales analytics         Full
  Refunds                 Policy controlled
  Settlement reports      Full
  Promoters               Full
  Venue requests          Full
  Delete organization     Restricted

## 4. Organizer Manager

-   Events: create/edit/publish if assigned
-   Tickets: manage
-   Guest lists: manage
-   Analytics: view
-   Team: limited
-   Finance: view
-   Refunds: only if explicitly granted

## 5. Organizer Staff

-   Assigned event access
-   Guest list operations
-   Event information
-   Limited sales/attendance view
-   No settlement approval
-   No organization administration

## 6. Venue Owner

-   Venue profile: full
-   Venue availability: full
-   Event approvals: full
-   Venue team: full
-   Venue analytics: full
-   Settlement view: full
-   Platform-wide finance: no

## 7. Venue Manager

-   Venue operations
-   Calendar
-   Event coordination
-   Staff management if permitted
-   No owner-level financial controls

## 8. Venue Staff

-   View assigned events
-   Operational checklists
-   Attendance visibility where permitted
-   No financial administration

## 9. Promoter

-   View assigned campaigns
-   Create/use referral links where permitted
-   View attributed sales
-   View commission earnings
-   No customer financial data beyond necessary attribution
-   No event editing unless explicitly granted

## 10. Scanner Staff

-   Login
-   View assigned events
-   Select gate
-   Scan
-   Manual ticket lookup
-   View validation result
-   View event attendance count
-   No ticket refund
-   No customer profile administration
-   No financial access

## 11. Support Agent

-   Search users
-   View relevant orders/tickets
-   Manage support cases
-   Initiate eligible operational actions
-   No unrestricted financial settlement access
-   No role administration

## 12. Content Admin

-   CMS
-   Event featuring
-   Banners
-   Collections
-   Editorial content
-   No settlement approval
-   No security administration

## 13. Finance Admin

-   Payments
-   Refunds
-   Financial reports
-   Reconciliation
-   Settlement preparation
-   Settlement review
-   No role administration

## 14. Operations Admin

-   Users
-   Organizers
-   Venues
-   Events
-   Moderation
-   Support
-   Event approval
-   Suspension
-   Limited finance visibility

## 15. Super Admin

Full platform control, including:

-   Roles/permissions
-   Platform configuration
-   Organizations
-   Users
-   Events
-   Tickets
-   Finance
-   CMS
-   Security
-   Audit logs

Super Admin actions must be heavily audited.

## 16. Sensitive Actions

Require stronger controls for:

-   Settlement approval
-   Large refunds
-   Organization suspension
-   User suspension
-   Permission changes
-   Payment configuration
-   Production configuration
-   Deleting/voiding tickets

Possible controls:

-   MFA
-   Re-authentication
-   Dual approval
-   Audit event
-   Reason field

## 17. Principle

Never authorize based only on:

``` text
role === "admin"
```

Use explicit permissions and resource scope.
