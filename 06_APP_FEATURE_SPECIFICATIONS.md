# Event Ecosystem --- App-by-App Feature Specifications

## 1. Consumer Website

### Navigation

-   Home
-   Discover
-   Categories
-   Search
-   Locations
-   Favorites
-   My Tickets
-   Profile

### Home

-   Hero/featured events
-   Trending
-   Nearby
-   This weekend
-   Categories
-   Recommended
-   Editorial collections

### Search

-   Keyword search
-   City/location
-   Date
-   Category
-   Price
-   Sort

### Event Page

-   Media gallery
-   Event information
-   Date/time
-   Venue
-   Map
-   Organizer
-   Ticket tiers
-   Quantity
-   Availability
-   Terms
-   Share
-   Favorite

### Checkout

-   Cart/order summary
-   Promo
-   Customer information
-   Payment
-   Confirmation

### My Tickets

-   Upcoming
-   Past
-   Ticket detail
-   QR
-   Order information
-   Add to calendar
-   Share

### Account

-   Profile
-   Preferences
-   Notifications
-   Orders
-   Refund requests
-   Security

------------------------------------------------------------------------

## 2. Consumer Flutter App

Mirror the consumer website's core capabilities.

### Mobile-specific

-   Push notifications
-   Deep links
-   Native share
-   Calendar integration
-   Location permissions
-   Biometric unlock for sensitive local ticket display where
    appropriate
-   Offline access to already-issued tickets

### Performance

-   Fast startup
-   Cached home/discovery
-   Image optimization
-   Pagination
-   Skeleton states

------------------------------------------------------------------------

## 3. Organizer Dashboard

### Dashboard

-   Revenue
-   Tickets sold
-   Orders
-   Attendance
-   Conversion
-   Top ticket types
-   Event performance

### Events

-   Create
-   Draft
-   Submit
-   Edit
-   Publish
-   Duplicate event
-   Cancel event
-   Event media
-   Lineup

### Ticketing

-   Ticket types
-   Price
-   Quantity
-   Sale windows
-   Limits
-   Promo codes
-   Complimentary tickets

### Orders

-   Search
-   View
-   Refund where authorized
-   Resend ticket
-   Export

### Guest List

-   Add
-   Import
-   Assign access
-   Check-in status
-   Notes

### Team

-   Invite staff
-   Assign roles
-   Event-scoped access

### Analytics

-   Sales over time
-   Ticket mix
-   Revenue
-   Attendance
-   Promoter performance

### Finance

-   Transactions
-   Expected settlement
-   Paid settlements
-   Statements

------------------------------------------------------------------------

## 4. Venue Dashboard

### Dashboard

-   Upcoming events
-   Calendar
-   Venue utilization
-   Revenue
-   Pending requests

### Venue Profile

-   Details
-   Capacity
-   Amenities
-   Photos
-   Address/map

### Calendar

-   Availability
-   Booked dates
-   Holds
-   Event requests

### Event Coordination

-   Accept/reject request
-   Event details
-   Organizer contacts
-   Operational notes

### Staff

-   Invite
-   Assign
-   Revoke
-   Event access

### Finance

-   Revenue
-   Commission
-   Settlement history

------------------------------------------------------------------------

## 5. Promoter Dashboard

### Dashboard

-   Clicks
-   Registrations
-   Tickets sold
-   Gross sales
-   Commission
-   Conversion

### Campaigns

-   Assigned events
-   Referral link
-   Referral code
-   Commission terms

### Performance

-   Event comparison
-   Daily/weekly sales
-   Conversion
-   Top campaigns

### Earnings

-   Pending
-   Approved
-   Paid
-   Statements

------------------------------------------------------------------------

## 6. Scanner Flutter App

### Login

-   Staff authentication
-   Device registration
-   Event permissions

### Event Selection

-   Assigned events
-   Event status
-   Gate selection

### Scanner

-   Camera
-   QR recognition
-   Fast validation
-   Haptic/audio feedback

### Result states

SUCCESS: - Valid - Ticket tier - Attendee name if policy allows -
Check-in timestamp

FAIL: - Invalid - Already used - Wrong event - Refunded - Cancelled -
Expired - Access denied

### Manual Lookup

Search by: - Ticket number - Order ID - Customer phone/email where
permitted - Name where permitted

### Offline

-   Download authorized validation data
-   Queue scans
-   Display sync state
-   Reconcile when online

### Operations

-   Gate status
-   Attendance count
-   Sync health
-   Device status

------------------------------------------------------------------------

## 7. Admin/HQ Panel

### Command Center

-   GMV
-   Orders
-   Users
-   Events
-   Organizers
-   Venues
-   Check-ins
-   Refunds
-   Settlements
-   System health

### User Management

-   Search
-   View
-   Suspend
-   Restore
-   Session controls

### Organizer Management

-   Review
-   Approve
-   Suspend
-   View events
-   View financial summary

### Venue Management

-   Approve
-   Review
-   Suspend
-   View calendar/events

### Event Moderation

-   Pending approval
-   Review
-   Approve
-   Reject
-   Suspend
-   Feature

### Ticket/Order Operations

-   Search
-   Inspect
-   Void under strict permission
-   Refund under strict permission
-   Audit

### Finance

-   Payments
-   Refunds
-   Reconciliation
-   Settlements
-   Commission
-   Exports

### CMS

-   Banners
-   Collections
-   Featured events
-   Categories
-   Pages

### Support

-   Ticket queue
-   User/order context
-   Internal notes
-   Assignment
-   SLA tracking

### Security

-   Roles
-   Permissions
-   Audit
-   Sessions
-   Risk flags

------------------------------------------------------------------------

## 8. Shared UX Rules

All applications must provide:

-   Loading states
-   Empty states
-   Error states
-   Retry actions
-   Confirmation dialogs for destructive actions
-   Consistent typography
-   Consistent spacing
-   Accessible controls
-   Responsive layouts
-   Clear success/failure feedback

## 9. Design System

Create one central design system containing:

-   Color tokens
-   Typography
-   Spacing
-   Radius
-   Shadows
-   Icons
-   Buttons
-   Inputs
-   Cards
-   Modals
-   Tables
-   Tabs
-   Toasts
-   Status badges
-   Skeleton loaders

Do not let individual apps invent unrelated UI systems.

## 10. Deep Linking

Examples:

``` text
/event/{eventSlug}
/ticket/{ticketId}
/order/{orderId}
/venue/{venueSlug}
/organizer/{organizerSlug}
```

Mobile deep links should open the appropriate app screen when installed.

## 11. Analytics

Each app must send structured analytics with:

-   event name
-   timestamp
-   anonymous/session ID
-   user ID when authenticated
-   platform
-   app version
-   relevant entity ID

Never send unnecessary sensitive personal information.

## 12. Release Strategy

### MVP

Consumer: - Discovery - Event details - Authentication - Checkout -
Tickets

Organizer: - Event creation - Ticketing - Sales

Scanner: - Login - Event selection - QR validation - Check-in

Admin: - Users - Events - Organizers - Orders - Basic finance

### V1

Add: - Venue dashboard - Promoters - Advanced analytics - CMS - Refund
workflows - Settlement workflows - Notifications

### V2

Add: - Personalized discovery - Advanced promoter tools - Advanced venue
operations - Fraud intelligence - Dynamic pricing - Rich
recommendations - More event formats
