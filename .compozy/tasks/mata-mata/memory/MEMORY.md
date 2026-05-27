# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State

- **task_01**: COMPLETED. `lib/bracket-skeleton.ts` created with all exports; 23 tests pass; 100% coverage.
- **task_02**: COMPLETED. `lib/bracket.ts` (pure helper) + `app/api/leagues/[id]/bracket/route.ts` (endpoint); 49 tests pass; 95.6% coverage.
- **task_03**: COMPLETED. `app/ligas/[id]/mata-mata/` screen + 3 components; 27 tests pass; type-check clean; build passes.
- **task_04**: COMPLETED. PainelSidebar Mata-mata enabled; BottomTabBar reordered (Perfil→Mata-mata); 36 nav tests pass (11 new).
- **task_05**: COMPLETED. Confirmed-teams guard added to `PUT /api/leagues/[id]/predictions/[matchId]`; returns `409 MATCH_NOT_CONFIRMED` for unconfirmed knockout matches; logs `prediction_rejected_unconfirmed`; 20 tests pass (5 new).
- **task_06**: COMPLETED. `UnlockBanner` component + `mataMataUnlock` state in `LeaguePanelContext`; PainelSidebar + BottomTabBar show yellow dot; 83 tests pass (20 new).
- **task_07**: COMPLETED. `lib/scoring.ts` pure scoring engine; 43 tests pass; 100% coverage on all four metrics.
- **task_08**: COMPLETED. `lib/football-api.ts` extended with `fixture.status.short` + `goals`; `mapFixtureStatus` exported; sync route writes real `status` + `home_score`/`away_score`; `sync_result_ingested` log emitted; 19 new tests pass.
- **task_09**: COMPLETED. `GET /api/leagues/[id]` now computes real `user_stats` and `ranking` via `lib/scoring.ts`; 39 tests pass; GET handler has ~100% line coverage.

## Shared Decisions

- **Calendar key format**: `{ date: ISO8601 UTC string, venue: string }` keyed as `"${date}|${venue}"` in a Map. The venue string must match API-Football's `fixture.venue.name` exactly (can drift; degrades gracefully per ADR-004 — slot stays placeholder).
- **Calendar key dates used**: R32 June 28–July 5, R16 July 7–10, QF July 12–13, SF July 16–17, 3rd July 18, Final July 19, 2026 (all UTC).
- **16 official 2026 venues**: MetLife, AT&T, SoFi, Levi's, Gillette, Lincoln Financial Field, Arrowhead, Mercedes-Benz (Atlanta), NRG, Rose Bowl, Hard Rock, BC Place, BMO Field, Estadio Azteca, Estadio Akron, Estadio BBVA.
- **R32 label pattern**: "Vencedor 1º Grupo X" / "Vencedor 2º Grupo Y" for winners/runners-up; "3º Grupos X/Y/Z/W" for 3rd-place slots.
- **Later-round label pattern**: "Vencedor 1/32 #N" (R16), "Vencedor 1/16 #N" (QF), "Vencedor 1/8 #N" (SF).
- **3rd-place slot labels**: "Perdedor SF #1" / "Perdedor SF #2". Final: "Vencedor SF #1" / "Vencedor SF #2".
- **feeds field**: points only to where the WINNER goes. SF losers go to 3rd-place but this is not captured (interface only supports one target per slot).

## Shared Learnings

- `lib/copa-teams.ts` exports `VALID_TEAM_NAMES` (a `Set<string>`) — import directly for `isConfirmedMatchup`.
- Existing sync stores `venue: f.fixture.venue.name` from API-Football; calendar key venue strings must match this exactly.
- Pre-existing test failures (UI component tests) exist in the repo — unrelated to mata-mata work.

## Open Risks

- **Calendar-key drift**: If API-Football returns different date/venue strings than those in the skeleton, affected slots stay as placeholder (no crash, but no auto-fill). Must be validated against live API-Football data before R32 starts June 28.
- **Venue name format**: API-Football may use "Rose Bowl" vs "Rose Bowl Stadium", "Levi Stadium" vs "Levi's Stadium", etc. Exact strings TBD until live API data is available.

## Handoffs

- **task_03** (Mata-mata screen): DONE. Screen lives at `app/ligas/[id]/mata-mata/`. Components: `StatusBanner`, `PhaseSelector`, `MatchCard` under `./components/`.
- **task_04** (navigation): DONE. PainelSidebar Mata-mata enabled; BottomTabBar reordered to Mata-mata · Tabela · Painel · Palpites · Ranking.
- **task_05** (predictions guard): DONE. Guard uses explicit `KNOCKOUT_PHASES` set; match query expanded to include `phase, home_team, away_team`; `409 MATCH_NOT_CONFIRMED` returned before deadline check.
- **task_06** (unlock indicator): DONE. `UnlockBanner` in mata-mata screen; `mataMataUnlock` state in `LeaguePanelContext` updated by the mata-mata page after each bracket fetch; dot via `mataMataUnlock` prop on PainelSidebar + BottomTabBar.
- **task_07** (scoring engine): DONE. `lib/scoring.ts` exports `PHASE_MULTIPLIERS`, `scoreGroup`, `scoreKnockout`, `scoreChampion`. task_09 imports from `@/lib/scoring`; shape: `ScoreInput = { ph, pa, rh, ra }`; pass `null` realChamp/realVice when the final hasn't played — returns 0 gracefully. Fractional results (7.5, 12.5, 17.5) are NOT rounded.
- **task_08** (sync result ingestion): DONE. `mapFixtureStatus` in `lib/football-api.ts`; sync route reads `fixture.status.short` + `goals.home/away`; writes real status + scores on every upsert; `sync_result_ingested` log has `finished_count` and `scored_matches`.
- **task_09** (scoring wiring): DONE. `GET /api/leagues/[id]` computes real `user_stats` + `ranking` via `lib/scoring.ts`; group → `scoreGroup`; knockout → `scoreKnockout(input, phase)`; champion/vice → `scoreChampion`; realChamp/realVice from the finished final (null when draw); compute-on-read, no `scores` table writes; tie-break by `joined_at`; top-5 ranking cap preserved.

## Shared Learnings (from task_08)

- **importActual pattern for partial mocks**: When adding a new export to a module that tests already mock with `() => ({ onlyOneExport: vi.fn() })`, the route/module will throw because the new import resolves to `undefined`. Always use `vi.mock('...', async (importOriginal) => { const actual = await importOriginal(); return { ...actual, fetchFn: vi.fn() } })` — this keeps real non-mocked exports while only overriding what the test needs.
- **Interface field additions require updating ALL fixture factories**: When adding required fields to `ApiFootballFixture`, check all test files that construct fixture objects (`makeFixture` or inline literals). In this project: `tests/unit/sync-matches-api.test.ts`, `tests/unit/football-api.test.ts`, `tests/integration/sync-matches.test.ts`.

## Shared Learnings (from task_06)

- **Stable vi.fn() in mocks for dep-array hooks**: When mocking a hook that returns a function used in a `useEffect` dep array, the factory MUST capture the `vi.fn()` in a closure — `vi.mock('...', () => { const fn = vi.fn(); return { useHook: () => ({ fn }) } })` — NOT inline (`() => ({ fn: vi.fn() })`). Inline creates a new reference every render, causing the effect to re-run and exhausting `mockResolvedValueOnce`.

## Shared Learnings (from task_04)

- **Two Link mocks for BottomTabBar tests**: `static-panel-components.test.tsx` passes `role` and `aria-selected` through the Link mock (use `getAllByRole('tab')` to get all 5 tabs). `navigation-shell.test.tsx` does NOT pass role through (use `getByRole('link', ...)` for link-based tabs; use `nav.children` for order assertions).

## Shared Learnings (from task_03)

- **PHASE_CHIP_LABELS** (short UI labels, different from PHASE_LABELS): `32nd → "32 avos"`, `16th → "Oitavas"`, `8th → "Quartas"`, `semi → "Semifinal"`, `3rd_place → "3º Lugar"`, `final → "Final"`. These live in PhaseSelector, not in lib/bracket.ts.
- **setLoading(true) in useEffect** is a pre-existing lint pattern across the codebase. Adding a new screen with the same pattern does not introduce a new lint error — treat as established convention.
- **BracketResponse fetch format**: `{ status: 'success', data: BracketResponse, timestamp: '' }` — extract `body.data` after json parse.

## Shared Learnings (from task_02)

- **Test date strategy for bracket tests**: always use exact skeleton calendar-key dates (e.g. `'2026-06-28T21:00:00Z'`) + explicit `nowMs` arg in `buildBracketResponse`. Dynamic `Date.now()+Nh` strings never resolve via `resolveSlot`.
- **Phase labels** (Portuguese, from `PHASE_LABELS` in `lib/bracket.ts`): `'32nd'` → "Rodada dos 32", `'16th'` → "Oitavas de Final", `'8th'` → "Quartas de Final", `semi` → "Semifinais", `'3rd_place'` → "Disputa do 3º Lugar", `final` → "Final".
