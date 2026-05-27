# TechSpec: Tabela da Copa — Group Stage Standings Screen

## Executive Summary

The Tabela da Copa screen renders official Copa 2026 group-stage standings for all 12
groups (A–L) at `/ligas/[id]/tabela`, inside the existing league panel layout.
Standings are derived entirely from the local `matches` table — no external API call on
the page load path — and a Supabase `pg_cron` job refreshes match scores hourly by
invoking the existing `POST /api/admin/sync-matches` route.

The page is implemented as a **React Server Component** that verifies league membership
server-side, queries `matches` (`phase = 'group'`), and computes standings via a pure,
framework-agnostic `computeStandings()` library function before rendering HTML. This
ships standings in the initial response (meeting the PRD's <1.5s FCP goal) at the cost
of introducing a Server Component pattern not yet used elsewhere under `app/ligas/[id]/`
(all current sub-pages are client components). Interactivity is confined to a single
client island: the mobile A–L chip selector that scrolls to a group card.

This spec covers MVP (Phase 1) only. Live-match awareness, form indicators, and
fixture drill-down are explicitly out of scope per the PRD.

## System Architecture

### Component Overview

| Component | Type | Responsibility |
|-----------|------|----------------|
| `app/ligas/[id]/tabela/page.tsx` | Server Component | Resolve Supabase server client, verify session + membership, query group matches, call `computeStandings()`, render `StandingsGrid`. |
| `lib/standings.ts` | Pure module | `computeStandings(matches)` → ordered `GroupStanding[]`. No framework or I/O dependency. |
| `StandingsGrid` | Server Component | Render the `GroupChips` island + 12 `GroupCard`s in a responsive grid (fixed A→L order). |
| `GroupCard` | Server Component | One group: dark header (`GRUPO X`, `4 SELEÇÕES` badge), column labels, rows. Each card carries an anchor `id` (`grupo-a`…`grupo-l`). |
| `StandingsRow` | Server Component | One team row: position, flag, name, Pts/J/V/E/D/GP/GC/SG; qualification highlight for positions 1–2; GP/GC hidden on mobile. |
| `GroupChips` | Client Component (`'use client'`) | Horizontal A–L chip row; `scrollIntoView` to the tapped group; highlights the active chip. Mobile only. |
| Sync cron | Supabase `pg_cron` + `pg_net` | Hourly `http_post` to `/api/admin/sync-matches`. Defined in a migration. |
| `PainelSidebar.tsx`, `BottomTabBar.tsx` | Client Components (existing) | Flip the "Tabela" nav item `href` from `null` to `/ligas/${leagueId}/tabela` and enable active state. |

### Data Flow

1. **Read path (page load):** Request → Server Component → `getSupabaseServerClient()` →
   auth + membership check → `select * from matches where phase='group'` →
   `computeStandings(matches)` → server-rendered HTML. No external call.
2. **Write path (freshness):** `pg_cron` (hourly) → `pg_net.http_post` →
   `POST /api/admin/sync-matches` → `fetchWorldCupFixtures()` (API-Football) → upsert into
   `matches`. Independent of any user request.

The two paths share only the `matches` table; the read path never blocks on the write path.

## Implementation Design

### Core Interfaces

`lib/standings.ts` exposes one function and two types. `Match` is the existing type from
`lib/api/types.ts`.

```typescript
export interface TeamStanding {
  team: string
  flag: string | null   // home_flag/away_flag code, e.g. 'br', 'gb-eng'
  played: number        // J
  won: number           // V
  drawn: number         // E
  lost: number          // D
  goalsFor: number      // GP
  goalsAgainst: number  // GC
  goalDiff: number      // SG
  points: number        // Pts
  position: number      // 1–4, assigned after sort
}

export interface GroupStanding {
  group: string                 // 'A' … 'L'
  teams: TeamStanding[]         // length 4, sorted, position-assigned
}

export function computeStandings(matches: Match[]): GroupStanding[]
```

`computeStandings` rules:
- Consider only `match.phase === 'group'` with a non-null `group`.
- The 4-team roster of each group is the set of distinct `home_team`/`away_team` values
  across that group's matches (so groups with only `scheduled` matches still list all
  teams at 0). Flag per team is taken from the matching `home_flag`/`away_flag` value.
- Aggregate results **only** for `status === 'finished'` matches (ADR decision). 3 points
  for a win, 1 for a draw, 0 for a loss.
- Sort each group by `points` desc → `goalDiff` (SG) desc → `goalsFor` (GP) desc →
  `team` name asc. Assign `position` 1–4 after sorting.
- Return groups ordered A→L.

### Data Models

No schema changes. The feature reads the existing `matches` table
(`lib/api/types.ts` `Match`):

```typescript
export interface Match {
  id: string
  external_id: string | null
  home_team: string
  away_team: string
  home_flag: string | null
  away_flag: string | null
  match_date: string
  phase: 'group' | '32nd' | '16th' | '8th' | '4th' | 'semi' | '3rd_place' | 'final'
  group: string | null
  status: 'scheduled' | 'live' | 'finished'
  home_score: number | null
  away_score: number | null
  venue: string | null
  city: string | null
}
```

`TeamStanding` and `GroupStanding` (above) are the new in-memory domain types; they are
never persisted.

### API Endpoints

**No new user-facing API route is introduced.** Per ADR-002, the Server Component reads
the database directly, so standings are not exposed over HTTP.

The only endpoint involved is the **existing** sync route, now invoked on a schedule:

| Method | Path | Caller | Description |
|--------|------|--------|-------------|
| POST | `/api/admin/sync-matches` | `pg_cron` (hourly) | Existing route. Fetches fixtures from API-Football and upserts into `matches`. Authorized via `SUPABASE_SERVICE_ROLE_KEY`. Unchanged by this feature. |

## Integration Points

- **API-Football (api-sports.io)** — reached only by the sync route via
  `fetchWorldCupFixtures()` (`league=1&season=2026`, header `x-apisports-key:
  process.env.API_FOOTBALL_KEY`). Hourly cadence = 24 requests/day, within the free-tier
  ~100/day cap. Failure degrades to stale scores, never a broken page.
- **Supabase `pg_cron` + `pg_net`** — in-database scheduler issuing the hourly authorized
  `http_post`. Enabled and registered via migration. Target URL and service-role auth are
  supplied through Supabase config/secrets, not hardcoded.
- **flagcdn.com** — flag images via the existing `TeamFlag` pattern
  (`https://flagcdn.com/w80/{code}.png`, grey placeholder fallback on missing code / load
  error). No new integration; reuse the component approach from `MatchRow`/`UpcomingMatchesCard`.

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
|-----------|-------------|----------------------|-----------------|
| `lib/standings.ts` | new | Pure standings computation. Low risk; fully unit-testable. | Create module + types. |
| `app/ligas/[id]/tabela/page.tsx` | new | First Server Component under `app/ligas/[id]/`. Medium risk: new pattern under a client layout. | Implement with server-side membership guard; cover with integration test. |
| `StandingsGrid` / `GroupCard` / `StandingsRow` | new | Presentational server components. Low risk. | Implement; component tests for highlight + mobile column hiding. |
| `GroupChips` | new | Client island for mobile scroll-to. Low risk. | Implement; test active-chip + scroll target. |
| `PainelSidebar.tsx` | modified | Flip "Tabela" `href: null` → route; enable active state. Low risk. | Update nav item + active logic. |
| `BottomTabBar.tsx` | modified | Same change for the mobile tab. Low risk. | Update tab item + active logic. |
| Supabase migration (`pg_cron`/`pg_net`) | new | Enables extensions + hourly job. Medium risk: DB-layer change, weaker delivery observability. | New migration; verify job registration. |
| `matches` table | unchanged | Read-only consumer; sync route already writes it. | None. |

## Testing Approach

### Unit Tests

- **`computeStandings()`** (`tests/unit/standings.test.ts`) — the critical surface:
  - All `scheduled` → every team 0 across all columns, all 4 teams present, positions 1–4.
  - Win/draw/loss point math (3/1/0) and J/V/E/D/GP/GC/SG aggregation.
  - Tie-break ordering: equal points resolved by SG, then GP, then team name.
  - `status='live'` and `status='scheduled'` matches are ignored.
  - Roster derived purely from fixtures; missing flag → `null` (not a crash).
  - Mock boundary: none — pass plain `Match[]` arrays (pure function).

### Integration Tests

- **Tabela page** (`tests/integration/tabela-page.test.tsx`) — render the Server
  Component / its grid with seeded matches: 12 group cards present in A→L order; a
  finished-match group sorts correctly; positions 1–2 carry the qualification highlight;
  GP/GC columns hidden at mobile breakpoint while SG remains.
- **Mobile chip nav** (`GroupChips`) — tapping a chip targets the correct `grupo-x` anchor
  and marks the active chip.
- **Nav activation** — `PainelSidebar`/`BottomTabBar` render "Tabela" as an enabled link to
  `/ligas/[id]/tabela` and mark it active on that route.
- Follow existing Vitest conventions: `vi.mock('@/lib/supabase/client', …)` with chainable
  query-builder mocks (as in `tests/unit/league-matches-api.test.ts`); `@vitest-environment
  jsdom` + mocked `next/image` and `next/link` for component tests.

## Development Sequencing

### Build Order

1. **`lib/standings.ts`** — `computeStandings()` + `TeamStanding`/`GroupStanding` types.
   No dependencies.
2. **`computeStandings` unit tests** — depends on step 1.
3. **Presentational components** (`StandingsRow`, `GroupCard`, `StandingsGrid`) — depend on
   step 1 (consume `GroupStanding`).
4. **`app/ligas/[id]/tabela/page.tsx`** Server Component with membership guard — depends on
   steps 1 and 3 (queries matches, computes, renders the grid).
5. **`GroupChips` client island** (mobile A–L scroll-to) — depends on step 3 (group anchor
   ids rendered by `GroupCard`).
6. **Activate nav items** in `PainelSidebar.tsx` and `BottomTabBar.tsx` — depends on step 4
   (route must exist before linking/marking active).
7. **`pg_cron`/`pg_net` migration** for hourly sync — depends only on the existing
   `/api/admin/sync-matches` route; can proceed in parallel with steps 1–6.
8. **Integration + component tests** (page, chip nav, nav activation) — depend on steps 3–6.

### Technical Dependencies

- Seeded group-stage match data must be present (migrations
  `20260526000019`/`20260526000020`) — already in the repo.
- `pg_cron` and `pg_net` extensions must be enableable on the Supabase project (available on
  the free tier).
- `API_FOOTBALL_KEY` and `SUPABASE_SERVICE_ROLE_KEY` must be configured for the sync path.

## Monitoring and Observability

- **Sync health (admin-only, not user-facing):** track the timestamp/result of the latest
  successful `/api/admin/sync-matches` run. Surface "last synced" in admin tooling per the
  PRD risk table.
- **Log events:** the sync route should log `{ upserted, skipped, durationMs }` and any
  API-Football error code (`SYNC_FAILED`).
- **Alerting threshold:** no successful sync in > 2h during a match window → investigate (the
  PRD's data-accuracy success metric is "0 incidents of incorrect standings 2+h after a final
  whistle").
- The user-facing page intentionally exposes no "last updated" timestamp or refresh control
  (PRD non-goal / ADR-001).

## Technical Considerations

### Key Decisions

- **Server Component rendering (ADR-002).** Chosen for best FCP on a read-only page and to
  ship standings in initial HTML. Trade-off: a new pattern under `app/ligas/[id]/` and a
  server-side membership re-check instead of `useLeaguePanel()`. Rejected: client component +
  `/standings` API route (consistent with the codebase but slower first paint).
- **Supabase `pg_cron` sync trigger (ADR-003).** Chosen for zero new billing surface on the
  existing Supabase free tier and provider independence. Trade-off: scheduling lives in the
  DB and `pg_net` calls are fire-and-forget. Rejected: Vercel Cron (hourly needs paid Pro)
  and GitHub Actions (consumes a metered minutes budget).
- **Finished matches only.** `computeStandings` counts only `status='finished'`; live/
  scheduled contribute 0. Keeps MVP deterministic; live awareness is PRD Phase 2.
- **Roster from fixtures.** Each group's teams are derived from its own match rows rather
  than a separate roster table, so no new data source is needed and empty groups still render.
- **Standings computation in a shared lib.** `computeStandings()` is pure and isolated, so it
  is unit-testable and reusable should a future API consumer need it.

### Known Risks

- **New Server Component pattern under a client layout** (medium likelihood, low impact).
  Mitigation: confine the client surface to `GroupChips`; cover the page with an integration
  test.
- **Silent sync failure on match day** (medium likelihood, medium impact). Mitigation:
  monitor last successful sync; standings degrade to last known scores, never a broken page.
- **Mobile horizontal overflow** at 320/375/390/414px (low likelihood, medium impact).
  Mitigation: hide GP/GC on mobile (show SG only); integration test asserts no overflow and
  correct column visibility.
- **API-Football coverage/rate changes** (medium likelihood, low impact). Mitigation: hourly
  cadence stays under the free-tier cap; read path is fully decoupled from the API.

## Architecture Decision Records

- [ADR-001: DB-Computed Standings with Hourly Background Sync](adrs/adr-001.md) — Standings
  are computed from the local DB; an hourly background sync updates scores from API-Football,
  keeping the page load path external-API-free.
- [ADR-002: Server Component Rendering for the Tabela Page](adrs/adr-002.md) — The page is a
  React Server Component that computes standings server-side for best FCP, instead of the
  existing client-component + API-route pattern.
- [ADR-003: Supabase pg_cron as the Hourly Sync Trigger](adrs/adr-003.md) — The hourly sync is
  triggered by in-database `pg_cron`/`pg_net` to avoid any new billable surface, instead of
  Vercel Cron or GitHub Actions.
