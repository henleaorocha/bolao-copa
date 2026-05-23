# TechSpec: Leagues Hub Screen (Tela de Ligas)

## Executive Summary

This TechSpec covers the full redesign of `app/ligas/page.tsx` into a Server Component-based Leagues Hub, a new `GET /api/leagues/hub` endpoint backed by a shared data layer function, post-login redirect update, and extracted `LeagueCard` client component.

The primary trade-off is converting the current Client Component (instant JS, delayed data) into a Server Component (data arrives with the HTML, but interactive children must be explicitly extracted as Client Components). This eliminates the loading spinner entirely and makes the page accessible without JavaScript for the initial render.

All other routes — `/ligas/[id]`, `/dashboard`, auth callback — are minimally touched: only the fallback redirect destination changes from `/dashboard` to `/ligas`.

---

## System Architecture

### Component Overview

```
app/ligas/page.tsx                   [Server Component — async]
  ├── LogoutButton                   [Client Component — existing, components/LogoutButton.tsx]
  ├── LeagueCard (×N)               [Client Component — new, components/LeagueCard.tsx]
  └── CountdownBanner               [Server Component — inline or components/CountdownBanner.tsx]

lib/leagues/get-leagues-hub.ts       [Server utility — pure function, called by page and API route]

app/api/leagues/hub/route.ts         [API Route — GET, wraps getLeaguesHub for HTTP clients]

app/auth/callback-redirect/page.tsx  [Client Component — modified, changes fallback from /dashboard to /ligas]
```

**Data flow:**

1. Browser navigates to `/ligas`.
2. `proxy.ts` middleware validates the session cookie via Supabase SSR; unauthenticated requests redirect to `/login`.
3. `app/ligas/page.tsx` (Server Component) calls `getSupabaseServerClient()`, reads `session.user`, calls `getLeaguesHub(supabase, userId)`.
4. `getLeaguesHub` runs a single Supabase query returning `LeagueHubItem[]` sorted per PRD spec.
5. Server renders the full page HTML including populated cards and countdown; sends to browser.
6. User clicks "ENTRAR" → `LeagueCard` (Client Component) calls `PATCH /api/auth/me`, then `router.push('/ligas/[id]')`.

---

## Implementation Design

### Core Interfaces

```typescript
// lib/leagues/get-leagues-hub.ts
interface LeagueHubItem {
  id: string
  name: string
  access_type: 'open' | 'private'
  logo_url: string | null
  member_count: number
  is_member: boolean   // true if authenticated user is already a member
  is_main: boolean     // true only for the MAIN_LEAGUE_ID league
}

async function getLeaguesHub(
  supabase: SupabaseClient,
  userId: string
): Promise<LeagueHubItem[]>
```

```typescript
// lib/leagues/get-days-until-copa.ts
interface CopaCountdown {
  days: number
  isUnderway: boolean  // true when today >= June 11 2026
}

function getDaysUntilCopa(): CopaCountdown
```

```typescript
// components/LeagueCard.tsx — Client Component props
interface LeagueCardProps {
  league: LeagueHubItem
}
```

### Data Models

**`LeagueHubItem`** extends `LeagueSummary` with two boolean flags and drops `role` (not shown in hub):

| Field | Type | Source |
|-------|------|--------|
| `id` | `string` | `leagues.id` |
| `name` | `string` | `leagues.name` |
| `access_type` | `'open' \| 'private'` | `leagues.access_type` |
| `logo_url` | `string \| null` | `leagues.logo_url` |
| `member_count` | `number` | `leagues.member_count` |
| `is_member` | `boolean` | derived: `league_id IN user's memberships` |
| `is_main` | `boolean` | derived: `id === process.env.MAIN_LEAGUE_ID` |

**`GET /api/leagues/hub` response:**

```typescript
ApiSuccessResponse<{
  leagues: LeagueHubItem[]
  user: { first_name: string }
  countdown: CopaCountdown
}>
```

**Sort order applied by `getLeaguesHub()`:**

1. `is_main === true` → position 0
2. `is_member === true && access_type === 'private'` → sorted by `joined_at DESC`
3. Remaining `access_type === 'open'` (user not yet member) → sorted by `member_count DESC`

Leagues where the user is a member of a public league appear once in the membership group (position 2), not duplicated in position 3.

### API Endpoints

#### New: `GET /api/leagues/hub`

| Field | Value |
|-------|-------|
| Method | `GET` |
| Auth | Required (401 if missing) |
| Response 200 | `ApiSuccessResponse<{ leagues: LeagueHubItem[], user: { first_name: string }, countdown: CopaCountdown }>` |
| Response 401 | `ApiErrorResponse` — session missing or expired |
| Response 500 | `ApiErrorResponse` — database error |

The route calls `getLeaguesHub(supabase, userId)` and `getDaysUntilCopa()` — no additional logic.

#### Modified: `app/auth/callback-redirect/page.tsx`

No new endpoint — this is a client-side page change only. The fallback destination string `'/dashboard'` changes to `'/ligas'`. The invite redirect path (`sessionStorage.inviteRedirect`) is unchanged.

#### Unchanged (called by `LeagueCard`):

`PATCH /api/auth/me` — already exists, accepts `{ active_league_id: string }`, verifies membership, updates `users.active_league_id`.

### UI Layout Notes

**Hero/card overlap effect:** In the design reference, the league cards visually overlap the boundary between the dark hero section and the white background — cards begin inside the dark area and their bottom half sits over the white area. Implement with `padding-bottom` on the hero section (e.g., `pb-24`) and a matching negative top margin on the card grid (e.g., `-mt-16`). The card grid pulls up into the hero without absolute positioning. Do not use `overflow: hidden` on the hero or the overlap will be clipped.

---

## Integration Points

**Supabase Auth + Database**  
`getLeaguesHub()` uses the Supabase server client (already initialized via `getSupabaseServerClient()`). No new authentication flow; same JWT validation pattern as all other server-side routes.

**`MAIN_LEAGUE_ID` env var**  
New environment variable. Must be set in `.env.local` (development) and production secrets. If unset, `is_main` is `false` for all leagues — graceful degradation, no crash.

---

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
|-----------|-------------|---------------------|-----------------|
| `app/ligas/page.tsx` | Modified | Full rewrite from Client Component to Server Component. High risk — removes all existing tabs, modals, and state. | Replace entirely |
| `app/auth/callback-redirect/page.tsx` | Modified | Change fallback redirect target from `/dashboard` to `/ligas`. Low risk — one string change. | Update string |
| `components/LeagueCard.tsx` | New | Extracted Client Component for card rendering and ENTRAR interaction. No risk. | Create new file |
| `lib/leagues/get-leagues-hub.ts` | New | Shared data layer function. No risk — new file. | Create new file |
| `lib/leagues/get-days-until-copa.ts` | New | Pure countdown utility. No risk. | Create new file |
| `app/api/leagues/hub/route.ts` | New | New HTTP endpoint wrapping the shared function. No risk. | Create new file |
| `lib/api/types.ts` | Modified | Add `LeagueHubItem` type. Low risk — additive only. | Add new interface |
| `.env.local` (and prod secrets) | Modified | Add `MAIN_LEAGUE_ID=<uuid>`. Low risk — graceful if missing. | Add env var |
| `app/ligas/[id]/page.tsx` | No change | League detail page is unaffected. | None |
| `app/dashboard/page.tsx` | No change | Dashboard remains accessible via direct navigation. | None |
| `components/LogoutButton.tsx` | No change | Reused as-is in the new page. | None |

---

## Testing Approach

### Unit Tests

- `getDaysUntilCopa()`: test with a date before June 11 2026 (expect `isUnderway: false`, correct day count), on June 11 (expect `isUnderway: true`, `days: 0`), and after (expect `isUnderway: true`).
- `getLeaguesHub()` sort order: test with a mix of main league, user's private leagues, and additional public leagues — verify correct ordering.
- `getLeaguesHub()` deduplication: user is a member of a public league — verify it appears once in the membership group, not in the public group.
- `getLeaguesHub()` with `MAIN_LEAGUE_ID` unset: verify no crash, `is_main` false for all items.

### Integration Tests

- `GET /api/leagues/hub`: authenticated request returns 200 with correct shape; unauthenticated returns 401.
- `app/auth/callback-redirect`: after OAuth, browser lands on `/ligas` (not `/dashboard`); invite redirect still works when `sessionStorage.inviteRedirect` is set.
- `LeagueCard` ENTRAR flow: clicking ENTRAR calls `PATCH /api/auth/me`, then navigates to `/ligas/[id]`.

---

## Development Sequencing

### Build Order

1. **`lib/leagues/get-days-until-copa.ts`** — Pure utility, no dependencies. Create and unit-test first.

2. **`LeagueHubItem` type in `lib/api/types.ts`** — Add the interface. Depends on nothing; everything else depends on it.

3. **`lib/leagues/get-leagues-hub.ts`** — Shared data layer. Depends on step 2 (type). Requires `MAIN_LEAGUE_ID` env var to be set.

4. **`app/api/leagues/hub/route.ts`** — API route. Depends on steps 2 and 3. Wire up and verify with `curl` or a REST client before building the page.

5. **`components/LeagueCard.tsx`** — Client Component. Depends on step 2 (type). Calls `PATCH /api/auth/me` (existing) and `router.push`.

6. **`app/ligas/page.tsx` rewrite** — Server Component. Depends on steps 1, 3, and 5. Replaces the entire file.

7. **`app/auth/callback-redirect/page.tsx` update** — Single string change. No dependencies; can be done in any order but ship after step 6 is verified.

### Technical Dependencies

- `MAIN_LEAGUE_ID` env var must be populated before testing step 3 onward. Get the UUID from the Supabase dashboard.
- `PATCH /api/auth/me` (existing route) must accept `active_league_id` — already implemented, no changes needed.

---

## Monitoring and Observability

- Log a structured event when `getLeaguesHub()` returns zero leagues for a user — useful to detect configuration issues (e.g., `MAIN_LEAGUE_ID` pointing to a deleted league).
- Log server render time for `app/ligas/page.tsx` — if it exceeds 1s, the Supabase query needs optimization.
- Track `PATCH /api/auth/me` call rate from the leagues hub — a spike indicates a loop in the ENTRAR handler.

---

## Technical Considerations

### Known Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Server Component `force-dynamic` missing, causing stale cached HTML with outdated member counts | Medium | Add `export const dynamic = 'force-dynamic'` at the top of `app/ligas/page.tsx` |
| `MAIN_LEAGUE_ID` env var missing in production | Low | Graceful degradation (no PRINCIPAL badge); add startup validation log warning if unset |
| Auth redirect change breaks the existing invite flow | Low | The invite path uses `sessionStorage.inviteRedirect` which is checked first — unchanged; fallback-only change |
| `getLeaguesHub()` query is slow with many leagues | Low | `member_count` is a pre-aggregated column; query uses indexed `access_type` and `user_id` — should be fast at expected scale |

---

## Architecture Decision Records

- [ADR-001: League Hub as Full /ligas Page Redesign](adrs/adr-001.md) — Replace the current two-tab Client Component with a unified Server Component at the same `/ligas` route.
- [ADR-002: Server Component with Shared Data Layer](adrs/adr-002.md) — `app/ligas/page.tsx` is a Server Component; data logic lives in `lib/leagues/get-leagues-hub.ts`, reused by the API route.
- [ADR-003: Test Bolao Identification via MAIN_LEAGUE_ID Env Var](adrs/adr-003.md) — Identify the universal league by UUID in an env var; no DB migration needed.
