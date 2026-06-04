# TechSpec: Trustworthy Match Data & Pre-Launch Validation

## Executive Summary

This spec replaces the api-sports integration with a free **openfootball** ingestion adapter, fixes the knockout bracket by keying it to openfootball's native game numbers, reconciles the team roster to the real 48 qualifiers, adds a lean global-operator result override, and ships a reproducible, screenshot-backed validation run over preset tournament states.

The strategy preserves the existing ingestion seam (`fetchWorldCupFixtures()` → sync route → upsert-by-`external_id` → hourly cron) while rewriting the mapper behind it for openfootball's very different schema (English names, split date/time with local offsets, no status enum, no score until played, no numeric id, knockout topology encoded as `num` + `W##`/`#A`/`L##` placeholders). The primary trade-off: we accept a **full rewrite of `lib/football-api.ts` and `lib/bracket-skeleton.ts`** (and adjustments to their consumers) in exchange for a $0, key-less source with full 2026 coverage and a stable knockout key that makes the bracket fill deterministically. A real openfootball sample is pinned in `tests/fixtures/` so every mapping is testable offline; the captured roster **confirms seed 020** ([ADR-003](adrs/adr-003.md)), de-risking the reconciliation.

## System Architecture

### Component Overview

- **openfootball adapter** (`lib/football-api.ts`, rewritten) — fetches the openfootball 2026 JSON and maps each match to a `matches` row: derives `status` from presence of `score`, combines `date` + `time` offset into a `timestamptz`, synthesizes a stable `external_id`, and normalizes EN→PT names. Keeps the exported name `fetchWorldCupFixtures()` and adds `mapOpenfootballMatch()`. Boundary: pure mapping + one outbound fetch; no DB access.
- **Team name normalization** (`lib/team-names.ts`, new) — `OPENFOOTBALL_TO_PT` map (48 entries) + `toPtName()`. Consumed by the adapter and reused to un-skip `sync-team-name-normalization.test.ts`.
- **Roster source of truth** (`lib/copa-teams.ts`, modified) — reconciled to seed 020's 48 teams ([ADR-003](adrs/adr-003.md)); drives `VALID_TEAM_NAMES`, flags, champion picker.
- **Sync route** (`app/api/admin/sync-matches/route.ts`, modified) — unchanged in shape, but before upsert it reads `external_id`s where `is_manual = true` and excludes them ([ADR-008](adrs/adr-008.md)). Still deletes null-`external_id` rows and revalidates the `fixtures` tag.
- **Knockout bracket** (`lib/bracket-skeleton.ts` + `lib/bracket.ts`, modified) — slots carry openfootball `num`; matches map to slots by `external_id`; `resolveSlot(date, venue)` and `SLOT_BY_CALENDAR` are removed ([ADR-007](adrs/adr-007.md)).
- **Operator result control** — `PATCH /api/admin/matches/[id]/result` (new) + unlisted page `app/(operator)/controle-resultados` (new) + shared email-gate helper. Sets scores/status and `is_manual` ([ADR-008](adrs/adr-008.md)).
- **Validation harness** — `supabase/seeds/state-{precup,live,finished}.sql` (league + 2 users + deterministic predictions, PT names incl. knockout) + `tests/e2e/validation-run.spec.ts` (Playwright UI walk) producing `docs/VALIDACAO-EVIDENCIA.md` with per-step screenshots ([ADR-009](adrs/adr-009.md)).

### Data flow (ingestion)

```
openfootball worldcup.json ──fetchWorldCupFixtures()──► ApiMatch[] (internal shape)
   │ mapOpenfootballMatch: status/date/external_id/EN→PT
   ▼
sync route ──exclude is_manual external_ids──► upsert matches (onConflict external_id)
   │
   ▼  participants read matches (ranking / matches list / bracket) — unchanged
```

## Implementation Design

### Core Interfaces

The adapter maps the openfootball match to the internal row shape consumed by the sync route. The raw source type mirrors the captured fixture:

```ts
// lib/football-api.ts
export interface OpenfootballMatch {
  round: string            // "Matchday 1" | "Round of 32" | "Quarter-final" | "Final" | ...
  num?: number             // present on R32..SF (73..102); absent on Final & 3rd place
  date: string             // "2026-07-04"
  time: string             // "17:00 UTC-4"
  team1: string            // EN name OR placeholder ("Mexico" | "2A" | "W74" | "L101")
  team2: string
  group?: string           // "Group A" (group matches only)
  ground: string           // city, e.g. "Los Angeles (Inglewood)"
  score?: { ft?: [number, number] }   // absent until played
}

export interface MatchRow {
  external_id: string      // "wc2026-73" | "wc2026-final" | "wc2026-A-Brasil-..."
  home_team: string; away_team: string
  home_flag: string | null; away_flag: string | null
  match_date: string       // ISO timestamptz (date + offset combined)
  phase: 'group'|'32nd'|'16th'|'8th'|'semi'|'3rd_place'|'final'
  group: string | null
  venue: string; city: string
  status: 'scheduled'|'finished'
  home_score: number | null; away_score: number | null
}

export function mapOpenfootballMatch(m: OpenfootballMatch): MatchRow
export async function fetchWorldCupFixtures(): Promise<OpenfootballMatch[]>
```

Operator override guard (shared by page and API):

```ts
// lib/operator.ts
export const OPERATOR_EMAILS = new Set([
  'hen.leao.rocha@gmail.com',
  'henrique.rocha@arkmeds.com',
])
export async function requireOperator(): Promise<{ ok: true } | { ok: false; status: 401 | 403 }>
```

### Data Models

`matches` gains two columns ([ADR-008](adrs/adr-008.md)):

```sql
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS is_manual         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_updated_at timestamptz;
```

No change to `predictions`, `champion_bets`, `leagues`, `league_members`. The `phase` CHECK and `external_id` UNIQUE constraint already exist. `external_id` strategy: knockout `wc2026-<num>`; Final/3rd `wc2026-final` / `wc2026-3rd`; group `wc2026-<group>-<team1>-<team2>` (PT names, stable per draw).

### API Endpoints

- `POST /api/admin/sync-matches` (modified) — service-role auth unchanged; now skips `is_manual` matches in the upsert set. Response shape unchanged (`{ upserted, skipped }`, where `skipped` = count of manual matches excluded).
- `PATCH /api/admin/matches/[id]/result` (new) — body `{ home_score, away_score, status, release? }`. Email-gated. `release: true` → `is_manual = false`; otherwise sets scores/status + `is_manual = true`, `manual_updated_at = now()`. Returns `200` with the updated row; `401`/`403` on gate failure; `400` on invalid body (reuse the 0–99 integer validation from the predictions route); `404` if no match.

## Integration Points

- **openfootball** (`raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json`) — public, no auth, no key. Fetch with `next: { revalidate: 3600, tags: ['fixtures'] }` (preserve the existing cache contract). Defensive parse: a non-array/`matches`-less body throws; unknown `score` shapes fall back to `scheduled`; unmapped team strings are logged (structured) and left as-is so the gap is visible. No retry beyond the hourly cadence.

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
|-----------|-------------|---------------------|-----------------|
| `lib/football-api.ts` | rewritten | api-sports → openfootball mapper; **high** (core ingestion) | Rewrite + pin sample tests |
| `lib/team-names.ts` | new | EN→PT map (48); low | Add module + tests |
| `lib/copa-teams.ts` | modified | 6-for-6 roster swap; **medium** (drives validity/flags/champion) | Reconcile to seed 020; update `copa-teams.test.ts` |
| `lib/bracket-skeleton.ts` | modified | key slots by `num`; remove `resolveSlot`/`SLOT_BY_CALENDAR`; **high** | Rewrite slot keys; update `bracket-skeleton.test.ts`, `bracket-timestamp-format.test.ts` |
| `lib/bracket.ts` + bracket route | modified | map matches→slots by `external_id`; medium | Switch off `resolveSlot` |
| `app/api/admin/sync-matches/route.ts` | modified | exclude `is_manual`; medium | Add exclusion query; update sync tests |
| `matches` table | modified | +`is_manual`,+`manual_updated_at`; low | New migration |
| `PATCH /api/admin/matches/[id]/result` + operator page | new | operator control; medium (auth gate) | Build endpoint, page, guard |
| `supabase/seeds/*` + `tests/e2e/validation-run.spec.ts` | new | validation harness; medium | Seeds + Playwright + evidence doc |
| `env` / api-sports refs | deprecated | remove `API_FOOTBALL_KEY`, api-sports URL/types | Delete + scrub `.env.example` |

## Testing Approach

### Unit Tests

- **Adapter** (`tests/unit/`, new + extend `sync-result-ingestion.test.ts`): `mapOpenfootballMatch` against the pinned `openfootball-wc2026.json` — status derivation (score present/absent), date+offset → ISO, `external_id` synthesis (knockout `num`, Final/3rd, group key), phase/group parse for "Matchday N" vs knockout round names.
- **Normalization**: un-skip and complete `sync-team-name-normalization.test.ts` with real strings (`"South Korea"→Coreia do Sul`, `"Czech Republic"`, `"USA"`, `"Ivory Coast"`, …); assert flag resolution and `isConfirmedMatchup`.
- **Roster**: update `copa-teams.test.ts` to assert the 48 match seed 020 (no Itália; includes Irã/Iraque/Suécia/Turquia/Bósnia/RD Congo).
- **Bracket**: update `bracket-skeleton.test.ts` to map by `num`/`external_id`; assert feeds derived from `W##`/`#A`/`L##`.
- **Sync exclusion**: extend `sync-result-ingestion.test.ts` — a `is_manual` match is excluded from the upsert set; `skipped` count reported.
- **Operator endpoint**: gate (allowed email vs others), set vs release, body validation, 404.

Mock boundaries unchanged: tests mock the `fetchWorldCupFixtures` seam, `@supabase/supabase-js`, and `next/cache`.

### Integration Tests

- **Validation run** (`tests/e2e/validation-run.spec.ts`, Playwright): seed a preset state + league + 2 users, sign in via the captured SSR-cookie technique, walk scenarios 1–7, screenshot each step, emit `docs/VALIDACAO-EVIDENCIA.md`. Time-machine seed fixes the clock for deadline-lock scenarios. Environment: local app + remote/seeded Supabase per memory `reference-authed-browser-e2e`.

## Development Sequencing

### Build Order

1. **Pin the openfootball sample + roster reconciliation** — `tests/fixtures/openfootball-wc2026*.json` (done) and reconcile `lib/copa-teams.ts` to seed 020; update `copa-teams.test.ts`. No dependencies.
2. **`lib/team-names.ts` EN→PT map** — depends on step 1 (target PT names must exist).
3. **Rewrite `lib/football-api.ts` adapter** — depends on steps 1–2 (uses PT names + fixture).
4. **Re-key `lib/bracket-skeleton.ts` to `num`; update `lib/bracket.ts` + bracket route** — depends on step 3 (`external_id = wc2026-<num>`).
5. **`matches` migration (`is_manual`, `manual_updated_at`)** — no code dependency; can land parallel to 3–4 but before 6.
6. **Sync route: exclude `is_manual`** — depends on steps 3 and 5.
7. **Operator endpoint + unlisted page + `requireOperator` guard** — depends on step 5.
8. **Remove api-sports remnants** (`API_FOOTBALL_KEY`, URL, `ApiFootballFixture`, `mapFixtureStatus`) — depends on step 3.
9. **Validation seeds + Playwright run + evidence doc** — depends on steps 3, 4, 6, 7 (exercises the full corrected flow).

### Technical Dependencies

- Supabase project reachable for E2E seeding; service-role key in env for sync + tests.
- Captured SSR cookie / time-machine seed harness (memory `reference-authed-browser-e2e`).
- openfootball raw URL availability (public).

## Monitoring and Observability

Preserve the existing structured JSON logs in the sync route (`sync_start`, `sync_result_ingested` with `finished_count`/`scored_matches`, `sync_complete` with `upserted`/`duration_ms`, `api_football_error`). Add `skipped_manual` to the ingestion log and rename the error event to a source-neutral `ingestion_error`. The operator endpoint logs `operator_result_set` / `operator_result_released` with `match_id`, `set_by`, `status_code`. No alerting in MVP (Phase 3 per PRD).

## Technical Considerations

### Key Decisions

- **Decision:** Keep the `fetchWorldCupFixtures()` seam, rewrite the mapper. **Rationale:** preserves route/cron/test boundaries. **Trade-off:** legacy name for a new source. **Rejected:** full route rewrite; pluggable provider (YAGNI — api-sports is being deleted). ([ADR-006](adrs/adr-006.md))
- **Decision:** Key knockout by openfootball `num`. **Rationale:** `ground` is a city, breaking `resolveSlot`; `num` is stable and source-provided. **Trade-off:** consumers of `resolveSlot` change. **Rejected:** city→stadium translation table; flat-by-round. ([ADR-007](adrs/adr-007.md))
- **Decision:** `is_manual` columns + sync exclusion. **Rationale:** simplest durable precedence; no read-path joins. **Rejected:** enum; side table; service-role gate. ([ADR-008](adrs/adr-008.md))
- **Decision:** DB-seeded league/users + Playwright UI run with screenshots. **Rationale:** owner requires real UI + screenshots; reuses proven authed-browser harness. **Rejected:** vitest (no screenshots); manual walkthrough (not reproducible). ([ADR-009](adrs/adr-009.md))

### Known Risks

- **openfootball played-match `score` shape** is not in the pre-tournament sample (likely `score.ft: [h,a]`) → parse defensively; pin a synthetic finished fixture in tests; verify against the live source once group matches conclude. Likelihood: medium.
- **Knockout placeholder spelling** variance (`"W74"` vs `"Winner 74"`) → tolerant regex + pinned sample. Likelihood: low.
- **Roster drift** between openfootball and seed 020 over time → the captured list currently matches exactly; re-cross-check at implementation. Likelihood: low.
- **E2E brittleness / clock dependence** for deadline scenarios → time-machine seed with a fixed clock. Likelihood: medium.

## Architecture Decision Records

- [ADR-001: Lean validation-first delivery approach](adrs/adr-001.md) — MVP scoped to passing the seven validation scenarios.
- [ADR-002: Adopt openfootball as the free match-data source, with global-operator override](adrs/adr-002.md) — free 2026 data; api-sports rejected.
- [ADR-003: Seed 020 is the source of truth for the 2026 team roster](adrs/adr-003.md) — reconcile `copa-teams.ts` to the real 48.
- [ADR-004: Manual result entry locks a match from automatic overwrite](adrs/adr-004.md) — manual entries survive hourly runs.
- [ADR-005: Validation ships a reproducible, self-documenting two-user simulation across preset states](adrs/adr-005.md) — several snapshots + recorded run.
- [ADR-006: Replace api-sports with an openfootball ingestion adapter](adrs/adr-006.md) — rewrite the mapper behind the existing seam; remove api-sports.
- [ADR-007: Key the knockout bracket to openfootball `num` + W/L/seed placeholders](adrs/adr-007.md) — retire `resolveSlot(date, venue)`.
- [ADR-008: Operator result control — `is_manual` columns + unlisted gated page/API](adrs/adr-008.md) — durable manual precedence; named-account gate.
- [ADR-009: Validation harness — DB seed + Playwright UI run with screenshot evidence](adrs/adr-009.md) — real-UI run producing `VALIDACAO-EVIDENCIA.md`.
