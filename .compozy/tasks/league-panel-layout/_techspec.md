# TechSpec: League Panel — Open League Dashboard

## Executive Summary

The Painel fully replaces `/ligas/[id]/page.tsx` with a twelve-section dashboard composed of focused, co-located client components. `GET /api/leagues/[id]` is extended with three new fields (`prizes`, `user_stats`, `ranking`) while preserving all existing consumers. Stats and ranking return stub zeros until the scoring engine arrives in a future PRD; the response shape is final and won't change.

The primary trade-off is completeness now vs. real data later: all twelve sections render in Phase 1, but user stats, ranking points, and upcoming games are placeholders. This approach keeps the front-end contract stable and decouples the UI delivery from the scoring engine delivery.

Sidebar appears at `≥1024px` (`lg:` breakpoint); mobile layout (top bar + fixed bottom tab bar) applies below. Invite URL is constructed client-side from `invite_token` already present in `LeagueDetail` — no additional API call.

## System Architecture

### Component Overview

`page.tsx` is a thin orchestrator: fetches `LeagueDetail` and the current `AuthUser`, then distributes data to section components. All section components are `'use client'` and own their local state.

```
app/ligas/[id]/
├── page.tsx                        ← thin orchestrator (data fetch + layout shell)
└── components/
    ├── PainelSidebar.tsx           ← desktop sidebar nav (≥lg), invite trigger
    ├── PainelTopBar.tsx            ← mobile top bar (<lg), back CTA, invite trigger
    ├── BottomTabBar.tsx            ← mobile fixed bottom tabs (<lg)
    ├── InviteShareButton.tsx       ← copy + WhatsApp popover, shared by sidebar/topbar
    ├── ChampionBanner.tsx          ← deadline countdown, dynamic CTA, opens PreCopaBetModal
    ├── PrizesStrip.tsx             ← prizes text strip
    ├── StatsRow.tsx                ← 4-card stats grid (2×2 mobile, 4-col desktop)
    ├── YourBetCard.tsx             ← champion/vice picks card, opens PreCopaBetModal
    ├── UpcomingGamesStub.tsx       ← skeleton rows + "Em breve" badge
    ├── RankingCard.tsx             ← top-5 ranking with current-user highlight
    └── ScoringSchemeCard.tsx       ← static amber card with scoring rules
```

Data flow:
- `page.tsx` calls `GET /api/leagues/[id]` → `LeagueDetail` (extended)
- `page.tsx` calls `GET /api/auth/me` → `AuthUser`
- Props flow down; no shared context required for this page
- `ChampionBanner` and `YourBetCard` call `onBetComplete` callback passed from `page.tsx` to trigger a data refresh after modal completion

## Implementation Design

### Core Interfaces

```typescript
// lib/api/types.ts — new types added to the existing file

interface UserStats {
  position: number      // 0 = not yet computed (pre-Copa)
  points: number
  guesses_made: number
  guesses_total: number
  exact_scores: number
}

interface RankingEntry {
  user_id: string
  full_name: string | null
  avatar_color: string  // hex color from DESIGN_COLORS
  points: number        // 0 in pre-Copa stub
  position: number      // 1-indexed rank
}

// LeagueDetail gains three new fields (existing fields unchanged):
// prizes: string | null
// user_stats: UserStats
// ranking: RankingEntry[]   (length ≤ 5)
```

`InviteShareButton` is the only cross-context component; its interface:

```typescript
interface InviteShareButtonProps {
  inviteUrl: string
  variant: 'sidebar' | 'topbar'  // controls visual presentation
}
```

### Data Models

#### DB Schema Prerequisite

Before implementation, verify the `prizes` column exists on the `leagues` table:

```sql
-- Check
SELECT column_name FROM information_schema.columns
WHERE table_name = 'leagues' AND column_name = 'prizes';

-- If absent, add migration:
ALTER TABLE leagues ADD COLUMN prizes TEXT;
```

`prizes` is `null` for all existing leagues until a league creation/edit form exposes it (out of scope for this PRD).

#### Extended API Response Shape

```typescript
// What GET /api/leagues/[id] returns after extension
{
  // ... all existing LeagueDetail fields unchanged ...
  prizes: string | null,
  user_stats: {
    position: 0,
    points: 0,
    guesses_made: 0,
    guesses_total: 0,
    exact_scores: 0,
  },
  ranking: [
    { user_id, full_name, avatar_color, points: 0, position: 1 },
    // up to 5 entries, ordered by joined_at ASC
  ]
}
```

#### Stub Query for `ranking` (in `route.ts`)

```typescript
const ranking: RankingEntry[] = members
  .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime())
  .slice(0, 5)
  .map((m, i) => ({
    user_id: m.user_id,
    full_name: m.full_name,
    avatar_color: m.avatar_color,
    points: 0,
    position: i + 1,
  }))
```

### API Endpoints

#### `GET /api/leagues/[id]` — extended

Existing behavior unchanged. Three new fields appended to the response object:

| Field | Source | Notes |
|-------|--------|-------|
| `prizes` | `SELECT prizes FROM leagues WHERE id = :id` | `null` if column absent or unset |
| `user_stats` | Computed stub | All fields `0`; future PRD replaces with real scoring query |
| `ranking` | Derived from existing `members` array | Top-5 by `joined_at`, `points: 0` |

No new endpoints. The existing `GET /api/leagues/[id]/invite-link` endpoint is **not modified** (remains admin-only; unused by this feature).

## Integration Points

**WhatsApp deep link:**
`https://api.whatsapp.com/send?text={encodeURIComponent(message)}`
Opens WhatsApp app on mobile; opens web.whatsapp.com on desktop. Pre-filled message (placeholder — subject to copy sign-off):
```
Entre no meu bolão da Copa! 🏆 Clique para participar: {inviteUrl}
```

**Clipboard API:**
`navigator.clipboard.writeText(inviteUrl)` — requires HTTPS or localhost.
Fallback: `document.execCommand('copy')` for older Safari. On failure: toast with manual URL display.

**Flag CDN (`flagcdn.com`):**
Already in `next.config.ts` `remotePatterns`. Used in `YourBetCard` for champion/vice flag images.
Pattern: `https://flagcdn.com/w80/{teamCode}.png`

**`PreCopaBetModal`:**
Used as-is from `components/PreCopaBetModal.tsx`. Props: `{ leagueId: string, onComplete: () => void }`.
Called from `ChampionBanner` (CTA button) and `YourBetCard` ("Alterar aposta" button).
`onComplete` triggers a re-fetch of `LeagueDetail` in `page.tsx` to update `has_champion_bet` and display `YourBetCard`.

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
|-----------|-------------|----------------------|-----------------|
| `app/ligas/[id]/page.tsx` | Modified (full rewrite) | Old members list and admin UI (configure, remove, delete) removed | Remove old code; document admin restoration in future PRD |
| `app/ligas/[id]/components/` | New | 11 new component files | Create directory and all components |
| `app/api/leagues/[id]/route.ts` | Modified | Add `prizes`, `user_stats`, `ranking` to GET response | Extend Supabase SELECT and response object |
| `lib/api/types.ts` | Modified | Add `UserStats`, `RankingEntry`; add 3 fields to `LeagueDetail` | Add interfaces and extend type |
| `components/PreCopaBetModal.tsx` | Unchanged | Reused as-is | None |
| `lib/copa-teams.ts` | Unchanged | `BET_DEADLINE` consumed by `ChampionBanner` | None |
| `components/topbar/LayoutWrapper.tsx` | Verify | `/ligas/[id]` must remain in the hide-topbar route list | Confirm no regression |
| `leagues` DB table | Conditional | May require `prizes TEXT` column | Verify schema; migrate if absent |

## Testing Approach

### Unit Tests

- **`ChampionBanner`**
  - Renders "Apostar Agora" CTA when `has_champion_bet=false`
  - Renders "Revisar Aposta" CTA when `has_champion_bet=true`
  - Entire banner absent from DOM when mocked date > `BET_DEADLINE`
  - Countdown shows correct days/hours

- **`StatsRow`**
  - Renders all 4 cards without error when all stats are `0`
  - Displays correct values when non-zero stats passed

- **`RankingCard`**
  - Current user's row has highlight class
  - Position 1 shows gold badge, 2 silver, 3 bronze
  - Renders correctly with fewer than 5 entries

- **`InviteShareButton`**
  - Calls `navigator.clipboard.writeText` with correct URL on copy action
  - WhatsApp href contains correctly encoded URL and message
  - Shows success toast after copy

- **`YourBetCard`**
  - Hidden when `has_champion_bet=false`
  - Shows "Alterar aposta" button only when current date < `BET_DEADLINE`
  - Displays correct champion and vice team names with flags

### Integration Tests

- `GET /api/leagues/[id]` returns `prizes`, `user_stats`, and `ranking` fields
- Page renders without error in pre-bet state (`has_champion_bet=false`, all stats `0`)
- Page renders without error in post-bet state (`has_champion_bet=true`)
- Banner absent when request date is mocked past `BET_DEADLINE`
- Back navigation link (`← Minhas Ligas`) resolves to `/ligas`

## Development Sequencing

### Build Order

1. **DB schema verification and migration** — no dependencies. Check `prizes` column; run `ALTER TABLE` migration if absent.
2. **Type extensions** (`lib/api/types.ts`) — depends on step 1 (schema confirmed). Add `UserStats`, `RankingEntry`; add `prizes`, `user_stats`, `ranking` to `LeagueDetail`.
3. **API extension** (`app/api/leagues/[id]/route.ts`) — depends on step 2 (types defined). Add stub `user_stats`, `ranking`, and `prizes` to the GET response.
4. **Static section components** (`ScoringSchemeCard`, `UpcomingGamesStub`, `BottomTabBar`) — depends on step 2. No runtime data; implement and unit-test in isolation.
5. **Data-driven section components** (`ChampionBanner`, `PrizesStrip`, `StatsRow`, `YourBetCard`, `RankingCard`) — depends on steps 2 and 3.
6. **Navigation shell** (`PainelSidebar`, `PainelTopBar`, `InviteShareButton`) — depends on steps 2 and 3. `InviteShareButton` uses `invite_token` from the extended response.
7. **Page orchestrator rewrite** (`app/ligas/[id]/page.tsx`) — depends on steps 3–6. Fetches data, renders the responsive layout shell, composes all section components.
8. **Integration and E2E tests** — depends on step 7.

### Technical Dependencies

- `prizes TEXT` column on `leagues` table (step 1 gate)
- `NEXT_PUBLIC_SITE_URL` env var set in all environments
- `PreCopaBetModal` props signature stable (no changes permitted per PRD)

## Technical Considerations

### Known Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `prizes` column absent from DB | Medium | Verify in step 1; wrap API SELECT in try/catch; return `null` if column missing until migration runs |
| `navigator.clipboard` unavailable (HTTP or old Safari) | Low | Fall back to `execCommand('copy')`; on failure, show toast with invite URL for manual copy |
| Inert nav links confuse users | Medium | Apply `opacity-50 cursor-not-allowed pointer-events-none` + `aria-disabled="true"` to all inert tabs |
| `BET_DEADLINE` edge case at exact deadline moment | Low | `ChampionBanner` visibility computed once on render from `BET_DEADLINE`; no polling needed |
| Admin features absent until future PRD | High (visibility) | Document in release notes; admin actions (configure, remove, delete) are temporarily unavailable |
| `NEXT_PUBLIC_SITE_URL` missing in some environments | Low | Add `window.location.origin` as fallback in `InviteShareButton` |

### Back to Leagues Navigation (Desktop)

The sidebar "Ligas" item is inert in this phase. The page header includes a breadcrumb link `← Minhas Ligas` that navigates to `/ligas`. This is the sole functional back CTA on desktop in Phase 1.

### Responsive Layout Breakpoint

Sidebar and desktop layout: `≥1024px` (`lg:` Tailwind prefix).
Mobile layout (PainelTopBar + BottomTabBar): `<1024px`.
Implemented via `hidden lg:flex` (sidebar) and `flex lg:hidden` (bottom tab bar + mobile top bar).

## Architecture Decision Records

- [ADR-001: League Panel Layout Approach](adrs/adr-001.md) — Single-scroll design-faithful layout chosen over progressive disclosure or hero-only approaches.
- [ADR-002: Page Component Decomposition Strategy](adrs/adr-002.md) — Full rewrite of `page.tsx` into a thin orchestrator with co-located section components; admin features deferred to future PRD.
- [ADR-003: API Stats Fields — Stub Zeros with Defined Shape](adrs/adr-003.md) — Extend `LeagueDetail` now with the final type shape; return stub zeros until real scoring data exists in a future PRD.
- [ADR-004: Invite URL — Client-Side Construction from invite_token](adrs/adr-004.md) — Build invite URL client-side from `invite_token` already in `LeagueDetail`; avoids the admin-only `/invite-link` endpoint.
