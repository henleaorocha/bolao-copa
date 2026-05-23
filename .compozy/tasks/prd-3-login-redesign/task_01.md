---
status: completed
title: Restyle LoginButton component
type: frontend
complexity: low
dependencies: []
---

# Restyle LoginButton component

## Overview

Update `components/LoginButton.tsx` to match the new dark-themed login page design. The existing Google OAuth logic and the inline Google SVG are preserved; only the `<button>` Tailwind classes and its visible label change. This task has no external dependencies and can be completed before the page shell is rewritten.

<critical>
- Read the PRD (Core Features — F3) and TechSpec ("LoginButton.tsx — Restyle only") before writing any code.
- The TechSpec specifies exact Tailwind classes for the new button — follow them precisely.
- Do NOT touch the `handleLogin` function, `signInWithOAuth` call, `redirectTo` construction, or the Google SVG paths.
- Minimize code: only the `className` string and the visible label text change.
- Tests for this task verify the new classes and label are present in the file.
</critical>

<requirements>
1. The `<button>` element MUST use the new className: `w-full bg-white text-slate-900 font-bold py-4 px-6 rounded-2xl hover:scale-[1.01] active:scale-[0.99] transition shadow-xl flex items-center justify-center gap-3`
2. The button visible label MUST change from `"Entrar com Google"` to `"Continuar com Google"`.
3. The `'use client'` directive MUST remain at the top of the file.
4. The `handleLogin` async function and its `signInWithOAuth` call MUST remain unchanged.
5. The inline Google SVG (four `<path>` elements with official Google colors) MUST remain unchanged.
6. The `aria-label` attribute MUST be preserved or updated to reflect the new label text.
</requirements>

## Subtasks

- [x] Open `components/LoginButton.tsx` and read the current implementation
- [x] Replace the `className` string on the `<button>` element with the new Tailwind classes per TechSpec "LoginButton.tsx — Restyle only"
- [x] Update the button label from `"Entrar com Google"` to `"Continuar com Google"`
- [x] Update `aria-label` to `"Continuar com Google"` to stay consistent
- [x] Verify the `'use client'` directive, OAuth logic, and Google SVG are untouched
- [x] Run `npx tsc --noEmit` to confirm no TypeScript errors

## Implementation Details

**File to modify:** `components/LoginButton.tsx`

The only changes are on two lines inside the `return` block:
- The `className` prop of `<button>` (single string replacement)
- The text node inside `<button>` (label text)

See TechSpec "Component Breakdown → LoginButton.tsx — Restyle only" for the exact before/after.

**Related ADRs:** [ADR-003: LoginButton Styling — In-place Replacement](adrs/adr-003.md)

### Relevant Files

- `components/LoginButton.tsx` — the file being modified
- `app/login/page.tsx` — imports and renders `<LoginButton />`; will use the restyled button after task_02

### Dependent Files

- `app/login/page.tsx` — (task_02) renders `<LoginButton />` inside the glassmorphism card; the button must be restyled before task_02 is considered visually complete

### Related ADRs

- [ADR-003: LoginButton Styling — In-place Replacement](adrs/adr-003.md)

## Deliverables

- `components/LoginButton.tsx` updated with new `className` and label
- No new files created
- TypeScript compilation clean (`npx tsc --noEmit` exits 0)

## Tests

### Unit Tests

- [x] File `components/LoginButton.tsx` contains the string `"Continuar com Google"` (label updated)
- [x] File `components/LoginButton.tsx` does NOT contain the string `"Entrar com Google"` (old label removed)
- [x] File `components/LoginButton.tsx` contains `rounded-2xl` (new button shape applied)
- [x] File `components/LoginButton.tsx` contains `hover:scale-[1.01]` (micro-animation applied)
- [x] File `components/LoginButton.tsx` contains `'use client'` (client directive preserved)
- [x] File `components/LoginButton.tsx` contains `signInWithOAuth` (OAuth logic preserved)

### Integration Tests

- No integration tests added — OAuth logic unchanged; existing `tests/integration/auth.test.ts` covers the flow and MUST continue to pass.

## Success Criteria

- `components/LoginButton.tsx` has the new Tailwind classes and updated label
- All unit test assertions above pass
- `npx tsc --noEmit` exits 0
- Existing `tests/integration/auth.test.ts` suite passes (run with service key)
