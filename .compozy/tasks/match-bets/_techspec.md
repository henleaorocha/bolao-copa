# TechSpec: Match Betting (Palpites) — Copa do Mundo 2026

## Executive Summary

The match betting feature adds score prediction capability on top of the existing Supabase schema (`matches` and `predictions` tables already exist). The primary architectural work is a **three-layer integration**: (1) a server-side sync job that pulls Copa 2026 fixture data from API Football and upserts it into the `matches` table; (2) four new Route Handler endpoints that serve match lists with embedded user predictions; and (3) two new Next.js App Router pages (`/ligas/[id]/palpites` and `/ligas/[id]/palpites/[matchId]`) with client components that drive the betting UX.

The primary trade-off is **sync-based data freshness vs. real-time API polling**. By writing API Football data into Supabase, predictions always have a stable FK reference (`matches.id`) and the app stays functional if the external API goes down. The cost is that schedule changes (postponed matches) require a re-sync rather than being reflected instantly.

---

## System Architecture

### Component Overview

```
[API Football v3]
      │ GET /fixtures?league=1&season=2026
      │ (Next.js fetch cache, 1h TTL)
      ▼
lib/football-api.ts ──► POST /api/admin/sync-matches
                              │ upserts
                              ▼
                        [Supabase: matches table]
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
  GET /api/leagues/      GET /api/leagues/  PUT /api/leagues/
  [id]/matches           [id]/matches/      [id]/predictions/
  (list + predictions)   [matchId]          [matchId]
  (detail + distribution)(upsert)
              │               │               │
              ▼               ▼               ▼
  UpcomingMatchesCard   BetHero +          write to
  (panel widget)        DistributionCard   predictions table
              │
              ▼
  /ligas/[id]/palpites   (Palpites full-page list)
              │
              ▼
  /ligas/[id]/palpites/[matchId]  (Bet detail screen)
```

**Data flow summary:**
1. Sync job writes API Football fixture data into `matches` (one-time + periodic).
2. League-scoped match endpoints join `matches` with the current user's `predictions`.
3. Client components display match data and post predictions via `PUT`.
4. The server enforces the 1h deadline before accepting prediction writes.

---

## Implementation Design

### Core Interfaces

```typescript
// lib/api/types.ts — additions

export interface Match {
  id: string
  external_id: string | null
  home_team: string
  away_team: string
  home_flag: string | null   // 2-letter ISO code for flagcdn.com/w80/{code}.png
  away_flag: string | null
  match_date: string          // ISO 8601
  phase: 'group' | '32nd' | '16th' | '8th' | '4th' | 'semi' | '3rd_place' | 'final'
  group: string | null        // 'A'–'L'
  status: 'scheduled' | 'live' | 'finished'
  home_score: number | null
  away_score: number | null
  venue: string | null
  city: string | null
}

export interface Prediction {
  id: string
  match_id: string
  predicted_home_score: number
  predicted_away_score: number
  updated_at: string
}

export interface MatchWithPrediction extends Match {
  prediction: Pick<Prediction, 'predicted_home_score' | 'predicted_away_score'> | null
  is_deadline_passed: boolean   // server-computed: match_date - 1h < now()
}

export interface OutcomeDistribution {
  home_win: number    // percentage 0–100
  draw: number
  away_win: number
  total_predictions: number
}

export interface MatchDetail extends MatchWithPrediction {
  distribution: OutcomeDistribution | null  // null until is_deadline_passed
}
```

```typescript
// lib/football-api.ts — public interface

export interface ApiFootballFixture {
  fixture: { id: number; date: string; venue: { name: string; city: string } }
  league: { round: string; group: string | null }
  teams: {
    home: { name: string; logo: string }
    away: { name: string; logo: string }
  }
}

export async function fetchWorldCupFixtures(): Promise<ApiFootballFixture[]>
// Calls GET /fixtures?league=1&season=2026&status=NS-1H-HT-2H-ET-BT-P-SUSP-INT-PST-LIVE-FT
// with next: { revalidate: 3600, tags: ['fixtures'] }
// Throws if response is not ok; caller handles fallback
```

### Data Models

#### `matches` table — new columns (migration)

```sql
ALTER TABLE matches
  ADD COLUMN external_id  TEXT UNIQUE,
  ADD COLUMN venue        TEXT,
  ADD COLUMN city         TEXT,
  ADD COLUMN home_flag    TEXT,   -- 2-letter ISO, e.g. 'br', 'gb-eng'
  ADD COLUMN away_flag    TEXT;

CREATE INDEX idx_matches_external_id ON matches (external_id);
CREATE INDEX idx_matches_phase_status ON matches (phase, status);
```

The existing `home_team`, `away_team`, `match_date`, `phase`, `group`, `status`, `home_score`, `away_score` columns are reused without change.

#### `predictions` table — no schema changes required

The existing schema (`UNIQUE(user_id, league_id, match_id)`, `predicted_home_score INTEGER`, `predicted_away_score INTEGER`) is sufficient. The `updated_at` column is already present.

#### Sync upsert logic

```sql
INSERT INTO matches (external_id, home_team, away_team, home_flag, away_flag,
                     match_date, phase, "group", venue, city, status)
VALUES (...)
ON CONFLICT (external_id)
DO UPDATE SET
  home_team  = EXCLUDED.home_team,
  away_team  = EXCLUDED.away_team,
  match_date = EXCLUDED.match_date,
  venue      = EXCLUDED.venue,
  city       = EXCLUDED.city,
  status     = EXCLUDED.status;
```

Flag code resolution: look up `teams.home.name` in `ALL_COPA_TEAMS` (from `lib/copa-teams.ts`). Use `team.code` if found; store `null` if not. The flag URL pattern is `https://flagcdn.com/w80/{code}.png` (already whitelisted in `next.config.ts`).

### API Endpoints

#### `POST /api/admin/sync-matches`

Fetches all 104 Copa 2026 fixtures from API Football and upserts them into `matches`. Protected: requires `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` header (not user session).

```
POST /api/admin/sync-matches
Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>

Response 200:
{ "status": "success", "data": { "upserted": 104, "skipped": 0 } }

Response 401: missing/invalid service key
Response 500: API Football unreachable or DB error
```

After a successful upsert, **deletes all rows where `external_id IS NULL`** (the 104 seeded placeholder rows) and calls `revalidateTag('fixtures')` to invalidate the Next.js fetch cache.

Sync sequence (atomic in a single transaction):
1. Upsert all API Football fixtures (on conflict `external_id`, update all fields).
2. `DELETE FROM matches WHERE external_id IS NULL;` — removes every placeholder that was never matched by a real fixture.

This guarantees that after the first sync, the `matches` table contains only real Copa 2026 data with no stale placeholders.

---

#### `GET /api/leagues/[id]/matches`

Returns matches for the authenticated user's league context, with the user's predictions embedded. The user must be a member of the league.

**Query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `next` | number | Return N next scheduled matches (used by panel widget; `next=4`) |
| `phase` | `'group'` | Filter to group-stage matches only (used by Palpites page) |
| `date` | `'today' \| 'tomorrow'` | Filter by kickoff date (used by Palpites tab filters) |
| `group` | `'A'–'L'` | Filter by group (used by group chip filter) |

All params are optional and combinable. If neither `next` nor `phase` is set, returns all scheduled matches (fallback for admin use).

```
GET /api/leagues/abc/matches?phase=group&date=today
Authorization: Cookie (Supabase session)

Response 200:
{
  "status": "success",
  "data": {
    "matches": MatchWithPrediction[],
    "total": 12
  }
}

Response 401: not authenticated
Response 403: not a league member
Response 404: league not found
```

Server-side `is_deadline_passed` computation: `match.match_date < new Date(Date.now() + 60 * 60 * 1000)` (deadline = 1h before kickoff).

---

#### `GET /api/leagues/[id]/matches/[matchId]`

Returns a single match with the user's prediction and (if deadline passed) the aggregate distribution for this league.

```
GET /api/leagues/abc/matches/match-uuid
Authorization: Cookie (Supabase session)

Response 200:
{
  "status": "success",
  "data": MatchDetail
}

Response 401/403/404: standard errors
```

Distribution query (runs only when `is_deadline_passed === true`):

```sql
SELECT
  COUNT(*) FILTER (WHERE predicted_home_score > predicted_away_score) AS home_wins,
  COUNT(*) FILTER (WHERE predicted_home_score = predicted_away_score) AS draws,
  COUNT(*) FILTER (WHERE predicted_home_score < predicted_away_score) AS away_wins,
  COUNT(*) AS total
FROM predictions
WHERE league_id = $1 AND match_id = $2;
```

---

#### `PUT /api/leagues/[id]/predictions/[matchId]`

Upserts the authenticated user's prediction for a match in a specific league.

```
PUT /api/leagues/abc/predictions/match-uuid
Authorization: Cookie (Supabase session)
Content-Type: application/json

Body: { "home_score": 2, "away_score": 1 }

Response 200:
{
  "status": "success",
  "data": {
    "match_id": "...",
    "predicted_home_score": 2,
    "predicted_away_score": 1,
    "updated_at": "..."
  }
}

Response 400: invalid scores (non-integer, negative, missing field)
Response 401: not authenticated
Response 403: not a league member OR deadline passed (match_date - 1h < now())
Response 404: match not found
```

Deadline enforcement is server-side only. The 403 response for a passed deadline uses error code `DEADLINE_PASSED`.

**Upsert:**
```typescript
await supabase.from('predictions').upsert({
  user_id: user.id,
  league_id: leagueId,
  match_id: matchId,
  predicted_home_score: homeScore,
  predicted_away_score: awayScore,
  updated_at: new Date().toISOString(),
}, { onConflict: 'user_id,league_id,match_id' })
```

---

## Integration Points

### API Football v3

- **Base URL:** `https://v3.football.api-sports.io`
- **Auth header:** `x-apisports-key: <API_FOOTBALL_KEY>` (env var, server-only)
- **Endpoint used:** `GET /fixtures?league=1&season=2026` (returns all 104 Copa 2026 fixtures)
- **Rate limit:** 100 req/day on free tier. The sync endpoint calls this once per trigger; the Next.js fetch cache with `revalidate: 3600` ensures at most 24 calls/day even without the service cache.
- **Error handling:** If the API call fails (non-200, network error, malformed JSON), `lib/football-api.ts` throws. The sync endpoint catches and returns a 500. The UI is not affected because it reads from the `matches` table, not from the API directly.
- **Fallback:** If API Football is unreachable during sync, the last successfully synced data in the `matches` table is served. A stale-data banner is shown if the newest `match_date` in the DB is more than 48h old relative to the next scheduled match.

**New environment variable:**
```bash
# .env.example addition
API_FOOTBALL_KEY=<your-api-football-key>  # server-only, never NEXT_PUBLIC_
```

---

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
|-----------|-------------|---------------------|-----------------|
| `supabase/migrations/` | new | Add 5 columns to `matches`, 2 new indexes. Existing 104 seeded placeholder rows are purged on first sync (see sync endpoint). | Write and apply migration before sync |
| `lib/api/types.ts` | modified | Add `Match`, `Prediction`, `MatchWithPrediction`, `MatchDetail`, `OutcomeDistribution` | Add types; no breaking changes |
| `lib/football-api.ts` | new | API Football client with Next.js fetch cache | New file |
| `app/api/admin/sync-matches/route.ts` | new | Protected sync endpoint | New file |
| `app/api/leagues/[id]/matches/route.ts` | new | Match list endpoint | New file |
| `app/api/leagues/[id]/matches/[matchId]/route.ts` | new | Match detail endpoint | New file |
| `app/api/leagues/[id]/predictions/[matchId]/route.ts` | new | Prediction upsert endpoint | New file |
| `app/ligas/[id]/components/UpcomingGamesStub.tsx` | deprecated | Replaced by `UpcomingMatchesCard.tsx` | Remove after new component is wired in |
| `app/ligas/[id]/components/UpcomingMatchesCard.tsx` | new | Real match data widget for panel | New component |
| `app/ligas/[id]/page.tsx` | modified | Swap `UpcomingGamesStub` for `UpcomingMatchesCard` | Low risk; one import change |
| `app/ligas/[id]/palpites/page.tsx` | new | Full Palpites list page | New page |
| `app/ligas/[id]/palpites/[matchId]/page.tsx` | new | Bet detail screen | New page |
| `.env.example` | modified | Add `API_FOOTBALL_KEY` | Add entry |
| `next.config.ts` | check | `flagcdn.com` is already whitelisted — no change needed | Verify |

---

## Testing Approach

### Unit Tests

**`tests/unit/football-api.test.ts`**
- Mock `fetch` to return a fixture of 3 API Football match objects.
- Assert that `fetchWorldCupFixtures()` returns the parsed array.
- Assert that a non-200 response causes a throw.
- Assert that the Next.js cache options (`revalidate: 3600, tags: ['fixtures']`) are passed to `fetch`.

**`tests/unit/sync-matches-api.test.ts`**
- Mock `fetchWorldCupFixtures()` to return 2 fixture objects.
- Assert the route upserts exactly 2 rows into the `matches` table.
- Assert that a missing `Authorization` header returns 401.
- Assert that an incorrect key returns 401.

**`tests/unit/league-matches-api.test.ts`**
- Seed 4 `matches` rows and 2 `predictions` rows for a test user + league.
- Call `GET /api/leagues/[id]/matches?next=4` and assert all 4 matches are returned.
- Assert that 2 matches have non-null `prediction` fields.
- Assert that `is_deadline_passed` is `true` for matches where `match_date < now() + 1h`.
- Assert 403 for a user who is not a league member.

**`tests/unit/predictions-put-api.test.ts`**
- Assert that `PUT` with `{ home_score: 2, away_score: 1 }` upserts a `predictions` row.
- Assert idempotency: calling PUT twice updates the same row (count stays 1).
- Assert 400 for `{ home_score: -1, away_score: 0 }`.
- Assert 403 with code `DEADLINE_PASSED` when the match is within 1h of kickoff.
- Assert 403 for a non-member user.

### Integration Tests

**`tests/integration/palpites-page.test.tsx`**
- Render `<PalpitesPage />` with mocked fetch responses.
- Assert that filter tabs (Todos/Hoje/Amanhã) change the displayed match list.
- Assert that group chip filter works.
- Assert that rows past deadline show "FECHADO" and disabled inputs.
- Assert that "Salvar todos" calls PUT for each row with unsaved input.

**`tests/integration/bet-screen.test.tsx`**
- Render `<BetScreen />` for a match with an existing prediction.
- Assert score inputs are pre-filled.
- Assert "Salvar palpite" is enabled with any non-negative score.
- Assert the unsaved-changes modal appears on back navigation with unsaved input.
- Assert "Salvar e sair" triggers PUT then navigates.
- Assert "Sair sem salvar" navigates without PUT.
- Assert distribution panel is visible for a post-deadline match and hidden otherwise.

**Test data:** use existing `createTestMatch`, `createTestPrediction`, `createTestLeague`, `addTestLeagueMember` factories from `tests/fixtures/factories.ts`.

---

## Development Sequencing

### Build Order

1. **DB migration** — no dependencies. Add `external_id`, `venue`, `city`, `home_flag`, `away_flag` columns to `matches`; add indexes.

2. **TypeScript types** — depends on step 1 (column names finalized). Add `Match`, `Prediction`, `MatchWithPrediction`, `MatchDetail`, `OutcomeDistribution` to `lib/api/types.ts`.

3. **`lib/football-api.ts`** — depends on step 2 (uses `ApiFootballFixture` interface). Implement `fetchWorldCupFixtures()` with `next: { revalidate: 3600, tags: ['fixtures'] }`. Add `API_FOOTBALL_KEY` to `.env.example`.

4. **`POST /api/admin/sync-matches`** — depends on steps 2 and 3. Fetch fixtures, look up flag codes via `ALL_COPA_TEAMS`, upsert into `matches`, call `revalidateTag('fixtures')`.

5. **`GET /api/leagues/[id]/matches`** — depends on step 2. Query `matches` + left-join `predictions` for the authenticated user; compute `is_deadline_passed`. Supports `next`, `phase`, `date`, `group` params.

6. **`GET /api/leagues/[id]/matches/[matchId]`** — depends on step 5 (same query pattern, single row). Add distribution query when deadline passed.

7. **`PUT /api/leagues/[id]/predictions/[matchId]`** — depends on step 2. Validate deadline server-side; upsert via `onConflict: 'user_id,league_id,match_id'`.

8. **`UpcomingMatchesCard` component** — depends on step 5 (calls `/api/leagues/[id]/matches?next=4`). Client component; fetches on mount; renders up to 4 match cards with prediction status; "Ver Todos" link to `/ligas/[id]/palpites`.

9. **League panel wiring** — depends on step 8. In `app/ligas/[id]/page.tsx`: replace `<UpcomingGamesStub />` import with `<UpcomingMatchesCard leagueId={leagueId} />`.

10. **Palpites list page** — depends on steps 5 and 7. `app/ligas/[id]/palpites/page.tsx` + `MatchRow`, `PalpitesFilters` components; client-side filter state; "Salvar todos" batches PUT calls.

11. **Bet detail screen** — depends on steps 6 and 7. `app/ligas/[id]/palpites/[matchId]/page.tsx` + `BetHero`, `ScoringCard`, `DistributionCard`, `UnsavedModal` components. `useRouter` for back navigation with dirty-state check.

12. **Tests** — depends on all previous steps.

### Technical Dependencies

- `API_FOOTBALL_KEY` environment variable must be set before the sync route runs. Obtain from https://dashboard.api-football.com.
- The migration (step 1) must be applied to both local Supabase (`supabase db push`) and the production project before deployment.
- The sync (`POST /api/admin/sync-matches`) must be called at least once before the Palpites UI returns real data. On first run it upserts all real fixtures then deletes all placeholder rows (`external_id IS NULL`). The `matches` table is clean after a single sync call.

---

## Monitoring and Observability

All API routes follow the existing logging pattern (timestamp, endpoint, method, status, duration_ms). The following additional log fields should be emitted:

| Event | Log Fields |
|-------|-----------|
| Sync started | `event: 'sync_start'` |
| Sync completed | `event: 'sync_complete', upserted: N, duration_ms: N` |
| API Football fetch failed | `event: 'api_football_error', status: N, message: string` |
| Prediction saved | `event: 'prediction_saved', match_id, league_id, is_update: boolean` |
| Deadline violation attempt | `event: 'prediction_rejected_deadline', match_id, user_id` |

**Key metrics to track:**
- `sync_complete.upserted` — should equal 104 after a full sync; deviations indicate partial data.
- `api_football_error` count — alert if > 0 on matchday (indicates quota exhaustion or API downtime).
- `prediction_rejected_deadline` count — spikes indicate users trying to bet after deadline; UX feedback is working if this matches "FECHADO" badge impressions.
- Palpites page load time (p75 < 3s) — monitor via Vercel Analytics.

---

## Technical Considerations

### Key Decisions

**1. Sync-based match data over real-time API Football calls**
- Chosen: upsert API Football fixtures into `matches` table.
- Rationale: preserves referential integrity of `predictions → matches`; app works offline from API Football; scoring system already reads `matches.home_score`.
- Trade-off: schedule changes require a re-sync. Mitigated by running sync daily + on-demand.

**2. Server-side deadline enforcement at the API layer**
- The `PUT /api/leagues/[id]/predictions/[matchId]` handler recomputes `match.match_date - 1h > now()` on every write. Client-side UI disables inputs, but the server is the authority.
- Trade-off: one extra DB row fetch per write. Acceptable given the security requirement.

**3. Prediction distribution computed on read, not cached**
- The `GET /api/leagues/[id]/matches/[matchId]` endpoint runs a COUNT aggregation against `predictions` on every request.
- Rationale: the distribution changes as more members bet; league sizes (typically < 50 members) make this aggregation sub-millisecond. No caching needed.
- Trade-off: if a league grows very large (> 1,000 members), this could become a bottleneck. At that scale, materialize the distribution as a DB view.

### Known Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| API Football name mismatch with `copa-teams.ts` (flag resolution fails) | Medium | Store flag as `null` if name not found; show placeholder flag; fix mapping in sync code |
| Copa 2026 schedule not fully published when sync runs | Medium | Sync returns what's available; partial upsert is safe; knockout rows remain as DB placeholders |
| `revalidateTag` doesn't work in local dev (`next dev`) | High | Document in README: call sync endpoint manually in dev; Next.js fetch cache is opt-out in dev mode |
| User in two leagues bets on same match — data isolation | Low | `UNIQUE(user_id, league_id, match_id)` enforces isolation; each league's distribution is independent |
| Prediction saved but UI shows old state (stale client cache) | Low | After PUT 200, mutate local state optimistically; re-fetch on focus (`window.addEventListener('focus', ...)`) as a safety net |

---

## Architecture Decision Records

- [ADR-001: Dedicated Bet Screen + Full Palpites Page as Primary Betting Experience](adrs/adr-001.md) — Chose full-screen dedicated bet page over inline panel bets or single-surface list editing.
- [ADR-002: Sync API Football Fixture Data Into the Existing `matches` Table](adrs/adr-002.md) — Upsert approach with `external_id` column preserves FK integrity for predictions and the scoring pipeline.
- [ADR-003: Next.js Fetch Cache With Revalidate Tags for API Football Responses](adrs/adr-003.md) — Native App Router caching with 1h TTL; zero extra infrastructure; bounded by sync triggers not UI traffic.
- [ADR-004: PUT Upsert for Prediction Save/Update API](adrs/adr-004.md) — Single `PUT /api/leagues/[id]/predictions/[matchId]` handles both create and update; matches DB UNIQUE constraint semantics.
