---
status: completed
title: Build `PreCopaBetModal` component
type: frontend
complexity: high
dependencies:
  - task_01
---

# Task 04: Build `PreCopaBetModal` component

## Overview

Creates the `components/PreCopaBetModal.tsx` client component that implements the 3-step fullscreen modal (champion selection → vice-champion selection → confirmation). The component is visually faithful to the reference design: gradient backdrop, 3-dash progress indicator, scrollable country grid with SVG flags, disabled-state for the already-chosen champion on step 2, and a confirmation summary with deadline countdown. Also adds `flagcdn.com` to `next.config.ts` image domains.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create `components/PreCopaBetModal.tsx` as a `'use client'` component with props `{ leagueId: string, onComplete: () => void }`.
- MUST implement 3 steps with internal state: step 1 (champion), step 2 (vice-champion), step 3 (confirmation).
- MUST render a 4×3 grid of the 12 `FEATURED_TEAMS` at the top of the scrollable card, followed by a "Outras seleções" label and the remaining teams in the same grid format.
- MUST display each team card with: a `next/image` `<Image>` pointing to `https://flagcdn.com/w80/{code}.png`, team name in bold below, selected state (colored border), and disabled state for the champion team on step 2 (greyed out with "CAMPEÃO" overlay text).
- MUST show a progress indicator with 3 horizontal dashes at the top — active dash is yellow (`#FFC72C`), inactive dashes are semi-transparent.
- MUST match the header layout of `LeagueWelcomeModal.tsx`: gradient top zone (icon + gold label + white headline + subtitle), white bottom zone (scrollable card + navigation buttons).
- Step 1 header: crown icon, "APOSTA PRÉ-COPA · VALE +50 PTS", "Quem leva a taça?", subtitle. CTA: "Escolher Vice →" (disabled until champion selected).
- Step 2 header: medal icon, "APOSTA PRÉ-COPA · VALE +25 PTS", "E o vice-campeão?", subtitle. CTAs: "← Voltar" + "Revisar aposta →" (disabled until vice selected).
- Step 3 header: sparkle icon, "APOSTA PRÉ-COPA · VALE MUITO". Body: summary card with champion row (golden border) and vice row, plus deadline notice. CTAs: "← Voltar" + "Confirmar aposta" (yellow, with save icon).
- MUST call `PUT /api/leagues/{leagueId}/champion-bet` on step 3 confirm and call `onComplete()` on success.
- MUST show a loading state on the confirm button while the PUT request is in flight.
- MUST add `flagcdn.com` to `next.config.ts` `images.remotePatterns` so `next/image` allows the CDN.
- MUST compute "Fecha em X dias" dynamically from `BET_DEADLINE` imported from `lib/copa-teams.ts`.
- MUST NOT be dismissible by tapping outside the modal or pressing the browser back button (no close/skip button).
</requirements>

## Subtasks

- [x] 4.1 Add `flagcdn.com` to `next.config.ts` `images.remotePatterns`
- [x] 4.2 Create `PreCopaBetModal.tsx` with the 3-step state machine and modal backdrop (matching `LeagueWelcomeModal` structural pattern)
- [x] 4.3 Build the country selection grid with `FEATURED_TEAMS` + remaining teams, flag images, selected state, and disabled/overlay state for step 2
- [x] 4.4 Implement the 3 step headers (icon, label, headline, subtitle) and progress indicator
- [x] 4.5 Implement step 3 confirmation summary (champion row, vice row, deadline notice with days countdown)
- [x] 4.6 Implement the PUT API call on confirm with loading state and `onComplete` callback
- [x] 4.7 Write component unit tests

## Implementation Details

See TechSpec "Core Interfaces" for `BetModalState` internal state shape, "System Architecture" for the component tree, and "Integration Points" for flag URL pattern and England ISO code exception.

Follow `components/LeagueWelcomeModal.tsx` for: 'use client' directive, backdrop styles (fixed inset, z-50, backdrop-blur-sm, `rgba(36,76,90,0.8)`), gradient top zone, white bottom zone, lucide-react icon usage, and inline-style + Tailwind class mixing convention.

The country grid card selected state should match the design reference: colored border highlight. The champion card on step 2 should be greyed out (reduced opacity) with an absolute-positioned "CAMPEÃO" text overlay — it must not be clickable.

Flag `<Image>` must use `width={64}` `height={48}` with `className="rounded-md object-cover"` and `alt={team.name}`. Add `onError` fallback to a grey placeholder box.

The deadline countdown ("Fecha em X dias") is computed as `Math.ceil((BET_DEADLINE.getTime() - Date.now()) / 86400000)`.

### Relevant Files

- `components/PreCopaBetModal.tsx` — new file to create
- `components/LeagueWelcomeModal.tsx` — structural pattern reference (backdrop, gradient zone, progress indicator, step rendering, navigation buttons)
- `lib/copa-teams.ts` — imports `FEATURED_TEAMS`, `ALL_COPA_TEAMS`, `BET_DEADLINE` (from task_01)
- `next.config.ts` — add `flagcdn.com` to `images.remotePatterns`
- `lib/api/types.ts` — `ChampionBet` type for PUT response (from task_01)

### Dependent Files

- `app/ligas/[id]/page.tsx` — renders `<PreCopaBetModal>` conditionally (task_05)

### Related ADRs

- [ADR-001: 3-Step Fullscreen Modal Flow](adrs/adr-001.md) — step structure and UX decisions
- [ADR-004: Flag Images via flagcdn.com CDN](adrs/adr-004.md) — flag delivery approach, England ISO code exception, `next.config.ts` requirement

## Deliverables

- `components/PreCopaBetModal.tsx` — complete 3-step modal component
- Updated `next.config.ts` with `flagcdn.com` in `images.remotePatterns`
- Unit tests for the component with 80%+ coverage **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] Step 1 renders "Quem leva a taça?" headline and 12 featured team cards
  - [ ] Step 1 renders "Outras seleções" section with the remaining non-featured teams
  - [ ] "Escolher Vice →" button is disabled when no champion is selected on step 1
  - [ ] Clicking a team card on step 1 selects it (applies selected styling) and enables the CTA
  - [ ] After selecting a champion and clicking "Escolher Vice →", step 2 renders "E o vice-campeão?"
  - [ ] On step 2, the champion team card is greyed out and shows "CAMPEÃO" overlay text
  - [ ] On step 2, clicking the greyed-out champion card does not select it as vice
  - [ ] "Revisar aposta →" is disabled until a vice is selected on step 2
  - [ ] "← Voltar" on step 2 returns to step 1 with the previous champion still selected
  - [ ] After selecting vice and clicking "Revisar aposta →", step 3 renders the confirmation summary
  - [ ] Step 3 shows the champion name with "CAMPEÃO · +50 PTS" and vice name with "VICE · +25 PTS"
  - [ ] Step 3 shows "Fecha em X dias" where X is the correct days until `BET_DEADLINE`
  - [ ] "Confirmar aposta" calls `PUT /api/leagues/{leagueId}/champion-bet` with the selected teams
  - [ ] While PUT is in flight, "Confirmar aposta" shows a loading state and is not clickable
  - [ ] On successful PUT, `onComplete` is called
  - [ ] On PUT failure, an error state is shown (button re-enabled, error message displayed)
  - [ ] Progress indicator shows 3 dashes; active dash is yellow, inactive are muted
- Integration tests:
  - [ ] (covered by task_05 page integration)
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Visual: gradient backdrop, 3-dash progress, 4×3 featured grid, scrollable remaining teams, all match reference design screenshots
- England flag displays the St George's Cross (uses `gb-eng` code)
- Champion team is not selectable as vice on step 2
- `onComplete` is called after a successful PUT confirm
- `next.config.ts` allows `flagcdn.com` images without console warnings
