---
status: completed
title: Neutralize login copy (remove employer / Arkmeds.com references)
type: frontend
complexity: low
dependencies: []
---

# Task 3: Neutralize login copy (remove employer / Arkmeds.com references)

## Overview
Replace the two login-screen strings that reference a company context that no longer
applies, so a first-time user sees neutral, employer-agnostic wording. Copy-only change
with no impact on the authentication flow.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST replace the description line `"Use sua conta Google da empresa."` with `"Use sua conta Google para logar"` (`app/login/page.tsx:124`).
- MUST replace the footer badge `"SSO autenticado · Arkmeds.com"` with `"SSO autenticado"` (`app/login/page.tsx:134`).
- MUST NOT change the authentication flow, the "Continuar com Google" button, or any other surrounding markup/logic.
</requirements>

## Subtasks
- [x] 3.1 Update the description string at the known line.
- [x] 3.2 Update the footer badge string at the known line.
- [x] 3.3 Add/extend an integration assertion that the new strings render and the old ones are gone.

## Implementation Details
Two exact string replacements in `app/login/page.tsx` (lines 124 and 134 per the TechSpec
Impact Analysis). No logic, no new components, no new test ids.

### Relevant Files
- `app/login/page.tsx` — contains the two copy lines (124, 134) and the Google OAuth button.

### Dependent Files
- `tests/e2e/validation-run.spec.ts` — existing E2E that exercises login; the new copy assertion can live alongside it.

### Related ADRs
- [ADR-001: Single-batch delivery with a unified match-card pattern](../adrs/adr-001.md) — login copy ships as part of the single batch.

## Deliverables
- Updated description and footer strings in `app/login/page.tsx`.
- Integration assertion for the new copy **(REQUIRED)**.
- Unit/render coverage of the login page strings **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] Login page renders `"Use sua conta Google para logar"`.
  - [x] Login page renders the `"SSO autenticado"` badge without the `"· Arkmeds.com"` suffix.
  - [x] The old `"da empresa"` and `"Arkmeds.com"` strings are absent.
- Integration tests:
  - [x] Loading `/login` shows the new description and footer copy and still renders the Google sign-in affordance.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- The login screen shows neutral copy; no employer/Arkmeds.com references remain.
- Authentication flow is unchanged.
