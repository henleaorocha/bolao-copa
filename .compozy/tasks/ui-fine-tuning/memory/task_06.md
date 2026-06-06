# Task Memory: task_06.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
Recompose knockout `MatchCard` from shared `components/match/` pieces (task_02) so it matches Palpites layout; split `open` into `ABERTO`/`✓ PALPITADO` via `slot.prediction`. Keep multiplier badge, kickoff, placeholder slots, locked-prediction read-only block. Preserve ALL test ids.

## Important Decisions
- Status derived via `slotMatchStatus(slot.state, !!slot.prediction)`. Default StatusBadge test ids already match Mata-mata's existing `badge-placeholder/open/locked/finished`; the new `predicted` state uses the default `badge-predicted` (no prior id existed) — NO testId override needed (unlike Palpites).
- MatchCard is single-layout (no mobile+desktop dupe), so shared pieces use default/bare test ids — no `-lg`/suffix dance from task_05.
- Inputs still render only for `open` slots (incl. predicted = open+prediction, still editable, pre-filled from page inputValues). Locked/finished never render inputs (unchanged).
- `predicted` slot shows inputs (pre-filled) + `badge-predicted`; does NOT show the `locked-prediction` read-only block (that stays locked-only).

## Learnings
- DONE. MatchCard.tsx fully recomposed onto shared pieces; 100% coverage (stmts/branch/funcs/lines) via `--coverage.include='**/mata-mata/components/MatchCard.tsx'` (the literal `[id]` path segment breaks plain glob includes — use `**/mata-mata/...`).
- 51/51 affected tests pass (43 mata-mata + 8 league-bracket-api); tsc clean repo-wide; eslint clean on changed files. Only mata-mata.test.tsx imports MatchCard, so no cross-suite fallout.

## Files / Surfaces
- EDIT: app/ligas/[id]/mata-mata/components/MatchCard.tsx (compose StatusBadge/TeamRow/ScoreInputs/FinalResult).
- Tests: tests/unit/mata-mata.test.tsx (existing MatchCard coverage) — add PALPITADO + finished/locked assertions.

## Errors / Corrections

## Ready for Next Run
