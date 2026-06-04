# Task Memory: task_02.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
Add `lib/team-names.ts` (`OPENFOOTBALL_TO_PT` 48 entries + `toPtName`) mapping openfootball EN names to the seed-020 PT roster; un-skip `tests/unit/sync-team-name-normalization.test.ts`. DONE — awaiting manual review (auto-commit off).

## Important Decisions
- `DR Congo` → `Rep. Democrática do Congo` (seed-020 canonical), NOT the spec's shorthand "RD Congo". Forced by the hard constraint "every value ∈ VALID_TEAM_NAMES"; pre-adjudicated in task_01 memory + copa-teams.ts.
- Test now drives the normalization seam directly (`toPtName` → `resolveFlag` mirror + `isConfirmedMatchup`), not the full POST sync route — the openfootball adapter is task_03 (not yet built).

## Learnings
- `tests/fixtures/openfootball-wc2026-teams.json` (48 names) is the authoritative EN key set; all 48 appear verbatim as team1/team2 in `openfootball-wc2026.json`. The only other match strings are placeholders (`1A`/`2A`/`W74`/`L101`/`3A/B/C/D/F`…) which pass through untouched.
- JSON fixtures import cleanly via `@/tests/fixtures/...` in vitest.

## Files / Surfaces
- `lib/team-names.ts` (new) — the deliverable.
- `tests/unit/sync-team-name-normalization.test.ts` (un-skipped, rewritten, 29 tests).

## Errors / Corrections
- None blocking.

## Ready for Next Run
- task_03 (`mapOpenfootballMatch`) imports `toPtName` for `team1`/`team2`. Map covers all 48; unmapped strings (placeholders) return unchanged so log-and-keep stays visible.
- Verify: `npx vitest run tests/unit/sync-team-name-normalization.test.ts` (29 pass; 100% coverage on lib/team-names.ts).
