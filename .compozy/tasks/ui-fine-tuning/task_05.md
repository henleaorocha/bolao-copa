---
status: completed
title: Refactor Palpites MatchRow onto shared pieces + finished result
type: refactor
complexity: medium
dependencies:
  - task_02
---

# Task 5: Refactor Palpites MatchRow onto shared pieces + finished result

## Overview
Recompose the group-stage `MatchRow` from the shared `components/match/` pieces and add
the missing finished branch so a completed match shows its real score alongside the
user's locked prediction. This delivers the "did I get it right?" comparison on the
Palpites screen and aligns it with the unified card pattern.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST derive the card status via `groupMatchStatus` and render it through the shared `StatusBadge`.
- MUST render team rows via `TeamRow` and the editable inputs via `ScoreInputs`, preserving `input-home-*` / `input-away-*` test ids and the existing `onInputChange` wiring.
- MUST add a `finished` branch (`ENCERRADO`) rendering `FinalResult` (`Resultado: x × y` + `Palpite: a × b`); finished group matches now read `ENCERRADO` (previously `FECHADO`).
- MUST disable inputs when the match is not open (deadline passed / finished).
- MUST preserve every existing `data-testid` on this screen: `match-row`, badge ids, `input-home-*`, `input-away-*`, team-name ids, `details-link`, and the page-level `save-all-btn` flow.
- MUST NOT change the prediction-save behavior or the deadline-locking rules.
</requirements>

## Subtasks
- [x] 5.1 Replace the inline status logic with `groupMatchStatus` + `StatusBadge`.
- [x] 5.2 Replace the team markup with `TeamRow` and the inputs with `ScoreInputs`.
- [x] 5.3 Add the finished branch rendering `FinalResult` with predicted-vs-actual.
- [x] 5.4 Ensure inputs are disabled once the match is not open.
- [x] 5.5 Verify all existing test ids and the save flow still resolve, and add finished-state coverage.

## Implementation Details
`MatchRow.tsx` (~280 lines) currently derives `aberto`/`palpitado`/`fechado` inline
(~lines 55-86) and renders inputs at ~140-167 (mobile) and ~205-230 (desktop) with the
`input-home-*`/`input-away-*` ids; it has no finished branch today. Compose the shared
pieces from task_02 and add the `ENCERRADO`/`FinalResult` branch. Keep the screen's own
outer layout, group badge, and `details-link`. See ADR-002 (composition boundary) and
ADR-003 (status vocabulary). No API change — the matches endpoint already returns `status`
and scores.

### Relevant Files
- `app/ligas/[id]/palpites/components/MatchRow.tsx` — the card being refactored.
- `components/match/matchStatus.ts` — `groupMatchStatus` discriminant source (task_02).
- `components/match/StatusBadge.tsx`, `TeamRow.tsx`, `ScoreInputs.tsx`, `FinalResult.tsx` — shared pieces to compose (task_02).
- `lib/api/types.ts` — `MatchWithPrediction` (`status`, `is_deadline_passed`, `prediction`, scores).

### Dependent Files
- `app/ligas/[id]/palpites/page.tsx` — owns the `save-all-btn` flow and `onInputChange`; verify wiring still matches `ScoreInputs`.
- `tests/e2e/validation-run.spec.ts` — exercises palpites entry/save; selectors must keep resolving.

### Related ADRs
- [ADR-002: Shared match subcomponents composed per screen](../adrs/adr-002.md) — compose, don't normalize; preserve test ids.
- [ADR-003: Unified five-state prediction-status vocabulary](../adrs/adr-003.md) — finished group match reads `ENCERRADO`.

## Deliverables
- `MatchRow` composed from the shared pieces with a working finished branch.
- Inputs disabled when not open; all existing test ids preserved.
- Unit/component tests with 80%+ coverage **(REQUIRED)**.
- Integration test confirming no save-flow regression **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] Finished match renders `StatusBadge` `ENCERRADO` and `FinalResult` with `final-score` + `finished-prediction`.
  - [x] Open-without-prediction renders `ABERTO` with enabled inputs; open-with-prediction renders `✓ PALPITADO`.
  - [x] Past-deadline (not finished) renders `FECHADO` with disabled inputs.
- Integration tests:
  - [x] Editing a score still calls `onInputChange` and `save-all-btn` persists, with `input-home-*` / `input-away-*` resolving.
  - [x] A finished group match on the Palpites screen shows the real score next to the user's prediction (no regression to open/closed cards).
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Finished Palpites matches show predicted-vs-actual; open/closed states behave as before.
- All prior test ids and the save flow remain intact.
