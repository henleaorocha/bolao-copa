---
status: completed
title: Refactor Mata-mata MatchCard onto shared pieces + PALPITADO state
type: refactor
complexity: medium
dependencies:
  - task_02
---

# Task 6: Refactor Mata-mata MatchCard onto shared pieces + PALPITADO state

## Overview
Recompose the knockout `MatchCard` from the shared `components/match/` pieces so it
matches the Palpites layout, and split its `open` state into `ABERTO` / `PALPITADO` so a
saved knockout prediction is finally surfaced. Phase tabs, placeholder slots, and the
per-phase multiplier badge stay intact.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST derive status via `slotMatchStatus(slot.state, hasPrediction)` and render it through the shared `StatusBadge`.
- MUST split an `open` slot into `ABERTO` (no prediction) / `✓ PALPITADO` (prediction saved) based on `slot.prediction`.
- MUST render team rows via `TeamRow` (with placeholder italic support for `A DEFINIR`), inputs via `ScoreInputs`, and the finished block via `FinalResult` (`Resultado: x × y`, preserving the existing knockout result display).
- MUST preserve every existing `data-testid`: `match-card`, badge ids, `home-display`/`away-display`, `final-score`/`finished-scores`/`finished-prediction`, `prediction-inputs`, `input-home-*`/`input-away-*`, `locked-prediction`/`locked-prediction-score`.
- MUST keep the per-phase multiplier badge and placeholder (`A DEFINIR`) slot rendering.
- MUST NOT change scoring multipliers, the bracket data shape, or the save flow.
</requirements>

## Subtasks
- [x] 6.1 Replace the inline `StateBadge` with `slotMatchStatus` + the shared `StatusBadge`.
- [x] 6.2 Add the `PALPITADO` split for open slots that already have a prediction.
- [x] 6.3 Compose `TeamRow` (incl. placeholder), `ScoreInputs`, and `FinalResult` for the common surfaces.
- [x] 6.4 Preserve the multiplier badge, placeholder slot, and locked-prediction display.
- [x] 6.5 Verify all existing test ids resolve and add `PALPITADO`/finished coverage.

## Implementation Details
`MatchCard.tsx` (~214 lines) currently renders a local `StateBadge` (~lines 39-80) with
`A DEFINIR`/`ABERTO`/`FECHADO`/`ENCERRADO` and has no `PALPITADO` state; the finished block
(`final-score`, ~lines 157-168), input block (`prediction-inputs`, ~172-201), and
locked-prediction block (~204-211) already exist. Compose the shared pieces from task_02
and add the `predicted` split via `slot.prediction`. Keep the screen's own outer layout,
multiplier badge, and placeholder handling. See ADR-002 and ADR-003.

### Relevant Files
- `app/ligas/[id]/mata-mata/components/MatchCard.tsx` — the card being refactored.
- `components/match/matchStatus.ts` — `slotMatchStatus` discriminant source (task_02).
- `components/match/StatusBadge.tsx`, `TeamRow.tsx`, `ScoreInputs.tsx`, `FinalResult.tsx` — shared pieces to compose (task_02).
- `lib/bracket.ts` — `BracketSlotView` (`state`, `prediction`, scores, `multiplier`, labels).

### Dependent Files
- `app/ligas/[id]/mata-mata/page.tsx` — owns the `save-all-btn` flow and input wiring; verify it still matches `ScoreInputs`.
- `tests/e2e/validation-run.spec.ts` and `tests/unit/league-bracket-api.test.ts` — exercise bracket rendering/selectors; must keep resolving.

### Related ADRs
- [ADR-002: Shared match subcomponents composed per screen](../adrs/adr-002.md) — compose, don't normalize; preserve test ids and the multiplier/placeholder extras.
- [ADR-003: Unified five-state prediction-status vocabulary](../adrs/adr-003.md) — knockout gains `PALPITADO`; `live` maps to `FECHADO`.

## Deliverables
- `MatchCard` composed from the shared pieces, with `ABERTO`/`PALPITADO` split.
- Multiplier badge, placeholder slot, and locked-prediction display preserved; all test ids intact.
- Unit/component tests with 80%+ coverage **(REQUIRED)**.
- Integration test confirming no bracket/save regression **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] Open slot with `prediction` renders `✓ PALPITADO`; open slot without renders `ABERTO`.
  - [x] Placeholder slot renders `A DEFINIR` with italic placeholder team rows.
  - [x] Finished slot renders `ENCERRADO` + `FinalResult` (`final-score`, and `finished-prediction` when a prediction exists).
  - [x] Locked slot still renders `locked-prediction` when a prediction exists.
- Integration tests:
  - [x] A seeded open-with-prediction knockout slot shows `PALPITADO` on the Mata-mata screen.
  - [x] The multiplier badge and phase tabs still render, and the save flow (`save-all-btn`, `input-home-*`) is unregressed.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Knockout cards match the Palpites layout and surface `PALPITADO` for saved predictions.
- Multipliers, placeholders, locked predictions, and all test ids are preserved.
