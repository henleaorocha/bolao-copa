# Task Memory: task_02.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
Shared `components/match/` presentation layer (matchStatus.ts + StatusBadge/TeamRow/ScoreInputs/FinalResult). DONE. Not wired into screens (task_05/06 do that).

## Important Decisions
- `StatusBadge` has a default test id per status (`badge-placeholder/open/predicted/locked/finished`) AND an optional `testId` override prop. Mata-mata's existing ids (`badge-placeholder/open/locked/finished`) match the defaults; Palpites uses `badge-aberto/palpitado/fechado`, so task_05 must pass `testId` overrides to keep its selectors (no `predicted` id existed on Palpites before).
- `ScoreInputs` always emits `input-home-<id>`/`input-away-<id>` (desktop Palpites previously had none — harmless add). Has a `size` prop: `sm`=w-9 h-8 (mobile/Mata-mata), `md`=w-10 h-9 (desktop Palpites).
- `TeamRow` two empty-box styles: placeholder→`bg-slate-100` + italic name; flag fallback (missing code / onError)→`bg-slate-200`. Caller passes `placeholder` + `nameTestId` (e.g. `home-display`, `home-team-name`).
- `FinalResult` wrapper keeps `data-testid="finished-scores"` (from Mata-mata) plus `final-score`/`finished-prediction`.

## Learnings
- Component tests need `@vitest-environment jsdom` pragma (global env is `node`) + `vi.mock('next/image')`. To cover the flag `onError` branch the next/image mock must forward `onError` to the `<img>` and the test fires `fireEvent.error(img)`.
- Coverage config `include` is only `lib/**`+`app/api/**`, so `components/**` is NOT measured by the default threshold gate. Prove component coverage with `--coverage.include='components/match/**'`.

## Files / Surfaces
- NEW: components/match/{matchStatus.ts,StatusBadge.tsx,TeamRow.tsx,ScoreInputs.tsx,FinalResult.tsx}
- NEW tests: tests/unit/match-status.test.ts, tests/unit/match-subcomponents.test.tsx (27 tests, 100% lines on new files)

## Errors / Corrections

## Ready for Next Run
- task_05 (MatchRow) & task_06 (MatchCard): compose these pieces. MatchRow currently has TWO score-input blocks (mobile w-9/h-8 with test ids, desktop w-10/h-9 without) — use ScoreInputs `size` prop. Pass `groupMatchStatus(match)`/`slotMatchStatus(slot.state, !!slot.prediction)` to StatusBadge; Palpites must override badge testIds.
