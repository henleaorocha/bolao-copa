# TechSpec: Mata-mata — Knockout Bracket & Tournament Scoring

## Executive Summary

Mata-mata adds the 2026 World Cup knockout screen (6 phases, 32 matches) plus the product's first real scoring engine. The bracket renders from a **static TypeScript skeleton** (`lib/bracket-skeleton.ts`) holding immutable placeholder labels and official topology; real teams arrive through the **existing hourly sync, unchanged**, since it already ingests knockout fixtures (teams + flags). A new server endpoint `GET /api/leagues/[id]/bracket` merges skeleton with live matches by `(phase, slot)` — resolving slot at read time via an official-calendar lookup (date+venue) — and returns a ready-to-render 6-phase structure with per-slot state, multipliers, the user's prediction, and a derived phase-unlock signal. Knockout predictions reuse the existing per-match `PUT` endpoint. Scoring is implemented as **pure compute-on-read functions** (`lib/scoring.ts`) consumed by the league API to replace its hardcoded zeros; a separate, required extension teaches the sync to ingest match **results** (status + scores), which it does not do today.

**Primary trade-off:** we favor immutable config-in-code and compute-on-read simplicity (no skeleton migration, no slot column, no persisted scores, no new write paths) over a single-DB-source-of-truth model. The cost is a server-side merge in the bracket endpoint and per-request ranking computation — both cheap at friends-pool scale, and both centralized and unit-testable.

## System Architecture

### Component Overview

- **`lib/bracket-skeleton.ts` (new, config):** 32 immutable slot definitions — `phase`, slot position, home/away placeholder labels (`"Vencedor 1º Grupo A"`, `"Vencedor 1/16 #1"`), feeder topology, and an official-calendar key (`date`+`venue`). Single source of truth for bracket structure and labels.
- **`lib/scoring.ts` (new, pure):** `PHASE_MULTIPLIERS` + `scoreGroup`/`scoreKnockout`/`scoreChampion`. No I/O; unit-tested against known fixtures.
- **`GET /api/leagues/[id]/bracket` (new):** merges skeleton + live matches (slot resolved on read), attaches the user's predictions, derives per-slot `state` and the unlock signal. Thin client consumes this directly.
- **`app/ligas/[id]/mata-mata/` (new screen):** `page.tsx` + components (status banner, phase selector, match card). Pure renderer of the `/bracket` payload; responsive (desktop bracket + mobile single-column).
- **`app/api/leagues/[id]/route.ts` (modified):** replaces hardcoded `points/exact_scores/ranking = 0` with real values computed via `lib/scoring.ts`.
- **`app/api/admin/sync-matches/route.ts` + `lib/football-api.ts` (modified, Phase 3):** extend the fixture interface and mapping to ingest `status` (scheduled/live/finished) and `home_score`/`away_score` — currently the sync hardcodes `status: 'scheduled'` and never writes scores.
- **Navigation (modified):** `PainelSidebar` enables the Mata-mata item (→ `/ligas/[id]/mata-mata`) with a derived dot; `BottomTabBar` replaces Perfil with Mata-mata and reorders to **Mata-mata · Tabela · Painel · Palpites · Ranking** (Painel centered).

**Data flow (bracket read):** client → `/bracket` → `[static skeleton] + [SELECT matches WHERE phase IN knockout] + [SELECT user predictions]` → merge by `(phase, slot)` → phased payload. No external call on the page-load path.

**Data flow (scoring read):** client → `/api/leagues/[id]` → `[SELECT predictions + champion_bets + finished matches]` → reduce through `lib/scoring.ts` → `user_stats` + ranking.

## Implementation Design

### Core Interfaces

```typescript
// lib/bracket-skeleton.ts
export type KnockoutPhase = '32nd' | '16th' | '8th' | 'semi' | '3rd_place' | 'final'
export interface BracketSlot {
  phase: KnockoutPhase
  pos: number                 // 1-based within phase; #1..#16 in R32
  homeLabel: string           // "Vencedor 1º Grupo A"
  awayLabel: string           // "Vencedor 2º Grupo B"
  feeds?: { phase: KnockoutPhase; pos: number; side: 'home' | 'away' }
  calendarKey: { date: string; venue: string }   // official-schedule lookup key
}
export const BRACKET_SKELETON: readonly BracketSlot[]   // 32 entries
export const PHASE_ORDER: readonly KnockoutPhase[]      // render order

// /bracket response — the type the screen depends on
export type SlotState = 'placeholder' | 'open' | 'locked' | 'finished'
export interface BracketSlotView {
  pos: number; state: SlotState; multiplier: number
  homeTeam: string | null; awayTeam: string | null
  homeFlag: string | null; awayFlag: string | null
  homeLabel: string; awayLabel: string
  matchId: string | null; kickoff: string | null
  homeScore: number | null; awayScore: number | null
  prediction: { home: number; away: number } | null
}
export interface BracketPhaseView { phase: KnockoutPhase; label: string; multiplier: number; slots: BracketSlotView[] }
export interface BracketResponse { phases: BracketPhaseView[]; newlyUnlockedPhase: KnockoutPhase | null }
```

```typescript
// lib/scoring.ts
export const PHASE_MULTIPLIERS: Record<KnockoutPhase, number> =
  { '32nd': 1.5, '16th': 2, '8th': 2.5, semi: 3, '3rd_place': 3.5, final: 4 }
export interface ScoreInput { ph: number; pa: number; rh: number; ra: number } // predicted vs real
export function scoreGroup(i: ScoreInput): number          // 10 exact / 5 outcome / 0
export function scoreKnockout(i: ScoreInput, phase: KnockoutPhase): number // scoreGroup × multiplier
export function scoreChampion(pickChamp: string, pickVice: string,
  realChamp: string | null, realVice: string | null): number               // +50 / +25
```

### Data Models

- **No schema changes.** `matches`, `predictions`, `champion_bets` are reused as-is.
- **`matches`** (existing): `phase` ∈ `('group','32nd','16th','8th','4th','semi','3rd_place','final')` — only `32nd,16th,8th,semi,3rd_place,final` are used by knockout (the `'4th'` enum value is dead). `home_team/away_team/home_flag/away_flag/venue/city/match_date/status/home_score/away_score/external_id` consumed by the merge and scoring.
- **"Confirmed" predicate:** a knockout slot is confirmed (real teams) when a matching `matches` row exists with both flags resolved (i.e., both team names in `VALID_TEAM_NAMES`). Only confirmed slots become `open`.
- **`scores`** (existing): remains **unused** (compute-on-read). Left in place; not dropped.

### API Endpoints

- **`GET /api/leagues/[id]/bracket`** → `200 { phases, newlyUnlockedPhase }` (shape above). Guards mirror `/matches`: `401` session, `403` non-member, `404` league. Slot `state`: `placeholder` (no confirmed match), `open` (confirmed & before lock), `locked` (within deadline window), `finished` (`status='finished'`).
- **`PUT /api/leagues/[id]/predictions/[matchId]`** (existing, +1 guard): add a "match confirmed (real teams)" check rejecting bets on unconfirmed knockout matches; keeps the existing 1-hour-before-kickoff `DEADLINE_PASSED` rule.
- **`GET /api/leagues/[id]`** (existing, modified): returns computed `user_stats` and ranking instead of zeros.

## Integration Points

- **API-Football (`v3.football.api-sports.io`, `league=1&season=2026`):** unchanged for bracket fill (already returns knockout teams/flags). **Phase 3 extension:** read `fixture.status.short` (map `NS→scheduled`, live codes→`live`, `FT/AET/PEN→finished`) and `goals.home/away` into `home_score/away_score`. Auth and the hourly pg_cron trigger (`0 * * * *`, migration `20260526000021`) are unchanged. No external call on any page-load path.

## Impact Analysis

| Component | Impact | Description & Risk | Required Action |
|---|---|---|---|
| `lib/bracket-skeleton.ts` | new | Immutable 32-slot config + calendar keys. Low risk; wrong key = cosmetic mislabel. | Author skeleton from official 2026 schedule |
| `lib/scoring.ts` | new | Pure scoring; high-stakes correctness. | Implement + exhaustive unit tests |
| `app/api/leagues/[id]/bracket/route.ts` | new | Merge + state + unlock signal. Medium. | Build endpoint + integration tests |
| `app/ligas/[id]/mata-mata/*` | new | Screen, desktop + mobile (no h-scroll). Medium. | Build + manual mobile verify |
| `app/api/leagues/[id]/route.ts` | modified | Replace zeros with computed ranking. High (touches existing surface). | Wire scoring; keep response shape; tests |
| `app/api/admin/sync-matches/route.ts`, `lib/football-api.ts` | modified | Ingest results (status+scores) — **gap today**. High (scoring depends on it). | Extend interface + mapping; tests |
| `predictions/[matchId]/route.ts` | modified | Confirmed-teams guard. Low. | Add guard + test |
| `PainelSidebar.tsx`, `BottomTabBar.tsx` | modified | Enable Mata-mata; reorder mobile tabs (Perfil→Mata-mata). Low. | Update nav + dot + tests |
| `scores` table | deprecated-in-practice | Unused under compute-on-read. None. | Leave as-is; note in spec |

## Testing Approach

### Unit Tests
- **`lib/scoring.ts`**: exact/outcome/miss for group; every multiplier for knockout (1.5×–4×); champion/vice hits/misses; integer-multiplier results. Table-driven against documented scheme — the trust-critical surface.
- **`lib/bracket-skeleton.ts`**: 32 slots; counts per phase (16/8/4/2/1/1); unique `(phase,pos)`; feeder references resolve; calendar keys unique.
- **Merge/state derivation** (extracted pure helper): placeholder vs open vs locked vs finished; confirmed predicate (TBD names → placeholder); `newlyUnlockedPhase` logic.

### Integration Tests (Vitest + mocked Supabase, per existing `tests/integration` pattern)
- `/bracket`: auth/membership guards; pre-Copa all-placeholder; partial fill (some R32 confirmed); locked & finished states; prediction attached.
- `/api/leagues/[id]`: ranking reflects group + champion + multiplier-weighted knockout points (replaces zero assertions).
- Sync result ingestion: fixture `FT` + goals → `status='finished'` + scores; `NS` → scheduled.
- Predictions guard: reject unconfirmed-match bet; allow confirmed; deadline still enforced.

## Development Sequencing

### Build Order
1. **`lib/bracket-skeleton.ts`** — no dependencies. Static config + calendar lookup.
2. **`GET /bracket` endpoint** — depends on (1). Merge + state + unlock signal; returns `BracketResponse`.
3. **Mata-mata screen (desktop + mobile) + nav changes** — depends on (2). Renders payload; enables sidebar item + reorders bottom bar. *(Completes MVP / PRD Phase 1: F1, F2, F3, F7.)*
4. **Predictions confirmed-guard** — depends on (1) for the confirmed predicate; reuses existing PUT. *(PRD Phase 2: F4.)*
5. **Phase-unlock indicator wiring** — depends on (2) and (3); surfaces `newlyUnlockedPhase` as banner + nav dot. *(PRD Phase 2: F5.)*
6. **`lib/scoring.ts`** — no dependencies (pure). *(Start of PRD Phase 3.)*
7. **Sync result ingestion** (`football-api.ts` + `sync-matches`) — depends on nothing in this list but is a prerequisite for meaningful (6) output. Ingests status + scores.
8. **League API scoring wiring** — depends on (6) and (7). Replaces hardcoded zeros in `user_stats` + ranking. *(Completes F6.)*

### Technical Dependencies
- Official 2026 knockout schedule (dates + venues) to author the skeleton calendar keys.
- API-Football exposing `fixture.status` + `goals` (standard fields) for result ingestion.
- No new infrastructure; reuses the existing hourly pg_cron.

## Monitoring and Observability
- Reuse the existing structured JSON logging. Add events: `bracket_viewed` (league_id, confirmed_slots, duration_ms); `sync_result_ingested` (finished_count, scored_matches) on the sync; `prediction_rejected_unconfirmed` on the guard.
- Watch sync logs for unmapped knockout fixtures (calendar-key miss) — surfaces as a slot that never fills despite a confirmed feed match.

## Technical Considerations

### Key Decisions
- **Static skeleton + read-time slot mapping (ADR-004):** immutable topology in code; no migration, no sync change for fill; slot resolved by date+venue on read. Trade-off: client/endpoint merge vs DB single-source.
- **Compute-on-read scoring (ADR-005):** pure functions in the league API; no persistence/triggers. Trade-off: per-request compute vs always-correct, single testable path.
- **Dedicated `/bracket` + derived unlock indicator (ADR-006):** thin client; no "seen" persistence. Trade-off: banner may reappear until the user bets.
- **Reuse prediction endpoint + 1h-before-kickoff lock:** consistency with group stage. *PRD says "at kickoff" — flagged for product confirmation (open question).*

### Known Risks
- **Scoring correctness (high stakes).** Mitigation: documented scheme as single source of truth; exhaustive table-driven unit tests before R32 results (2026-06-28).
- **Result-ingestion gap is on the critical path** for F6 and easy to overlook (sync hardcodes `scheduled`). Mitigation: explicit build step (7) + integration test.
- **Calendar-key drift** if the feed shifts a knockout date/venue. Mitigation: skeleton degrades to placeholder (no crash); log unmapped fixtures.
- **`'4th'` dead enum / lock-timing wording**: documented as known, no action unless product decides.

## Architecture Decision Records
- [ADR-001: Knockout Matchup Auto-Fill via Static Skeleton + Sync](adrs/adr-001.md) — Product owns the placeholder skeleton; the feed is the authority on advancement.
- [ADR-002: Standard Per-Phase Betting Model](adrs/adr-002.md) — Members bet real confirmed matchups as phases unlock.
- [ADR-003: Mata-mata Establishes the Full-Tournament Scoring Engine](adrs/adr-003.md) — One engine for group, champion/vice, and knockout.
- [ADR-004: Bracket Skeleton as Static Code + Slot Mapping via Official Calendar](adrs/adr-004.md) — Immutable TS skeleton; slot resolved at read time by date+venue; no migration.
- [ADR-005: Compute-on-Read Scoring with Pure Functions](adrs/adr-005.md) — Pure `lib/scoring.ts` computed in the league API; `scores` table unused.
- [ADR-006: Dedicated /bracket Endpoint with Derived Phase-Unlock Indicator](adrs/adr-006.md) — Server-side merge + data-derived unlock signal, no persistence.
