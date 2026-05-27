# Task Memory: task_03.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Build the Chaveamento mata-mata screen at `app/ligas/[id]/mata-mata/` — a pure renderer of the `/bracket` payload with phase selector, match cards (4 slot states), prediction interaction, and responsive layout.

## Status

COMPLETED. All 27 tests pass, type-check clean, build passes (route appears in build output).

## Important Decisions

- **Page is 'use client'**: uses useParams, useState, useEffect — same pattern as PalpitesPage.
- **Unsaved slot tracking scoped to current phase**: the save button saves unsaved slots in the currently selected phase only (not all phases). This simplifies the implementation and matches PalpitesPage behavior per group/filter.
- **PHASE_CHIP_LABELS** (different from PHASE_LABELS in bracket.ts): `32nd → "32 avos"`, `16th → "Oitavas"`, `8th → "Quartas"`, `semi → "Semifinal"`, `3rd_place → "3º Lugar"`, `final → "Final"`. Required because the test asserts `toHaveTextContent('32 avos')`.
- **PhaseSelector has `'use client'`**: needed because aria-selected logic requires React client rendering.
- **MatchCard has `'use client'`**: uses useState for TeamFlag image error state.
- **setLoading(true) in useEffect**: pre-existing lint pattern across the codebase (PalpitesPage, UpcomingMatchesCard, league-panel-context). Not a regression.

## Files / Surfaces

- `app/ligas/[id]/mata-mata/page.tsx` — main client component; fetches /bracket, manages selectedPhase + inputValues state
- `app/ligas/[id]/mata-mata/components/StatusBanner.tsx` — static, role=status
- `app/ligas/[id]/mata-mata/components/PhaseSelector.tsx` — role=tablist + role=tab + aria-selected chips
- `app/ligas/[id]/mata-mata/components/MatchCard.tsx` — renders all 4 slot states; prediction inputs only for `open` + non-null matchId

## Test Coverage

27 tests in `tests/unit/mata-mata.test.tsx` — all pass:
- MatchCard: placeholder (3), open (5), locked (2), finished (3)
- PhaseSelector: 5 tests
- StatusBanner: 2 tests
- MataMataPage: header+banner (2), phase selector (2), prediction submission (2)

## Learnings

- The pre-existing test file (`tests/unit/mata-mata.test.tsx`) was already in the repo with all 27 tests — it drove the exact testid API for all components.
- PHASE_CHIP_LABELS must differ from PHASE_LABELS (bracket.ts). The bracket uses "Rodada dos 32" while the chip label is "32 avos".
- `home-display` / `away-display` testids are on spans inside the team rows; for placeholder state they show homeLabel/awayLabel, for confirmed states they show homeTeam/awayTeam.
- `prediction-inputs` is a container div rendered only for `state === 'open' && matchId !== null`.

## Ready for Next Run

- task_04 (navigation) needs to link PainelSidebar + BottomTabBar to `/ligas/[id]/mata-mata`.
- task_06 (phase-unlock banner) extends this screen's StatusBanner area.
