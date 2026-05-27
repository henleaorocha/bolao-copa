# TechSpec: League Ranking Screen

## Executive Summary

This feature adds a dedicated `/ligas/[id]/ranking` route that renders the full league standings: a top-3 podium, a conditional prize strip, a highlighted "Sua posição" card, and a complete classification table of every member. The core technical work is server-side: extract the existing inline scoring logic from `GET /api/leagues/[id]` into a pure, unit-testable helper at `lib/ranking.ts`, add a new most-recent-exact-score tiebreaker (replacing `joined_at`), and expose the full ordered list through a new dedicated endpoint `GET /api/leagues/[id]/ranking`. The panel endpoint is refactored to consume the same helper and slice to its top 5, guaranteeing a single source of truth for ranking order.

The primary trade-off: rather than overloading the hot, shared panel endpoint, we accept one additional route and a client-side fetch-on-mount on the ranking page (a brief loading state) in exchange for a lean panel payload and clean separation between the compact panel view and the full ranking screen. The ranking page is a client component that follows the established mata-mata pattern — using `LeaguePanelContext` for user identity and league metadata while fetching its own list data.

## System Architecture

### Component Overview

**Server layer**
- `lib/ranking.ts` (new) — Pure `computeRanking()` function. Takes already-fetched rows (members, predictions, finished matches with `match_date`, champion bets) and returns the fully ordered list with per-member points, exact-score count, correct-outcome count, and final positions. Hosts the tiebreaker comparator. Performs no I/O.
- `app/api/leagues/[id]/ranking/route.ts` (new) — `GET` handler. Membership-guarded, fetches league data, delegates ordering to `computeRanking()`, returns the full list.
- `app/api/leagues/[id]/route.ts` (modified) — Refactored to call `computeRanking()` and slice to the top 5; tiebreaker behavior changes from `joined_at` to the new rule.

**Client layer**
- `app/ligas/[id]/ranking/page.tsx` (new) — Client component. Reads `currentUser` and `league` (prizes, name) from `LeaguePanelContext`; fetches `/api/leagues/[id]/ranking` on mount; composes the screen.
- `app/ligas/[id]/ranking/Podium.tsx` (new) — Top-3 visual podium (2nd | 1st | 3rd layout).
- `app/ligas/[id]/ranking/RankingTable.tsx` (new) — Full classification table with responsive columns and self-row highlight.
- `app/ligas/[id]/components/PrizesStrip.tsx` (reused as-is) — Conditional prize block.
- `app/ligas/[id]/components/BottomTabBar.tsx` and `PainelSidebar.tsx` (modified) — Activate the disabled "Ranking" nav slot.

**Data flow**: Ranking page mounts → reads identity/league from context → `fetch('/api/leagues/[id]/ranking')` → endpoint fetches Supabase rows → `computeRanking()` orders them → JSON full list → page renders Podium + PrizesStrip + "Sua posição" card + RankingTable. The panel page's `RankingCard` continues to receive a 5-item list from the (refactored) `GET /api/leagues/[id]` via context.

## Implementation Design

### Core Interfaces

```typescript
// lib/ranking.ts
export interface RankingMemberInput {
  user_id: string
  full_name: string | null
  avatar_color: string
  joined_at: string
}
export interface RankingMatchInput {
  id: string
  phase: string                 // 'group' | '32nd' | '16th' | '8th' | 'semi' | '3rd_place' | 'final'
  home_score: number | null
  away_score: number | null
  match_date: string            // kickoff; drives the tiebreaker
}
export interface RankingComputeArgs {
  members: RankingMemberInput[]
  predictions: { user_id: string; match_id: string; predicted_home_score: number | null; predicted_away_score: number | null }[]
  finishedMatches: RankingMatchInput[]
  championBets: { user_id: string; champion_team: string; runner_up_team: string }[]
}
// Pure: no I/O. Sorted by points desc → hasExact desc → mostRecentExactDate desc → full_name asc (pt-BR).
export function computeRanking(args: RankingComputeArgs): RankingFullEntry[]
```

```typescript
// lib/api/types.ts (addition)
export interface RankingFullEntry {
  user_id: string
  full_name: string | null
  avatar_color: string
  points: number
  position: number
  exact_scores: number       // count of exact-score predictions
  correct_outcomes: number   // count of correct-outcome predictions (includes exact)
}
```

Error handling follows existing conventions: route handlers return `formatError(code, message, status)` / `formatSuccess(data)` (`lib/api/responses`). `computeRanking` throws nothing — it operates on validated inputs supplied by the caller.

### Data Models

No schema changes. The feature reads existing tables:
- `league_members` (user_id, role, joined_at, joined `users`: full_name, avatar_color)
- `predictions` (user_id, match_id, predicted_home_score, predicted_away_score)
- `matches` (id, phase, home_score, away_score, **match_date** — newly selected for the tiebreaker)
- `champion_bets` (user_id, champion_team, runner_up_team)

**Per-member computation** (inside `computeRanking`):
- `points` — `scoreGroup` / `scoreKnockout` per finished match + `scoreChampion` (unchanged from current logic in `lib/scoring.ts`).
- `exact_scores` — count where `predicted_* === actual_*`.
- `correct_outcomes` — count where the winner/draw outcome is correct, **including** exact scores (exact is a subset).
- `mostRecentExactDate` — `max(match_date)` across that member's exact-score predictions; `null` if none. Used only for sorting, not returned.

**Tiebreaker comparator** (within equal points):
1. `hasExact` desc — any exact score outranks none.
2. `mostRecentExactDate` desc — later kickoff wins.
3. `full_name.localeCompare(other, 'pt-BR')` asc — final deterministic fallback; also yields alphabetical order for all-zero pre-tournament leagues.

### API Endpoints

**`GET /api/leagues/[id]/ranking`** (new)
- **Auth**: requires session (401 `SESSION_EXPIRED`).
- **Authorization**: requires league membership; non-members get 403 `NOT_A_MEMBER` (mirrors `route.ts:90-102`).
- **Query params**: none allowed (reject unknown params, 400 `INVALID_PARAMS`, consistent with the panel endpoint).
- **Response 200**:
  ```json
  {
    "status": "success",
    "data": {
      "ranking": [
        { "user_id": "…", "full_name": "…", "avatar_color": "#…",
          "points": 85, "position": 1, "exact_scores": 3, "correct_outcomes": 8 }
      ]
    },
    "timestamp": "…"
  }
  ```
- **Errors**: 401, 403, 404 `LEAGUE_NOT_FOUND`, 500 `DATABASE_ERROR`.
- `total_players` is derivable as `ranking.length`; prizes/name come from context — not duplicated in this payload.

**`GET /api/leagues/[id]`** (modified)
- Internally calls `computeRanking()`, slices to top 5 for the `ranking` field, derives `user_stats` from the same ordered output. Response shape and field names are **unchanged**; only the tie-break ordering changes (`joined_at` → most-recent-exact). Now also selects `match_date` on the matches query.

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
|-----------|-------------|----------------------|-----------------|
| `lib/ranking.ts` | new | Pure scoring + tiebreaker helper. Low risk; isolated and unit-tested. | Create with full unit coverage. |
| `app/api/leagues/[id]/ranking/route.ts` | new | Full-list endpoint, members-only. Low risk. | Create with API tests. |
| `app/api/leagues/[id]/route.ts` | modified | Refactor to use helper; tiebreaker changes from `joined_at`. **Medium risk** — ordering and `user_stats.position` behavior changes. | Refactor; keep response shape identical; update tie-break test. |
| `lib/api/types.ts` | modified | Add `RankingFullEntry`. Low risk (additive). | Add interface. |
| `app/ligas/[id]/ranking/page.tsx` + `Podium.tsx` + `RankingTable.tsx` | new | Ranking screen UI. Low risk. | Create; verify responsive (no horizontal scroll at 375/390px). |
| `BottomTabBar.tsx`, `PainelSidebar.tsx` | modified | Set "Ranking" `href` to the new route. Low risk; existing active-state logic handles it. | Change `href: null` → route; update nav tests. |
| `RankingCard.tsx` | modified (minor) | Activate the disabled "Ver tudo →" link to point at the ranking route (natural panel entry point). Low risk. | Replace disabled anchor with a `Link` to `/ligas/[id]/ranking`. |
| `tests/unit/league-detail-get-api.test.ts` | modified | Existing `joined_at` tie-break assertion no longer valid. | Rewrite that case for the new tiebreaker; keep scoring/top-5 assertions. |

## Testing Approach

### Unit Tests
- **`tests/unit/ranking-helper.test.ts`** (new) — `computeRanking`: points parity with `lib/scoring.ts`; `correct_outcomes` includes exact; tiebreaker level 1 (has-exact beats no-exact), level 2 (later `match_date` wins), level 3 (alphabetical pt-BR); all-zero league → alphabetical; fewer than 3 members; champion-bet points included but excluded from exact/outcome counts. No mocks — pure function over fixture arrays.
- **Component tests** for `Podium` (2nd|1st|3rd order, crown on 1st, 1–2 member graceful render, empty-state message) and `RankingTable` (self-row highlight + "Você" badge, mobile sub-text counts, desktop "Exatos"/"Acertos" columns, badge colors gold/silver/bronze/neutral). Vitest + @testing-library/react, per existing conventions.

### Integration Tests
- **`tests/unit/league-ranking-api.test.ts`** (new) — endpoint handler with mocked Supabase (reuse `makeSupabase()` / `makePrediction()` / `makeFinishedMatch()` factories from `league-detail-get-api.test.ts`): 401 unauthenticated, 403 non-member, full list returned (no top-5 truncation), correct field set, ordering matches `computeRanking`.
- **`tests/unit/league-detail-get-api.test.ts`** (updated) — verify panel still slices to 5, scoring unchanged, and the tie-break case reflects the new rule.
- Nav activation assertions in the existing `navigation-shell.test.tsx` / `static-panel-components.test.tsx`: "Ranking" is enabled with `href="/ligas/[id]/ranking"` and no `pointer-events-none`.

## Development Sequencing

### Build Order
1. **`lib/ranking.ts` + `RankingFullEntry` type** — no dependencies. Pure helper + comparator with unit tests.
2. **Refactor `GET /api/leagues/[id]`** — depends on step 1. Swap inline logic for the helper, slice to 5, select `match_date`; update the existing tie-break test.
3. **New `GET /api/leagues/[id]/ranking`** — depends on step 1 (and the data-fetch pattern confirmed in step 2). Add API tests.
4. **`Podium.tsx` + `RankingTable.tsx`** — depends on step 1's `RankingFullEntry` type. Build presentational components with their tests.
5. **`app/ligas/[id]/ranking/page.tsx`** — depends on steps 3 and 4. Wire fetch-on-mount, context identity, and compose the components.
6. **Nav activation** (`BottomTabBar`, `PainelSidebar`, `RankingCard` "Ver tudo") — depends on step 5 (route must exist). Update nav tests.
7. **Responsive verification** — depends on steps 5–6. Confirm no horizontal overflow at 375px/390px and "Sua posição" visible without scroll on initial load.

### Technical Dependencies
- None external. All data comes from existing Supabase tables; no migrations, no new packages.

## Monitoring and Observability

- The new endpoint emits the same structured JSON log line as the panel endpoint (`timestamp`, `level`, `endpoint: '/api/leagues/[id]/ranking'`, `method`, `user_id`, `league_id`, `status_code`, `duration_ms`) on success and error, matching `route.ts:302-313`.
- `duration_ms` is the key metric to watch for large leagues, since the full list is computed and returned at once (no pagination by design — see [ADR-001]).

## Technical Considerations

### Key Decisions
- **Dedicated endpoint + shared helper** (over extending the panel endpoint or a `?full=true` flag): isolates the heavier payload, keeps the panel lean, and gives one tested source of truth for ordering. Trade-off: one extra route and a client fetch-on-mount. See [ADR-002].
- **Most-recent-exact-score tiebreaker** replacing `joined_at`: rewards late-tournament performance and stays deterministic. Trade-off: the matches query must now carry `match_date`. See [ADR-003].
- **"Acertos" includes exact scores**: `correct_outcomes` is the full set of correct outcomes (exact is a subset), so "Exatos" reads as a highlight within "Acertos".
- **Members-only access**: mirrors the existing panel guard; public-league viewing deferred.

### Known Risks
- **Panel-endpoint refactor regression** (medium): the existing GET behavior must stay byte-compatible except for tie ordering. Mitigation: the `league-detail-get-api` suite must pass with only the tie-break case rewritten.
- **Locale-sensitive name sort** (low): `localeCompare(name, 'pt-BR')` could vary by environment. Mitigation: fixed locale argument + a dedicated unit test.
- **Large-league render cost** (low): full list rendered at once; acceptable for typical 20–200 member leagues (per [ADR-001]); virtual scrolling deferred.

## Architecture Decision Records

- [ADR-001: Dedicated Ranking Page as a Separate Route](adrs/adr-001.md) — New `/ligas/[id]/ranking` route over inline panel expansion or pagination.
- [ADR-002: Dedicated Ranking Endpoint Backed by a Shared Scoring Helper](adrs/adr-002.md) — New full-list endpoint + pure `lib/ranking.ts` helper reused by the panel, over extending the panel endpoint or a query flag.
- [ADR-003: Most-Recent-Exact-Score Tiebreaker](adrs/adr-003.md) — Replace `joined_at` with has-exact → most-recent-exact-date → alphabetical.
