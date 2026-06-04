# Task Memory: task_04.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
Re-key knockout bracket from `resolveSlot(date,venue)` (broken: openfootball `ground` is a city, never matches stadium) to openfootball `num` via `external_id`. Slots carry `num`+`externalId`; matches map by `external_id`; remove `resolveSlot`/`calendarKey`/`SLOT_BY_CALENDAR`; feeds/sources derived from W##/#A/L## placeholders with a tolerant parser.

## Important Decisions
- **num↔pos assignment is positional**: R32 pos1..16 → num 73..88; R16 pos1..8 → 89..96; QF pos1..4 → 97..100; SF pos1..2 → 101..102; final/3rd no num. (All slots in a phase row are interchangeable, so positional is natural & simplest.)
- **PT labels kept verbatim** per (phase,pos) as required ("PT labels unchanged"). They are decorative pre-fill text; the authoritative topology is now `num`+placeholder sources. A pos's frozen label may not perfectly describe its real (placeholder-derived) feed — acceptable, labels only show before real teams arrive.
- **Source model, not downstream**: each slot stores `homeSource`/`awaySource` parsed from its own openfootball placeholders. Plus an exported `SLOT_FEEDS` edge list (winner/loser of num → downstream phase/pos/side) so the W##/L## linkage is testable as "downstream slot/side". SF slots correctly feed BOTH final (winner) and 3rd (loser) — source model handles this naturally; old single-`feeds` couldn't.
- externalId per slot must equal football-api `buildExternalId`: `wc2026-<num>` / `wc2026-final` / `wc2026-3rd`.

## Learnings
- `buildBracketResponse` never used `feeds` at runtime; nothing in components/route uses `feeds` either (MatchCard has none). `feeds` is structural/test-only → free to remodel.
- Bracket route (`app/api/leagues/[id]/bracket/route.ts`) pre-filters matches by `phase IN knockout` and selects `*` (so `external_id` is present) — no logic change needed.
- openfootball knockout topology DIFFERS from the old hand-authored (1,2)→R16#1 guess (e.g. 73,75→90; 74,77→89). That mismatch was the latent bug; placeholder-derived feeds fix it.

## Files / Surfaces
- `lib/bracket-skeleton.ts` — rewritten: `num`/`externalId`/`homeSource`/`awaySource`, `parsePlaceholder`, `slotForExternalId`, `slotForNum`, `SLOT_FEEDS`; removed `resolveSlot`/`calendarKey`/`SLOT_BY_CALENDAR`.
- `lib/bracket.ts` — `buildBracketResponse` maps via `slotForExternalId(match.external_id)`.
- `tests/unit/bracket-skeleton.test.ts` — rewritten to num/externalId/source assertions.
- `tests/unit/bracket-timestamp-format.test.ts` — DELETED.
- `tests/unit/league-bracket-api.test.ts` — mocks rekeyed to `external_id`.

## Errors / Corrections
- First cut of the integration "exactly one filled slot" assertion used a tangled exclusion filter (`!(pos===1 && ...)`) that wrongly excluded the filled slot → got 0. Fixed by simply counting non-placeholder slots === 1.

## Ready for Next Run
- task_04 COMPLETE, status=completed in task_04.md + _tasks.md. Auto-commit OFF → diff left for manual review (no commit made).
- Verification: tsc exit 0; eslint clean on all changed files; 67 bracket tests pass; bracket modules 100% coverage. Full repo run still has the documented ~45 pre-existing UI-provider failures (unrelated).
- Touched: lib/bracket-skeleton.ts, lib/bracket.ts, tests/unit/bracket-skeleton.test.ts, tests/unit/bracket-helper.test.ts, tests/unit/league-bracket-api.test.ts (rekeyed mocks to external_id), tests/integration/bracket-fixture.test.ts (new), deleted tests/unit/bracket-timestamp-format.test.ts.
