---
status: completed
title: "Build `LeagueWelcomeModal` component (4-screen wizard)"
type: frontend
complexity: high
dependencies:
  - task_02
  - task_04
---

# Task 5: Build `LeagueWelcomeModal` component (4-screen wizard)

## Overview

Creates `components/LeagueWelcomeModal.tsx`, a self-contained 4-screen wizard modal that guides a user through the league onboarding flow: How it works → Time rules → Scoring → Invite friends. The component fires `PATCH /api/leagues/{id}/me` on mount to mark the user as onboarded, manages its own step state, renders context-aware copy on Screen 4 based on the user's role, and provides copy-link and WhatsApp share options.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST implement all four screens as described in PRD "Core Features — F1" with exact copy, icons, labels, and CTA labels
- MUST render a progress indicator (4 dots, active dot highlighted in yellow `#FFC72C`, inactive in muted grey)
- MUST call `PATCH /api/leagues/{id}/me` exactly once on component mount (not on each screen change)
- MUST construct share URL as `${process.env.NEXT_PUBLIC_SITE_URL}/join?token=${inviteToken}`
- MUST construct WhatsApp link as `https://wa.me/?text=${encodeURIComponent(message)}` where message contains the invite URL
- MUST show creator body copy on Screen 4 when `role === 'admin'`; joiner copy when `role === 'member'`
- MUST call `onComplete()` when the user clicks "Pronto, bora jogar!" on Screen 4
- MUST NOT be dismissible by clicking the backdrop
- MUST NOT show a "Voltar" button on Screen 1
- MUST follow the visual design from `designReferences/` — two-zone layout (gradient top + white bottom), yellow pill CTAs, `rounded-[36px]` outer container matching `CreateLeagueModal` style
- SHOULD handle `navigator.clipboard.writeText` failure gracefully (fallback or silent catch)
</requirements>

## Subtasks

- [x] 5.1 Create `components/LeagueWelcomeModal.tsx` with step state (`useState<1|2|3|4>`)
- [x] 5.2 Implement progress indicator (4 dots row, index-driven highlight)
- [x] 5.3 Implement Screen 1 (Como funciona) with spark icon, headline, body, and "Próximo" CTA
- [x] 5.4 Implement Screen 2 (Regras de tempo) with clock icon, headline, body, "Voltar" + "Próximo"
- [x] 5.5 Implement Screen 3 (Pontuação) with target icon, scoring table (5 rows + footer note), "Voltar" + "Convidar amigos"
- [x] 5.6 Implement Screen 4 (Convide agora) with share icon, context-aware body, copy-link input + button, WhatsApp button, "Voltar" + "Pronto, bora jogar!"
- [x] 5.7 Fire `PATCH /api/leagues/{id}/me` in `useEffect([], [])` (once on mount)
- [x] 5.8 Wire backdrop overlay (non-dismissible: no `onClick` on backdrop)
- [x] 5.9 Write unit tests covering navigation, Screen 4 copy variants, share actions, and PATCH call

## Implementation Details

See TechSpec "Core Interfaces" section for the `LeagueWelcomeModalProps` interface and "System Architecture" for the component's position in the tree.

**Visual design reference:** `designReferences/screens-extras.jsx` and the four screenshot images in the PRD. The gradient top zone uses teal-to-green (`from-[#0097A9] to-[#4CAF82]` or similar — verify exact stops against screenshots). No gradient exists in the codebase yet; this component introduces it.

**Icon approach:** Use Lucide icons already installed in the project:
- Screen 1: `Sparkles` (spark/lightning)
- Screen 2: `Clock`
- Screen 3: `Target` (or `CircleDot`)
- Screen 4: `Share` (or `Upload`)

Each icon sits inside a `bg-yellow-400 rounded-2xl` container (yellow rounded square pattern matching `CreateLeagueModal`'s icon treatment).

**Copy-link button:** Use `navigator.clipboard.writeText(url).catch(() => {})`. Show "Copiado!" text for 2 seconds via `useState<boolean>` + `setTimeout`.

**WhatsApp message:** `"Oi! Entra na minha liga do Bolão da Copa — vamos disputar juntos 🏆 {url}"` — open via `window.open(href, '_blank')`.

**PATCH on mount:**
```typescript
useEffect(() => {
  fetch(`/api/leagues/${leagueId}/me`, { method: 'PATCH' })
}, [leagueId])
```
Fire-and-forget; don't block the UI on this call.

### Relevant Files

- `components/CreateLeagueModal.tsx` — modal styling reference: `rounded-[36px]`, `shadow-2xl`, `backdrop-blur-sm`, overlay color `rgba(36,76,90,0.8)`
- `app/ligas/[id]/page.tsx` lines 114–310 — `ConfigureModal` and `ConfirmDialog` patterns for inner dialog structure
- `designReferences/screens-extras.jsx` — design specification for all 4 screens
- `lib/api/types.ts` — `LeagueDetail` (for props typing reference)

### Dependent Files

- `app/ligas/[id]/page.tsx` — imports and renders `<LeagueWelcomeModal>` (task_06)
- `tests/unit/LeagueWelcomeModal.test.tsx` — new test file to create in this task

### Related ADRs

- [ADR-001: Per-League Welcome Onboarding Flow](../adrs/adr-001.md) — per-league trigger, `onboarded_at` set on Screen 1 open
- [ADR-002: Extend LeagueDetail API Response](../adrs/adr-002.md) — `invite_token` received as prop comes from the GET response added in task_03

## Deliverables

- `components/LeagueWelcomeModal.tsx` — fully implemented 4-screen wizard
- `tests/unit/LeagueWelcomeModal.test.tsx` — unit tests with 80%+ coverage **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] Screen 1 renders on mount with "Próximo" button and no "Voltar" button
  - [ ] Clicking "Próximo" on Screen 1 renders Screen 2 (progress dot index = 1)
  - [ ] Clicking "Voltar" on Screen 2 renders Screen 1
  - [ ] Clicking "Próximo" on Screen 2 renders Screen 3
  - [ ] Screen 3 renders the scoring table with 5 rows and the footer note
  - [ ] Clicking "Convidar amigos" on Screen 3 renders Screen 4
  - [ ] Screen 4 with `role="admin"` renders "Sua liga foi criada!" in body copy
  - [ ] Screen 4 with `role="member"` renders "Você entrou em" in body copy
  - [ ] "Copiar" button calls `navigator.clipboard.writeText` with `{SITE_URL}/join?token={inviteToken}`
  - [ ] After "Copiar" is clicked, button text changes to "Copiado!"
  - [ ] WhatsApp anchor `href` contains `wa.me/?text=` with the encoded invite URL
  - [ ] "Pronto, bora jogar!" button calls `onComplete()`
  - [ ] `PATCH /api/leagues/{id}/me` is called exactly once on component mount
  - [ ] Backdrop click does NOT call `onComplete()` and does NOT unmount the modal
- Integration tests:
  - [ ] N/A at component level — covered by page integration in task_06
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- All 4 screens render correctly with exact copy from PRD
- Progress indicator updates on each screen change
- Screen 4 shows correct body copy for both `admin` and `member` roles
- Copy-link and WhatsApp share links are correctly formed
- `PATCH /api/leagues/{id}/me` is called once on mount
- `onComplete()` is called after "Pronto, bora jogar!" CTA
- Visual design matches the reference screenshots (two-zone gradient layout, yellow CTAs, rounded modal)
