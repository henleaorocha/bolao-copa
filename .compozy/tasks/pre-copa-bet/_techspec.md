# TechSpec: Pre-Copa Bet Modal — Champion & Vice Selection

## Executive Summary

This feature adds a 3-step fullscreen modal (`PreCopaBetModal`) that launches sequentially after the existing `LeagueWelcomeModal` when a user enters a league for the first time without a champion/vice bet. The implementation requires: one new static data file, one new React component, one new API route, and targeted modifications to the league detail API response and page.

The primary trade-off is extending the `GET /api/leagues/{id}` response with `has_champion_bet: boolean` (one extra DB query per league load) in exchange for zero waterfall requests on the client — consistent with how `user_onboarded_at` is already delivered.

---

## System Architecture

### Component Overview

```
app/ligas/[id]/page.tsx
  ├── Reads: league.user_onboarded_at, league.has_champion_bet        [MODIFIED]
  ├── Renders: <LeagueWelcomeModal onComplete={...} />                [unchanged]
  └── Renders: <PreCopaBetModal leagueId={id} onComplete={...} />    [NEW]

components/PreCopaBetModal.tsx                                         [NEW]
  ├── Reads: FEATURED_TEAMS, ALL_COPA_TEAMS from lib/copa-teams.ts
  ├── Calls: PUT /api/leagues/{id}/champion-bet on confirm
  └── Calls: flagcdn.com CDN for flag images

lib/copa-teams.ts                                                      [NEW]
  └── Exports: CopaTeam interface, FEATURED_TEAMS (12), ALL_COPA_TEAMS (32)

lib/api/types.ts                                                       [MODIFIED]
  ├── Adds: ChampionBet interface
  └── Extends: LeagueDetail with has_champion_bet: boolean

app/api/leagues/[id]/route.ts  (GET handler)                           [MODIFIED]
  └── Adds: champion_bets existence check → has_champion_bet in response

app/api/leagues/[id]/champion-bet/route.ts                             [NEW]
  └── PUT: upsert champion + runner_up into champion_bets
```

**Data flow on league page load:**
1. Page GETs `/api/leagues/{id}` — response now includes `has_champion_bet`.
2. If `user_onboarded_at === null` → show `LeagueWelcomeModal`.
3. `LeagueWelcomeModal.onComplete` → PATCH `/api/leagues/{id}/me` (existing) → if `!has_champion_bet && !deadlinePassed` → show `PreCopaBetModal`.
4. If `user_onboarded_at !== null && !has_champion_bet && !deadlinePassed` → show `PreCopaBetModal` directly.
5. `PreCopaBetModal.onComplete` → PUT `/api/leagues/{id}/champion-bet` → close modal.

---

## Implementation Design

### Core Interfaces

**`lib/copa-teams.ts`** — static team data, no runtime dependencies:

```typescript
export interface CopaTeam {
  name: string  // Portuguese display name, e.g. "Brasil"
  code: string  // ISO 3166-1 alpha-2 (lowercase), e.g. "br" — for flagcdn.com URL
}

export const FEATURED_TEAMS: CopaTeam[] = [
  { name: 'Brasil',     code: 'br' },
  { name: 'Argentina',  code: 'ar' },
  { name: 'França',     code: 'fr' },
  { name: 'Espanha',    code: 'es' },
  { name: 'Inglaterra', code: 'gb-eng' },
  { name: 'Portugal',   code: 'pt' },
  { name: 'Alemanha',   code: 'de' },
  { name: 'Holanda',    code: 'nl' },
  { name: 'Itália',     code: 'it' },
  { name: 'Bélgica',    code: 'be' },
  { name: 'Uruguai',    code: 'uy' },
  { name: 'Colômbia',   code: 'co' },
]

// FEATURED_TEAMS first, then the remaining 20 nations
export const ALL_COPA_TEAMS: CopaTeam[] = [
  ...FEATURED_TEAMS,
  // remaining 20 Copa 2026 nations (populate from official FIFA list)
]

export const VALID_TEAM_NAMES = new Set(ALL_COPA_TEAMS.map(t => t.name))

// 2026-06-11T21:00:00Z = June 11, 2026 18:00 BRT (UTC-3)
export const BET_DEADLINE = new Date('2026-06-11T21:00:00.000Z')
```

**Extended `lib/api/types.ts`:**

```typescript
export interface ChampionBet {
  id: string
  user_id: string
  league_id: string
  champion_team: string
  runner_up_team: string
  created_at: string
  updated_at: string
}

// LeagueDetail gains one field:
export interface LeagueDetail extends LeagueSummary {
  // ... existing fields unchanged ...
  user_onboarded_at: string | null
  members: LeagueMember[]
  has_champion_bet: boolean  // NEW: true if current user has a bet in this league
}
```

**`PreCopaBetModal` internal state:**

```typescript
type BetStep = 1 | 2 | 3
interface BetModalState {
  step: BetStep
  champion: CopaTeam | null
  runnerUp: CopaTeam | null
  isSubmitting: boolean
}
```

### Data Models

**`champion_bets` table** — already exists, no migration needed:

| Column          | Type        | Notes                                |
|-----------------|-------------|--------------------------------------|
| id              | UUID PK     | auto-generated                       |
| user_id         | UUID FK     | references users, CASCADE DELETE     |
| league_id       | UUID FK     | references leagues, CASCADE DELETE   |
| champion_team   | TEXT NOT NULL | Portuguese team name, e.g. "Brasil" |
| runner_up_team  | TEXT        | Portuguese team name, nullable in DB (required by API) |
| created_at      | TIMESTAMPTZ | auto-set on insert                   |
| updated_at      | TIMESTAMPTZ | updated on upsert                    |

Constraint: `UNIQUE(user_id, league_id)`.

**API request/response types:**

```typescript
// PUT /api/leagues/{id}/champion-bet — request body
interface ChampionBetRequest {
  champion_team: string   // required, must be in VALID_TEAM_NAMES
  runner_up_team: string  // required, must be in VALID_TEAM_NAMES, !== champion_team
}

// PUT success response
ApiSuccessResponse<ChampionBet>

// Error codes (string constants in error response)
type ChampionBetErrorCode =
  | 'SESSION_EXPIRED'       // 401 — unauthenticated
  | 'NOT_A_MEMBER'          // 403 — user not in league
  | 'BET_DEADLINE_PASSED'   // 409 — after June 11 2026 18:00 BRT
  | 'SAME_TEAM'             // 400 — champion === runner_up
  | 'INVALID_TEAM'          // 400 — team name not in allowed list
  | 'INVALID_PARAMS'        // 400 — missing required fields
  | 'DATABASE_ERROR'        // 500 — upsert failed
```

### API Endpoints

#### Modified: `GET /api/leagues/{id}`

Existing endpoint. The GET handler adds one DB query:

```sql
SELECT EXISTS(
  SELECT 1 FROM champion_bets
  WHERE user_id = $currentUserId AND league_id = $leagueId
) AS has_champion_bet
```

The boolean result is appended to the `LeagueDetail` response object. If this query fails, default to `has_champion_bet: false` (fail open — user sees the modal and can attempt to bet).

**No change to request or error behavior.**

---

#### New: `PUT /api/leagues/{id}/champion-bet`

**Request:**
```
PUT /api/leagues/{id}/champion-bet
Content-Type: application/json

{
  "champion_team": "Alemanha",
  "runner_up_team": "Bélgica"
}
```

**Validation sequence** (short-circuit on first failure):
1. Auth: `supabase.auth.getUser()` — 401 `SESSION_EXPIRED` if no session.
2. Membership: `SELECT role FROM league_members WHERE user_id = $user AND league_id = $id` — 403 `NOT_A_MEMBER` if no row.
3. Deadline: `new Date() > BET_DEADLINE` — 409 `BET_DEADLINE_PASSED`.
4. Body: both fields present and non-empty — 400 `INVALID_PARAMS`.
5. Team validity: both names in `VALID_TEAM_NAMES` — 400 `INVALID_TEAM`.
6. Distinct teams: `champion_team !== runner_up_team` — 400 `SAME_TEAM`.

**Upsert:**
```typescript
const { data, error } = await supabase
  .from('champion_bets')
  .upsert(
    { user_id, league_id, champion_team, runner_up_team, updated_at: new Date() },
    { onConflict: 'user_id,league_id' }
  )
  .select()
  .single()
```

**Success response (200):**
```json
{
  "status": "success",
  "data": {
    "id": "...",
    "user_id": "...",
    "league_id": "...",
    "champion_team": "Alemanha",
    "runner_up_team": "Bélgica",
    "created_at": "...",
    "updated_at": "..."
  },
  "timestamp": "..."
}
```

---

## Integration Points

### flagcdn.com CDN

- **Purpose**: Flag images for all 32 Copa nations.
- **URL pattern**: `https://flagcdn.com/w80/{iso_alpha2_code}.png`
- **England exception**: use `gb-eng` (not `gb`, which renders the Union Jack).
- **No authentication required.**
- **Error handling**: Use `<Image>` `onError` to show a placeholder flag emoji or a grey box if the CDN is unreachable. The team name below the flag always remains visible.

---

## Impact Analysis

| Component | Impact | Description | Required Action |
|-----------|--------|-------------|-----------------|
| `lib/copa-teams.ts` | New | Static team data; no runtime risk | Create file; populate all 32 teams with correct ISO codes |
| `lib/api/types.ts` | Modified | Add `ChampionBet`; extend `LeagueDetail` | Add fields; verify no existing consumers break |
| `app/api/leagues/[id]/route.ts` | Modified (GET) | One extra DB read per league load | Add EXISTS subquery; handle failure gracefully |
| `app/api/leagues/[id]/champion-bet/route.ts` | New | New PUT endpoint | Create route file following existing patterns |
| `components/PreCopaBetModal.tsx` | New | 3-step modal component | Create component; no existing code changes |
| `app/ligas/[id]/page.tsx` | Modified | Add bet modal state and trigger logic | Wire `showBetModal` state; pass `has_champion_bet` |

---

## Testing Approach

### Unit Tests

- **`lib/copa-teams.ts`**: Assert `ALL_COPA_TEAMS` has exactly 32 entries; no duplicate names; all codes are non-empty strings; `FEATURED_TEAMS` has exactly 12 entries and is a subset of `ALL_COPA_TEAMS`.
- **PUT route validation**: Unit-test the validation sequence (auth, membership, deadline, body, team validity, distinct teams) using mocked Supabase. Each guard should reject independently.
- **`PreCopaBetModal`**: Test step navigation (1→2→3, 3→2→1); champion disabled on step 2; submit button disabled until selection made; `onComplete` called after successful PUT.

### Integration Tests

- **GET `/api/leagues/{id}`**: Confirm `has_champion_bet: false` when no bet exists, `true` after a bet is inserted.
- **PUT `/api/leagues/{id}/champion-bet`**: Round-trip test — PUT once, verify DB row; PUT again with different teams, verify updated_at changes and values are updated (upsert behavior).
- **Deadline enforcement**: Mock server date past `BET_DEADLINE`; confirm PUT returns 409 `BET_DEADLINE_PASSED`.

### Manual QA Scenarios

1. First-time user: welcome modal → completes 4 steps → bet modal appears automatically → completes bet → modal closes, league page shown.
2. Return user (no bet): opens league → bet modal appears directly (no welcome modal) → completes bet.
3. User with bet: opens league → no modal shown, lands directly on league page.
4. After deadline: open league without bet → no modal shown (bet window closed).
5. England flag: verify `gb-eng` renders the St George's Cross, not the Union Jack.

---

## Development Sequencing

### Build Order

1. **`lib/copa-teams.ts`** — no dependencies. Create the static team list and `BET_DEADLINE` constant. Populate all 32 teams with correct ISO 3166-1 alpha-2 codes.

2. **Extend `lib/api/types.ts`** — depends on step 1 for naming conventions. Add `ChampionBet` interface and `has_champion_bet: boolean` to `LeagueDetail`.

3. **Modify `GET /api/leagues/[id]/route.ts`** — depends on step 2 (updated type). Add the `EXISTS` subquery for `champion_bets` and include `has_champion_bet` in the formatted response.

4. **New `PUT /api/leagues/[id]/champion-bet/route.ts`** — depends on step 2 (types) and step 1 (team validation). Follow the existing route handler pattern from `app/api/leagues/[id]/me/route.ts`. Import `VALID_TEAM_NAMES` and `BET_DEADLINE` from `lib/copa-teams.ts`.

5. **New `components/PreCopaBetModal.tsx`** — depends on step 1 (team data). Implement the 3-step modal using the same structural pattern as `LeagueWelcomeModal.tsx` (fixed backdrop, gradient, progress indicator, white bottom zone). Flag images are `<Image>` elements pointing to `https://flagcdn.com/w80/{code}.png`.

6. **Modify `app/ligas/[id]/page.tsx`** — depends on steps 3 (type change), 5 (component). Add `showBetModal` state. Update welcome modal's `onComplete` to set `showBetModal = true` when appropriate. Add direct bet modal trigger for users who already completed onboarding. Render `<PreCopaBetModal>` conditionally.

### Technical Dependencies

- The `champion_bets` table already exists (migration `20260522000007`). No new migration needed.
- `next/image` is available (existing project dependency). No new packages required.
- flagcdn.com must be added to `next.config` `images.remotePatterns` to allow `<Image>` to serve from that domain.

---

## Monitoring and Observability

All existing routes log `{ endpoint, method, user_id, status_code, duration_ms }` via `console.log`. The new PUT route must follow this convention.

**Key events to log:**
- `champion_bet.created` — first-time bet placed (no prior row)
- `champion_bet.updated` — bet changed before deadline
- `champion_bet.deadline_rejected` — PUT attempted after June 11 cutoff
- `champion_bet.invalid_team` — team name not in allowed list (possible tampering)

**Metric to watch post-launch:**
- Ratio of league members with `has_champion_bet = true` by 7 days before Copa. Target ≥80% (per PRD Success Metrics).

---

## Technical Considerations

### Key Decisions

- **Deadline as a constant, not DB config**: `BET_DEADLINE` is a hardcoded `Date` constant in `lib/copa-teams.ts`. It is enforced server-side in the PUT route. The tradeoff: changing the deadline requires a code deploy. Accepted because FIFA deadline changes are very rare and a deploy is safer than an admin UI that could be misconfigured.

- **Team validation at the API layer**: The PUT handler validates that team names are in `VALID_TEAM_NAMES` (imported from `lib/copa-teams.ts`). This prevents corrupt data from reaching the DB in case of client tampering. The same set is used by the client component, so valid names are always consistent.

- **No client-side modal state persistence**: If a user closes the app mid-flow (e.g., between steps 1 and 2), they restart from step 1 on their next visit. Step 1 is fast (one tap). Persisting partial state would require sessionStorage or a draft endpoint — unnecessary complexity for this MVP.

### Known Risks

- **flagcdn.com availability**: If the CDN is down, flag images fail to load. The `<Image>` `onError` handler should show a fallback (grey rounded square). Team name is always rendered below — modal remains functional.

- **`runner_up_team` nullable in DB but required in API**: The DB schema allows `runner_up_team = NULL`. The API rejects requests without it. If a future migration makes the column NOT NULL, no API change is needed. Risk: if DB migrations are applied out of order, old rows with NULL runner_up could cause downstream scoring logic issues. Mitigation: scoring (Phase 3) should handle NULL runner_up gracefully.

- **Modal stacking on slow loads**: If the league fetch is slow, both `showWelcomeModal` and `showBetModal` start as `false`. A loading skeleton should be shown to prevent premature league page rendering. The existing loading pattern in `page.tsx` covers this.

---

## Architecture Decision Records

- [ADR-001: 3-Step Fullscreen Modal Flow](adrs/adr-001.md) — Chose 3-step modal over 2-step combined or inline page, for design fidelity and focused UX per step.
- [ADR-002: Bet Status via Extended LeagueDetail Response](adrs/adr-002.md) — Add `has_champion_bet` to existing GET response instead of a separate API call, eliminating waterfall requests.
- [ADR-003: Single PUT Endpoint with Upsert](adrs/adr-003.md) — One PUT endpoint handles both create and update via DB upsert, matching the UNIQUE constraint semantics.
- [ADR-004: Flag Images via flagcdn.com CDN](adrs/adr-004.md) — Zero-dependency CDN approach over bundling an npm flag library, avoiding bundle size increase.
