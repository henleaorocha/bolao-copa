---
status: completed
title: Operator result control — endpoint + unlisted page + guard
type: backend
complexity: medium
dependencies:
  - task_05
---

# Task 7: Operator result control — endpoint + unlisted page + guard

## Overview
The operator needs to enter or correct any match result so scoring is never blocked on the free source, restricted to two named accounts via an unlisted URL with no participant-facing link. This task adds a shared email-gate guard, a `PATCH` result endpoint that sets/releases manual control, and an unlisted server-rendered operator page.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- A shared `lib/operator.ts` MUST export `OPERATOR_EMAILS` (the two named accounts) and `requireOperator()` returning `{ ok: true }` or `{ ok: false; status: 401 | 403 }` based on the authenticated Supabase session.
- `PATCH /api/admin/matches/[id]/result` MUST be email-gated and accept `{ home_score, away_score, status, release? }`.
- On `release: true` the match MUST be set `is_manual = false` (returned to automatic control); otherwise it MUST set scores/status, `is_manual = true`, `manual_updated_at = now()`.
- Body validation MUST reuse the predictions route's 0–99 integer rule; invalid body → 400, no match → 404, gate failures → 401/403, success → 200 with the updated row.
- An unlisted server-rendered page `app/(operator)/controle-resultados` MUST be gated by the SAME guard and MUST NOT be linked from any participant UI.
- The endpoint MUST log `operator_result_set` / `operator_result_released` with `match_id`, `set_by`, `status_code`.
</requirements>

## Subtasks
- [x] 7.1 Create `lib/operator.ts` with `OPERATOR_EMAILS` + `requireOperator()`.
- [x] 7.2 Implement `PATCH /api/admin/matches/[id]/result` (set vs release, validation, 200/400/401/403/404).
- [x] 7.3 Add structured `operator_result_set`/`operator_result_released` logs.
- [x] 7.4 Create the unlisted `app/(operator)/controle-resultados` page behind the guard.
- [x] 7.5 Write unit tests for the guard, endpoint branches, and page gating.

## Implementation Details
Create `lib/operator.ts`, `app/api/admin/matches/[id]/result/route.ts`, and `app/(operator)/controle-resultados/page.tsx`. The guard reads the authenticated session via `getSupabaseServerClient()` (same pattern as the bracket route). Reuse the 0–99 integer validation from `app/api/leagues/[id]/predictions/[matchId]/route.ts` (`MAX_SCORE = 99`). Writes use the service-role client or an RLS-permitted path consistent with existing admin writes. Reference TechSpec "API Endpoints", the `requireOperator` interface, and ADR-008.

### Relevant Files
- `lib/operator.ts` — new shared guard (the deliverable).
- `app/api/admin/matches/[id]/result/route.ts` — new PATCH endpoint.
- `app/(operator)/controle-resultados/page.tsx` — new unlisted gated page.
- `app/api/leagues/[id]/predictions/[matchId]/route.ts` — source of the 0–99 validation to reuse.
- `lib/supabase/client.ts` — server client for the session check.
- `app/api/leagues/[id]/bracket/route.ts` — reference for session/auth + structured logging style.

### Dependent Files
- `matches` table — `is_manual`/`manual_updated_at` written here (task_05).
- `app/api/admin/sync-matches/route.ts` (task_06) — honors the `is_manual` set by this endpoint.
- Validation harness (task_09) — exercises the operator override flow.

### Related ADRs
- [ADR-008: is_manual columns + unlisted gated page/API](adrs/adr-008.md) — named-account gate on BOTH page and API via a shared guard.
- [ADR-004: Manual result entry locks a match from automatic overwrite](adrs/adr-004.md) — set/edit/release semantics.

## Deliverables
- `lib/operator.ts` guard, `PATCH .../result` endpoint, and unlisted operator page.
- Structured operator logs.
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests
- Unit tests:
  - [x] `requireOperator()` returns ok for an allowed email; `403` for an authed non-operator; `401` for no session.
  - [x] PATCH with allowed email + valid body sets scores/status, `is_manual = true`, `manual_updated_at` set → 200 with updated row.
  - [x] PATCH with `release: true` sets `is_manual = false`.
  - [x] PATCH with a non-operator email → 403; no session → 401.
  - [x] Invalid body (e.g. `home_score: 100` or non-integer) → 400.
  - [x] Unknown match id → 404.
  - [x] Logs `operator_result_set` / `operator_result_released` with `match_id`, `set_by`, `status_code`.
- Integration tests:
  - [x] The unlisted page renders for an operator session and is refused (redirect/forbidden) for a non-operator.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Only the two named accounts can set/release a result, on both page and API
- A set result marks the match manual; release returns it to automatic control
