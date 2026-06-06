# Task Memory: task_05.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
Refactor Palpites `MatchRow` to compose shared `components/match/` pieces (task_02) +
add a `finished`/`ENCERRADO` branch rendering `FinalResult` (predicted-vs-actual).
Preserve all existing test ids and the page save-all flow.

## Important Decisions
- `MatchRow` renders BOTH a mobile (`lg:hidden`) and desktop (`hidden lg:block`) layout
  into the DOM. jsdom keeps both, so any shared piece that emits a FIXED test id would
  collide under `getByTestId`. The original avoided this by giving test ids to the mobile
  copy only (inputs) and `-lg`-suffixing desktop team names.
  - StatusBadge: mobile passes `testId=badge-aberto/palpitado/fechado/finished`; desktop
    passes the same id `+ '-lg'`. Tests query the mobile ids → stay unique.
  - ScoreInputs: added an optional `testIdSuffix` prop (default `''`, backward compatible).
    Mobile uses default (`input-home-<id>`); desktop passes `-lg`. MatchCard (task_06)
    keeps the default, unaffected.
- Finished state REPLACES the editable inputs with `FinalResult` (it already shows the
  saved `Palpite: a × b`). Locked (deadline passed, not finished) keeps inputs visible but
  disabled (existing FECHADO behavior). `disabled = !(open|predicted)`.
- Desktop team rows now use `TeamRow` (flag-left, unified look): the old country-code
  subtitle line and the away-flag-on-right mirror are dropped to honor "render via TeamRow"
  + the unified card pattern. `home-team-name-lg`/`away-team-name-lg` carried via nameTestId.
- Finished group match badge test id = `badge-finished` (no prior Palpites id existed; ADR-003
  finished → ENCERRADO).

## Learnings
- FinalResult ALSO can't be duplicated across the two layouts (it emits fixed
  `final-score`/`finished-prediction`, no override prop). Solved by rendering ONE
  FinalResult block at the card level (outside both lg:hidden/hidden lg:block wrappers)
  with `px-3 lg:px-4` padding — visible at every breakpoint when finished.
- groupMatchStatus never returns `placeholder` for group matches, so the `placeholder`
  arm of BADGE_TEST_ID (line 68) is the only uncovered branch → MatchRow 100% lines /
  92.85% branches. Kept the map total for type-safety.
- Verified delta against baseline: full suite still 51 failed / 11 files (unchanged);
  all failing files are unrelated (sync/champion/bet-modal/etc.). Task tests 60 passing.

## Files / Surfaces
- EDIT: app/ligas/[id]/palpites/components/MatchRow.tsx (compose shared pieces + finished branch)
- EDIT: components/match/ScoreInputs.tsx (add optional `testIdSuffix`)
- TESTS: tests/unit/PalpitesPage.test.tsx + tests/integration/palpites-page.test.tsx (finished coverage)

## Errors / Corrections
- First pass rendered FinalResult inside BOTH layouts → duplicate `final-score` test id
  failed `getByTestId`. Fixed by hoisting to a single card-level block (see Learnings).

## Ready for Next Run
- task_05 DONE. ScoreInputs now has an optional `testIdSuffix` prop (default '').
- task_06 (MatchCard) renders a SINGLE layout, so it won't hit the duplicate-test-id
  problem; it can use ScoreInputs/FinalResult with their default test ids.
