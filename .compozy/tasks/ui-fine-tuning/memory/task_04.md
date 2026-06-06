# Task Memory: task_04.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
Repurpose Painel's 3rd StatsRow card into a tournament-wide "JOGOS JÁ REALIZADOS"
indicator: `matches_played / 104`, subtitle "fase de grupos + mata-mata". Add
`matches_played` to GET /api/leagues/[id] (count finished matches w/ non-null both
scores); remove per-user `guesses_made`/`guesses_total` from API + UserStats.

## Important Decisions
- task_01 artifacts were MISSING from the codebase despite _tasks.md + shared memory
  marking task_01 "completed": neither `TOTAL_MATCH_COUNT` (lib/copa-teams.ts) nor
  `LeagueDetail.matches_played` (lib/api/types.ts) existed (grep + tsc confirmed).
  Decision: re-create both prerequisites here per TechSpec (104 = 72 group + 32 KO),
  since task_04 cannot build without them. Not a requirements conflict.

## Learnings
- Baseline `tsc --noEmit` is CLEAN (green). So all `satisfies LeagueDetail`/`UserStats`
  test fixtures MUST be updated (satisfies enforces excess + missing fields): drop
  guesses fields AND add `matches_played` to every full-LeagueDetail literal, or tsc breaks.
- LeagueDetail/UserStats literal fixtures to update: tests/unit/api-responses.test.ts,
  tests/unit/league-detail.test.tsx, tests/unit/league-page-bet-modal.test.tsx,
  tests/unit/league-page-bet-modal-deadline.test.tsx, tests/unit/ranking-page.test.tsx,
  tests/integration/league-detail-page.test.tsx, tests/integration/data-driven-components.test.tsx,
  tests/integration/leagues-detail.test.ts, tests/unit/StatsRow.test.tsx.
- tests/unit/league-ranking-api.test.ts:312-314 already asserts guesses_made/total ABSENT
  from ranking entries — stays valid, no change.

## Files / Surfaces
- lib/copa-teams.ts, lib/api/types.ts, app/api/leagues/[id]/route.ts,
  app/ligas/[id]/components/StatsRow.tsx, app/ligas/[id]/page.tsx

## Errors / Corrections
- StatsRow card title set as literal uppercase "JOGOS JÁ REALIZADOS" (siblings use mixed
  case + CSS `uppercase`); chosen so textContent matches the spec literal exactly. CSS
  `uppercase` is a visual no-op on it — identical render.

## Ready for Next Run
- DONE. matches_played wired end-to-end; guesses fields gone from API + UserStats +
  StatsRow + all fixtures. tsc clean; task tests 119 pass. Full suite 50 fails are ALL
  pre-existing baseline (3 touched files fail identically on clean tree — LeaguePanelProvider
  harness issue, not this task). Net regressions: -1 (fixed an old StatsRow test).
- Verification commands: `npx tsc --noEmit`; `npx vitest run tests/unit/StatsRow.test.tsx
  tests/unit/league-detail-get-api.test.ts tests/unit/copa-teams.test.ts
  tests/integration/data-driven-components.test.tsx`.
- NOT committed (--auto-commit=false).
