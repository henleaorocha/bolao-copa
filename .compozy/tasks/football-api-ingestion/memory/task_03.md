# Task Memory: task_03.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
Rewrote `lib/football-api.ts` from api-sports into an openfootball adapter behind the `fetchWorldCupFixtures()` seam; added `mapOpenfootballMatch()` + `OpenfootballMatch`/`MatchRow` interfaces; wired sync route to the new mapper. DONE, verified (auto-commit off — diff left for manual review).

## Important Decisions
- `fetchWorldCupFixtures()` now returns RAW `OpenfootballMatch[]`; the sync route does `fixtures.map(mapOpenfootballMatch)`. Mapping lives in the adapter, route is thin.
- `MatchRow.phase` union (no `live`, no `4th`): `group|32nd|16th|8th|semi|3rd_place|final`. `venue` AND `city` both set to openfootball `ground` (a city; no stadium available).
- Date+offset → ISO via building `YYYY-MM-DDTHH:MM:00±HH:MM` then `new Date().toISOString()` (stores UTC `Z`). `"17:00 UTC-4"`+`2026-07-18` → `2026-07-18T21:00:00.000Z`.
- external_id precedence: `num` present → `wc2026-<num>` (covers R32..SF); else phase `final`→`wc2026-final`, `3rd_place`→`wc2026-3rd`, `group`→`wc2026-<letter>-<ptHome>-<ptAway>`.
- Unmapped-team logging gate: log (console.warn, event `ingestion_unmapped_team`) only when NOT a placeholder AND not in `OPENFOOTBALL_TO_PT` AND not already a `VALID_TEAM_NAMES` member. Placeholder = `/^\d/` or `/^[WL]\d/` (covers `2A`,`1E`,`3A/B/C/D/F`,`W74`,`L101`).
- Renamed sync-route error log event `api_football_error` → `ingestion_error` (source-neutral, per techspec monitoring). `skipped` stays 0 (is_manual exclusion is task_06).

## Learnings
- REAL openfootball round names (from pinned fixture, differ from api-sports): group = `"Matchday N"` (NOT "Group Stage"); knockout = `Round of 32`, `Round of 16`, `Quarter-final`, `Semi-final`, `Match for third place`, `Final` (SINGULAR forms). ROUND_TO_PHASE keeps plural aliases too for tolerance.
- Pinned fixture `tests/fixtures/openfootball-wc2026.json` = `{ name, matches[104] }`: 72 group + 30 numbered knockout (num 73–102) + Final + 3rd. No `score` field anywhere (pre-tournament). Offsets seen: UTC-4/-5/-6/-7.
- 4 test files referenced the removed api-sports types and ALL needed rewriting (not just the 2 the task named): `football-api.test.ts`, `sync-result-ingestion.test.ts`, `sync-matches-api.test.ts`, `tests/integration/sync-matches.test.ts`. Integration test is `describe.skipIf(!SERVICE_KEY)` → 3 skipped locally; rewrote to knockout matches with unique `num` for deterministic unique external_ids.

## Files / Surfaces
- `lib/football-api.ts` (full rewrite — deliverable)
- `app/api/admin/sync-matches/route.ts` (consumes mapper; dropped `ALL_COPA_TEAMS`/`parsePhaseAndGroup`/`resolveFlag`/`ROUND_TO_PHASE` imports)
- `tests/unit/football-api.test.ts`, `tests/unit/sync-result-ingestion.test.ts`, `tests/unit/sync-matches-api.test.ts`, `tests/integration/sync-matches.test.ts` (all rewritten to openfootball shape)

## Errors / Corrections
- (none — clean run)

## Ready for Next Run
- task_04 can rely on `external_id = wc2026-<num>` for knockout and `wc2026-final`/`wc2026-3rd`. Group ids are `wc2026-<letter>-<ptHome>-<ptAway>`.
- task_08 (api-sports scrub): `lib/football-api.ts` no longer has `ApiFootballFixture`/`mapFixtureStatus`/`API_FOOTBALL_KEY`/api-sports URL. Remaining: `.env.example` `API_FOOTBALL_KEY`, fixtures `api-football-*.json`, doc/task references.
- Verification: tsc 0, eslint 0, vitest 72 pass/3 skip; `lib/football-api.ts` coverage 98% stmts / 92.68% branch / 100% funcs.
