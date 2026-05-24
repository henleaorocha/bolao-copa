---
status: pending
title: Create CreateLeagueModal client component
type: frontend
complexity: medium
dependencies:
  - task_01
---

# Task 2: Create CreateLeagueModal client component

## Overview

This task creates the `components/CreateLeagueModal.tsx` client component — the core deliverable of this feature. It renders both the dashed trigger card (the entry point) and the modal overlay with the league creation form. On success it navigates the user to the newly created league; on failure it shows an error toast and keeps the modal open for retry.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST be a React client component (`'use client'` directive at the top of the file).
- MUST render the dashed trigger card when the modal is closed; the entire card MUST be clickable (not just the "+" icon).
- MUST open the modal on card click and close it on "Cancelar", "×" button, or backdrop click.
- MUST default `access` to `'private'`.
- MUST show an inline validation error and NOT call `fetch` when `name` is empty or shorter than 2 characters.
- MUST disable the "Criar liga" button and show a loading indicator while the POST request is in flight.
- MUST prevent double-submission by setting `isLoading = true` synchronously before `await fetch(...)`.
- MUST call `router.push('/ligas/{id}')` on a 201 response, using the `id` from the response body.
- MUST show a toast-style error message and keep the modal open on any non-201 response.
- MUST show the prize textarea only when the prize checkbox is checked.
- MUST limit the prize textarea to 300 characters.
- SHOULD use icon names from `lucide-react`: `Plus`, `Users`, `Lock`, `Award`, `X` for the corresponding UI elements.
- SHOULD follow the visual design in `designReferences/screens-onboarding.jsx` — `CreateLeagueModal` component (lines 188–322).
</requirements>

## Subtasks

- [ ] 2.1 Define component file with `'use client'`, required imports (`useState`, `useRouter`, lucide-react icons), and all state variables (`isOpen`, `name`, `access`, `hasPrize`, `prize`, `loading`, `error`).
- [ ] 2.2 Implement the dashed trigger card — full-card click target, "+" icon, and descriptive text matching the design reference.
- [ ] 2.3 Implement the modal overlay: header with title/subtitle/close button, form body with name input, access type selector, and prize section.
- [ ] 2.4 Implement client-side validation: inline name error state checked on submit before any fetch call.
- [ ] 2.5 Implement the form submission: POST to `/api/leagues`, loading state, success navigation, error toast.
- [ ] 2.6 Write unit tests for the component covering all interaction paths.

## Implementation Details

See TechSpec "Core Interfaces" section for the `CreateLeagueFormState` shape, `CreateLeagueBody` request type, and `CreateLeagueResponse` response type.

See TechSpec "System Architecture — Component Overview" for where this component sits in the data flow.

The design reference at `designReferences/screens-onboarding.jsx` lines 188–322 is the authoritative visual spec. Key design details:
- Modal outer shape: `rounded-[36px]`, `backdrop-blur-sm` overlay
- Access type selected state: teal border + tinted background
- "Criar liga" button: yellow (`#FFC72C`) background, dark text, full-width
- "Cancelar" button: `bg-slate-100`, secondary style

The trigger card must keep `data-testid="create-league-card"` on the outermost clickable element to avoid breaking `tests/unit/ligas-page.test.tsx`.

### Relevant Files

- `designReferences/screens-onboarding.jsx` (lines 81–322) — authoritative visual and structural reference for both the trigger card and modal.
- `components/LeagueCard.tsx` — reference for existing client component patterns (fetch, useState, error handling).
- `app/ligas/[id]/page.tsx` (lines 114–224, 239–310) — reference for `ConfigureModal` and `ConfirmDialog` existing modal patterns (overlay, button styles, loading state).
- `lib/api/types.ts` — `LeagueSummary` type used to type the API response.

### Dependent Files

- `app/ligas/page.tsx` — (task_03) will import and render this component.
- `tests/unit/ligas-page.test.tsx` — (task_03) depends on `data-testid="create-league-card"` being on the trigger.

### Related ADRs

- [ADR-001: Single-Step Centered Modal for League Creation](../adrs/adr-001.md) — This component is the direct implementation of the single-step modal decision.
- [ADR-002: Self-Contained Client Component for Modal Trigger and State](../adrs/adr-002.md) — Defines the exact boundary strategy this component implements.

## Deliverables

- New file `components/CreateLeagueModal.tsx` — fully implemented client component.
- New test file `tests/unit/CreateLeagueModal.test.tsx` — unit tests for all interaction paths.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for end-to-end modal flow **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] Component renders the dashed trigger card by default (modal is closed).
  - [ ] Clicking the trigger card opens the modal.
  - [ ] Clicking "Cancelar" closes the modal without calling `fetch`.
  - [ ] Clicking "×" closes the modal without calling `fetch`.
  - [ ] Clicking the backdrop overlay closes the modal without calling `fetch`.
  - [ ] Submitting with `name = ""` shows an inline error and does NOT call `fetch`.
  - [ ] Submitting with `name = "A"` (1 char) shows an inline validation error.
  - [ ] Prize textarea is NOT rendered when `hasPrize = false`.
  - [ ] Checking the prize checkbox renders the prize textarea.
  - [ ] "Criar liga" button is disabled and shows loading indicator while fetch is in flight.
  - [ ] On mocked 201 response with `{ data: { id: 'abc123' } }`, `router.push` is called with `/ligas/abc123`.
  - [ ] On mocked non-201 response, an error message is visible and the modal remains open.
  - [ ] `access` defaults to `'private'` — "Privada" card is visually selected on open.
  - [ ] Clicking "Aberta" card updates `access` to `'open'`; only one access type card is selected at a time.
- Integration tests:
  - [ ] Full flow: open modal, fill name, select "Aberta", check prize, enter prize text, submit — POST is called with `{ name, access_type: 'open', prize_pool: '...' }`.
  - [ ] Full flow without prize: submit — POST body has `prize_pool: null`.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Modal matches the visual design in `designReferences/screens-onboarding.jsx`.
- Full card area is clickable (not just the "+" icon).
- Double-submission is prevented by disabled button state during in-flight request.
- `data-testid="create-league-card"` is present on the trigger element.
