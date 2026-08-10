# Event Ecosystem --- Scanner Offline Architecture

## 1. Goal

Allow event staff to validate tickets quickly during connectivity
problems without creating uncontrolled duplicate admissions.

## 2. Important Constraint

A fully disconnected set of devices cannot mathematically guarantee
global uniqueness of admission while simultaneously allowing
unrestricted offline acceptance.

Therefore offline mode must be a controlled operating mode.

## 3. Online Mode

Preferred:

``` text
Scan
 ↓
API
 ↓
Atomic validation/check-in
 ↓
Result
```

## 4. Offline Bootstrap

Before event operations:

1.  Scanner authenticates
2.  Device is authorized for event
3.  Scanner downloads encrypted/secured event validation dataset
4.  Dataset has expiry
5.  Device receives event/gate scope
6.  Device stores only required ticket validation information

## 5. Local Data

Minimum local data:

-   Ticket credential hash/reference
-   Ticket ID
-   Event ID
-   Access tier
-   Current status snapshot
-   Dataset version
-   Expiry
-   Local check-in records

Do not store unnecessary customer PII.

## 6. Local Check-In

When offline:

``` text
Scan
 ↓
Local credential validation
 ↓
Check local used-state
 ↓
Record scan
 ↓
Return result
 ↓
Queue sync
```

## 7. Conflict Risk

Two offline devices may accept the same ticket.

Mitigations:

-   Prefer online validation
-   Keep offline windows short
-   Assign gate/device scopes
-   Use event operational procedures
-   Reconcile frequently
-   Show offline warning prominently
-   Disable offline mode for high-risk events if necessary

## 8. Sync

Each local scan has:

``` text
sync_id
device_id
event_id
ticket_id
local_timestamp
dataset_version
result
```

Server processes sync idempotently.

## 9. Reconciliation

If a conflict is detected:

-   Preserve both device records
-   Mark conflict
-   Identify first authoritative online check-in
-   Flag operational review
-   Never silently delete evidence

## 10. Security

-   Encrypt local database
-   Use secure OS storage for keys
-   Device registration
-   Short-lived authorization
-   Remote device revocation
-   App integrity checks where supported
-   No permanent admin credentials on scanner

## 11. Device Lifecycle

``` text
REGISTERED
→ AUTHORIZED
→ ACTIVE
→ REVOKED
```

Revoked devices must stop receiving new authorization.

## 12. Operational UX

Always show:

-   ONLINE / OFFLINE
-   Event
-   Gate
-   Sync queue count
-   Last successful sync
-   Dataset expiry
-   Device identity

## 13. Scanner Performance

Optimize for:

-   Immediate camera readiness
-   Local decode
-   Minimal network round-trip
-   Very small API response
-   Large result feedback
-   Rapid next-scan readiness

## 14. Testing

Test:

-   Airplane mode
-   Intermittent network
-   App restart
-   Battery loss
-   Clock skew
-   Duplicate scans
-   Multiple devices
-   Expired bootstrap
-   Revoked device
-   Partial sync
-   Large event datasets
