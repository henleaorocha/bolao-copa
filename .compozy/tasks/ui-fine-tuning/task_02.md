---
status: completed
title: Shared match-presentation subcomponents under components/match/
type: frontend
complexity: high
dependencies: []
---

# Task 2: Shared match-presentation subcomponents under components/match/

## Overview
Create the shared presentation layer that both prediction screens will compose from: a
single five-state status vocabulary plus the reusable team, score-input, and final-result
pieces. This is the foundation that makes a finished match look identical on Palpites and
Mata-mata while each screen keeps its own outer layout.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create `components/match/matchStatus.ts` exporting the `MatchStatus` discriminant plus `groupMatchStatus(...)` and `slotMatchStatus(...)` per the TechSpec "Core Interfaces" signatures.
- MUST create `StatusBadge`, `TeamRow`, `ScoreInputs`, and `FinalResult` under `components/match/`.
- MUST implement the five-state vocabulary exactly: `A DEFINIR` / `ABERTO` / `✓ PALPITADO` / `FECHADO` / `ENCERRADO` (ADR-003), text-labelled (never color-only).
- MUST preserve the existing color mapping: `ABERTO` amber, `PALPITADO`/`ENCERRADO` teal, `FECHADO`/`A DEFINIR` slate.
- MUST re-emit existing `data-testid`s where these pieces replace current markup: `final-score`, `finished-prediction`, `input-home-*`, `input-away-*`, and badge ids; `ScoreInputs` MUST call `onInputChange(matchId, side, value)`.
- MUST map a `live` (past-deadline, not finished) match to `locked` / `FECHADO` — no result shown until `finished`.
- `TeamRow` MUST support a placeholder rendering (italic, slate, empty flag box) and reuse the existing `flagcdn` `<Image>` pattern with the gray fallback.
</requirements>

## Subtasks
- [x] 2.1 Implement `matchStatus.ts` with the `MatchStatus` type and the two pure status-deriving helpers.
- [x] 2.2 Implement `StatusBadge` rendering each of the five states from a single `status` prop, with labels, colors, and test ids.
- [x] 2.3 Implement `TeamRow` (flag + name/label) with placeholder support and flag fallback.
- [x] 2.4 Implement `ScoreInputs` (two numeric inputs + `×`) emitting the existing input test ids and `onInputChange`.
- [x] 2.5 Implement `FinalResult` (`Resultado: x × y`, plus `Palpite: a × b` when a prediction exists) with `final-score` / `finished-prediction` test ids.
- [x] 2.6 Add unit tests for the status helpers (all five states per screen) and the badge/result rendering.

## Implementation Details
Create the new directory `components/match/`. See TechSpec "Core Interfaces" for the
`MatchStatus` type and the `groupMatchStatus` / `slotMatchStatus` bodies, and ADR-003 for
the state→label→condition table and color mapping. Port the current markup and test ids
verbatim from the two existing cards so the screens (task_05, task_06) can drop these in
without breaking selectors. The flag `<Image>` pattern (`https://flagcdn.com/w80/{code}.png`,
width/height with gray fallback `<div>`) is reused by `TeamRow`. Do not wire these into
either screen in this task — that happens in task_05 and task_06.

### Relevant Files
- `app/ligas/[id]/palpites/components/MatchRow.tsx` — source of current group-stage markup, status logic, and `input-home-*`/`input-away-*` test ids to port.
- `app/ligas/[id]/mata-mata/components/MatchCard.tsx` — source of current `Resultado: x × y` (`final-score`/`finished-scores`), `finished-prediction`, and placeholder/team-display markup to port.
- `lib/bracket.ts` — defines `SlotState` (`placeholder | open | locked | finished`) and `BracketSlotView.prediction`, the inputs to `slotMatchStatus`.
- `lib/api/types.ts` — `MatchWithPrediction` (`status`, `is_deadline_passed`, `prediction`), the input shape for `groupMatchStatus`.

### Dependent Files
- `app/ligas/[id]/palpites/components/MatchRow.tsx` — will compose these pieces (task_05).
- `app/ligas/[id]/mata-mata/components/MatchCard.tsx` — will compose these pieces (task_06).

### Related ADRs
- [ADR-002: Shared match subcomponents composed per screen](../adrs/adr-002.md) — defines the subcomponent boundary and the test-id-preservation mandate.
- [ADR-003: Unified five-state prediction-status vocabulary](../adrs/adr-003.md) — defines labels, conditions, and color mapping.

## Deliverables
- `components/match/matchStatus.ts`, `StatusBadge`, `TeamRow`, `ScoreInputs`, `FinalResult`.
- Preserved test ids ready for both screens to consume.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Component render tests for `StatusBadge`/`FinalResult` **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] `groupMatchStatus`: `status='finished'` → `finished`.
  - [x] `groupMatchStatus`: `is_deadline_passed=true`, not finished → `locked`.
  - [x] `groupMatchStatus`: open with `prediction` → `predicted`; open without → `open`.
  - [x] `slotMatchStatus`: `open` + `hasPrediction=true` → `predicted`; `open` + false → `open`.
  - [x] `slotMatchStatus`: passes through `placeholder`, `locked`, `finished` unchanged.
  - [x] `live` past deadline (group) maps to `locked` (renders `FECHADO`, no result).
- Integration tests:
  - [x] `StatusBadge` renders the correct label and `data-testid` for each of the five states.
  - [x] `FinalResult` renders `final-score`; renders `finished-prediction` only when a prediction is supplied.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- All five subcomponents exist under `components/match/` and emit the preserved test ids.
- Status helpers produce the ADR-003 state for every documented input, including `live` → `locked`.
