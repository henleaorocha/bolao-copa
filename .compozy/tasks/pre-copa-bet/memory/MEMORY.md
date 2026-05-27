# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State

- task_01 complete (uncommitted). `lib/copa-teams.ts` and API types extension are in place.
- task_02 complete (uncommitted). GET `/api/leagues/{id}` now returns `has_champion_bet: boolean` with fail-open. Unit + integration tests added.
- task_03 complete (uncommitted). `PUT /api/leagues/[id]/champion-bet` with 6-guard chain + upsert. 13 unit tests + 7 integration tests added.
- task_04 complete (uncommitted). `components/PreCopaBetModal.tsx` fully implemented; `flagcdn.com` in `next.config.ts`; 21 unit tests added, all passing.
- task_05 complete (uncommitted). `app/ligas/[id]/page.tsx` wired with sequential modal flow; 12 unit + integration tests added (all passing).

## Shared Decisions

- **48 nations, not 32**: FIFA World Cup 2026 has 48 qualified nations. The PRD stated 32 — this is incorrect. `ALL_COPA_TEAMS` contains 48 teams sourced from `designReferences/data.jsx`. Any task referencing team count must use 48.
- **Portuguese names throughout**: All team names are in Portuguese (e.g., "Holanda" not "Netherlands", "Alemanha" not "Germany"). `VALID_TEAM_NAMES` enforces this server-side.
- **Subdivision codes for GB nations**: Inglaterra → `gb-eng`, Escócia → `gb-sct`. Using `gb` renders the Union Jack — incorrect for both.

## Shared Learnings

- **4 pre-existing test failures** in `tests/unit/get-leagues-hub.test.ts` (3) and `tests/unit/league-detail.test.tsx` (1). These predate this feature. Do not fix in this branch without a dedicated task.
- **`satisfies LeagueDetail` fixtures**: Any test file using `satisfies LeagueDetail` must include `has_champion_bet`. Check for these when implementing task_02 (which modifies the GET handler that returns `LeagueDetail`).
- **jsdom color normalization in component tests**: jsdom normalizes inline CSS colors — `#FFC72C` becomes `rgb(255, 199, 44)` and `rgba(255,255,255,0.4)` becomes `rgba(255, 255, 255, 0.4)`. Style assertions must match the normalized form.
- **Avoid fake timers with `waitFor` in jsdom**: `vi.useFakeTimers()` blocks `waitFor` (which uses `setTimeout` internally). Use real timers and compute expected values at test runtime instead.

## Open Risks

- `runner_up_team` is nullable in the DB but required by the API. Future scoring logic (Phase 3) must handle NULL gracefully.

## Handoffs

All 5 tasks complete. Feature is ready for commit/PR. No further task handoffs needed.
