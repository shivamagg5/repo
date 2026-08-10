# Implementation Rules for AI Coding Agents

## 1. Source of Truth

The documentation folder is the source of truth.

Before changing architecture, an agent must inspect:

-   Build Bible
-   PRD
-   Architecture
-   Database Model
-   Permission Matrix
-   App Feature Specifications

Then inspect the actual repository.

## 2. No Silent Architecture Changes

An agent must not:

-   Replace the database without approval
-   Change authentication architecture casually
-   Add a new infrastructure provider without justification
-   Duplicate existing domain logic
-   Create competing versions of the same API

## 3. Work in Small Units

Each task should have:

``` text
Goal
Scope
Files/domains
Acceptance criteria
Tests
Known constraints
```

## 4. Database Rules

-   Use migrations
-   Never edit production manually
-   Preserve financial history
-   Add indexes intentionally
-   Review foreign-key behavior

## 5. API Rules

-   Version endpoints
-   Validate input
-   Authorize every protected operation
-   Use idempotency for critical writes
-   Never trust client totals/statuses

## 6. UI Rules

Use shared design tokens and components.

Do not create one-off visual systems unless the design system explicitly
allows it.

## 7. Security Rules

Never:

-   Commit secrets
-   Put privileged keys in frontend/mobile code
-   Bypass authorization for convenience
-   Trust scanner/client-provided ticket status
-   Trust frontend payment success

## 8. Testing Rules

Every new domain feature must include appropriate:

-   Unit tests
-   Integration tests
-   API/contract tests
-   E2E tests for critical user flows

## 9. Completion Report

Every AI agent task should end with:

``` text
Implemented:
Changed:
Tests:
Migrations:
API changes:
Security considerations:
Known limitations:
Next recommended step:
```

## 10. Conflict Resolution

If repository code conflicts with documentation:

1.  Identify conflict
2.  Do not silently choose
3.  Prefer the latest approved specification
4.  Record the decision
5.  Update documentation if architecture changes
