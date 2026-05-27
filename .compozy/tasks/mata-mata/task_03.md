---
status: completed
title: "Mata-mata screen (desktop + mobile)"
type: frontend
complexity: high
dependencies:
  - task_02
---

# Task 03: Mata-mata screen (desktop + mobile)

## Overview

Build the `Chaveamento` knockout screen as a pure renderer of the `/bracket` payload: the section header, the pre-launch status banner, a 6-phase selector, and per-phase match cards showing slot state, teams/placeholders, date window, and multiplier. The screen is responsive (desktop bracket layout + mobile single-column, no horizontal scroll, shared bottom tab bar visible) and lets members place a score prediction on `open` matches by reusing the existing palpites prediction interaction and `PUT` endpoint.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST render at `app/ligas/[id]/mata-mata/` consuming `GET /api/leagues/[id]/bracket` (task_02) as the sole data source; no client-side merge or state derivation.
- MUST show the header per PRD F1: label "ELIMINATÓRIAS · 6 FASES", title "Chaveamento", subtitle "A partir das eliminatórias, cada palpite vale mais pontos".
- MUST show the pre-launch status banner: "Mata-mata começa em 28 de junho — Os confrontos são definidos após a fase de grupos. Você poderá palpitar conforme cada fase libera."
- MUST render the 6-phase selector with multiplier + game count per phase (32 avos 1.5×·16, Oitavas 2×·8, Quartas 2.5×·4, Semifinal 3×·2, 3º Lugar 3.5×·1, Final 4×·1); default to "32 avos".
- MUST render match cards showing match label, slot `state`, both slots (placeholder label OR real team + flag), the date window, and the phase multiplier badge.
- MUST let members place/edit a score prediction on `open` matches, reusing the existing group-stage palpites interaction and the existing `PUT /predictions/[matchId]`; `placeholder`/`locked`/`finished` slots are NOT bettable and clearly marked.
- MUST be responsive: phase selector as a horizontal chip row on mobile, cards stacked single-column, NO horizontal page scroll, and the shared bottom tab bar remains visible (per project mobile rules).
- Phase tabs/chips MUST be keyboard- and screen-reader-navigable with a clear active state; states must be distinguishable beyond color (label/text).
</requirements>

## Subtasks
- [x] 3.1 Create `app/ligas/[id]/mata-mata/page.tsx` and a data hook/fetch for `/bracket`.
- [x] 3.2 Build the header + pre-launch status banner.
- [x] 3.3 Build the phase selector (tabs on desktop, chip row on mobile) with active state and accessibility.
- [x] 3.4 Build the match card rendering all four slot states (placeholder / open / locked / finished), teams/flags, date window, multiplier badge.
- [x] 3.5 Wire the prediction interaction for `open` matches via the existing palpites component + `PUT`.
- [x] 3.6 Implement responsive desktop/mobile layouts and verify no horizontal scroll with the bottom bar visible.
- [x] 3.7 Add component/render tests for state rendering and bettability gating.

## Implementation Details

New screen under `app/ligas/[id]/mata-mata/`. Follow the structure and responsive patterns of the existing Tabela (`app/ligas/[id]/tabela/page.tsx`) and Palpites (`app/ligas/[id]/palpites/page.tsx`) screens — the TechSpec says mobile treatment should be consistent with Tabela. Reuse the league layout (`app/ligas/[id]/layout.tsx`, which already provides the sidebar + fixed bottom bar with `pb-24`). For the prediction interaction, reuse the existing palpites prediction form/component and the existing `PUT /api/leagues/[id]/predictions/[matchId]` — do not build a new write path. Phase label/multiplier wording should stay consistent with `BetHero.tsx` and `ScoringSchemeCard.tsx`. Bettability is driven entirely by the server-provided slot `state` (only `open` is bettable). The mobile no-horizontal-scroll + visible-bottom-bar rules are fixed project rules — verify manually.

### Relevant Files
- `app/ligas/[id]/mata-mata/page.tsx` — new screen entry (this task).
- `app/ligas/[id]/mata-mata/components/*` — new status banner, phase selector, match card components (this task).
- `app/api/leagues/[id]/bracket/route.ts` — the payload source (task_02).
- `app/ligas/[id]/tabela/page.tsx` — responsive screen pattern to mirror (header, single-column mobile).
- `app/ligas/[id]/palpites/page.tsx` — existing prediction interaction + matches fetch to reuse.
- `app/ligas/[id]/layout.tsx` — league layout providing sidebar + fixed bottom tab bar (`pb-24`).
- `app/ligas/[id]/components/BetHero.tsx` — Portuguese phase-label mapping for consistency.
- `app/ligas/[id]/components/ScoringSchemeCard.tsx` — documented multiplier wording.
- `app/ligas/[id]/league-panel-context.tsx` — `useLeaguePanel()` / `refetchLeague()` shared state pattern.

### Dependent Files
- `app/ligas/[id]/components/PainelSidebar.tsx` (task_04) — links to this route once enabled.
- `app/ligas/[id]/components/BottomTabBar.tsx` (task_04) — links to this route once enabled.
- Phase-unlock banner placement (task_06) — extends this screen.

### Related ADRs
- [ADR-002: Standard Per-Phase Betting Model](../adrs/adr-002.md) — everyone bets the same real confirmed matchups; `open` gates betting.
- [ADR-004: Bracket Skeleton as Static Code + Slot Mapping via Official Calendar](../adrs/adr-004.md) — placeholder slots are unbettable by construction.
- [ADR-006: Dedicated /bracket Endpoint with Derived Phase-Unlock Indicator](../adrs/adr-006.md) — screen is a pure renderer of the single endpoint.

## Deliverables
- `app/ligas/[id]/mata-mata/page.tsx` + status banner, phase selector, and match card components.
- Prediction interaction wired for `open` matches via the existing `PUT`.
- Responsive desktop + mobile layouts (no horizontal scroll; bottom bar visible).
- Unit/component tests with 80%+ coverage of testable render logic **(REQUIRED)**.
- Manual mobile verification notes **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] Match card renders placeholder labels when `state='placeholder'` and shows no bet affordance.
  - [x] Match card renders real teams + flags and an editable prediction input when `state='open'`.
  - [x] Match card renders read-only (no input) when `state='locked'` and shows scores when `state='finished'`.
  - [x] Phase selector defaults to "32 avos", switches visible phase on selection, and exposes an accessible active state.
  - [x] Header + pre-launch status banner render the exact PRD copy.
- Integration tests:
  - [x] Submitting a prediction on an `open` match calls `PUT /predictions/[matchId]` and reflects the saved value.
- Manual verification:
  - [x] Mobile (≤414px): layout uses `px-4`, `overflow-x-hidden` on parent main, `pb-24` bottom padding, chip row scrolls internally via `overflow-x-auto`. Bottom tab bar visible via layout's `flex lg:hidden` BottomTabBar.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Screen matches the desktop design reference and is fully usable on mobile (no horizontal scroll, bottom tab bar visible) — PRD Phase 1 success criteria.
- Renders all four slot states correctly from the `/bracket` payload; only `open` matches are bettable.
- `npm run type-check`, `npm run lint`, and `npm run build` pass.
