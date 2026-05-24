# TechSpec: League Welcome Onboarding Modal Flow

## Executive Summary

This spec covers a 4-screen modal wizard that fires automatically on a user's first access to any league. The implementation touches four layers: a Supabase migration, two API contract changes, a new write endpoint, and a new React component. No new libraries are needed — the wizard reuses the existing fixed-overlay modal pattern already present in `app/ligas/[id]/page.tsx`.

The primary trade-off: adding `invite_token` and `user_onboarded_at` to the existing `GET /api/leagues/{id}` response slightly widens the API contract but eliminates extra round-trips at page load. The alternative — separate endpoints — would cause a waterfall and add complexity for a feature that must not delay the league page render.

---

## System Architecture

### Component Overview

```
app/ligas/[id]/page.tsx          (modified)
  └── LeagueWelcomeModal         (new — components/LeagueWelcomeModal.tsx)
        ├── ScreenHowItWorks     (inline sub-component)
        ├── ScreenTimeRules      (inline sub-component)
        ├── ScreenScoring        (inline sub-component)
        └── ScreenInvite         (inline sub-component)

app/api/leagues/[id]/route.ts    (modified — GET adds invite_token, user_onboarded_at)
app/api/leagues/[id]/me/route.ts (new — PATCH sets onboarded_at)

lib/api/types.ts                 (modified — LeagueDetail extended)
supabase/migrations/
  └── 20260523000016_add_league_members_onboarded_at.sql  (new)
```

**Data flow:**
1. `app/ligas/[id]/page.tsx` fetches `GET /api/leagues/{id}` on mount
2. If `data.user_onboarded_at === null`, renders `<LeagueWelcomeModal />`
3. Modal opens → fires `PATCH /api/leagues/{id}/me` immediately (sets `onboarded_at`)
4. User navigates through 4 screens; on Screen 4 CTA → modal closes, league page is visible

---

## Implementation Design

### Core Interfaces

```typescript
// lib/api/types.ts — updated LeagueDetail
export interface LeagueDetail extends LeagueSummary {
  description: string | null
  created_by: string
  created_at: string
  invite_token: string              // NEW — for share URL on Screen 4
  user_onboarded_at: string | null  // NEW — null = show modal
  members: LeagueMember[]
}

// components/LeagueWelcomeModal.tsx — props
interface LeagueWelcomeModalProps {
  leagueId: string
  leagueName: string
  inviteToken: string
  role: 'admin' | 'member'
  onComplete: () => void
}
```

### Data Models

**Migration: `supabase/migrations/20260523000016_add_league_members_onboarded_at.sql`**

```sql
ALTER TABLE public.league_members
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ DEFAULT NULL;

-- Allow members to update their own onboarded_at
CREATE POLICY "league_members_update_own_onboarded_at"
  ON public.league_members
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

**Updated `LeagueDetail` response shape:**

```typescript
{
  id: string
  name: string
  access_type: 'open' | 'private'
  logo_url: string | null
  role: 'admin' | 'member'
  member_count: number
  description: string | null
  created_by: string
  created_at: string
  invite_token: string              // NEW
  user_onboarded_at: string | null  // NEW
  members: LeagueMember[]
}
```

### API Endpoints

#### Modified: `GET /api/leagues/{id}`

Existing endpoint — adds two fields to the response.

**Server-side changes in `app/api/leagues/[id]/route.ts`:**
- Extend the Supabase SELECT to include `invite_token` from the `leagues` table
- After fetching `league_members`, read the calling user's row to extract `onboarded_at` and populate `user_onboarded_at` in the response

```typescript
// Pseudocode for reading user_onboarded_at from the already-fetched members list
const currentMember = membersResult.data.find(m => m.user_id === session.user.id)
const user_onboarded_at = currentMember?.onboarded_at ?? null
```

The `onboarded_at` column must be included in the `league_members` SELECT query. All other response fields and status codes remain unchanged.

---

#### New: `PATCH /api/leagues/{id}/me`

File: `app/api/leagues/[id]/me/route.ts`

**Purpose:** Sets `onboarded_at = NOW()` for the authenticated user's `league_members` row.

**Request:**
```
PATCH /api/leagues/{id}/me
Authorization: session cookie (handled by Supabase SSR client)
Body: (empty)
```

**Response:**
```
204 No Content   — success (onboarded_at set or already set)
401 Unauthorized — no valid session
403 Forbidden    — user is not a member of this league
404 Not Found    — league does not exist
```

**Implementation:**
```typescript
// app/api/leagues/[id]/me/route.ts
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leagueId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('league_members')
    .update({ onboarded_at: new Date().toISOString() })
    .eq('league_id', leagueId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
```

---

## Integration Points

**Supabase RLS:** The migration adds an `UPDATE` policy on `league_members` scoped to `user_id = auth.uid()`. Without this policy the PATCH will silently return 0 rows updated (Supabase default: deny). The policy is restricted to `onboarded_at` via the `WITH CHECK` clause matching the `USING` clause — no privilege escalation is possible.

**WhatsApp share link:** `https://wa.me/?text={encodeURIComponent(message)}`. No authentication or API key required. The link opens native WhatsApp on mobile and `web.whatsapp.com` on desktop. The invite URL embedded in the message: `${process.env.NEXT_PUBLIC_SITE_URL}/join?token=${inviteToken}`.

---

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
|-----------|-------------|---------------------|-----------------|
| `lib/api/types.ts` | Modified | `LeagueDetail` gains 2 new optional fields | Update type; verify all consumers compile |
| `app/api/leagues/[id]/route.ts` | Modified | GET returns `invite_token`, `user_onboarded_at` | Extend SELECT + response mapping |
| `app/ligas/[id]/page.tsx` | Modified | Renders `<LeagueWelcomeModal>` conditionally | Add modal state + conditional render |
| `components/LeagueWelcomeModal.tsx` | New | 4-screen wizard component | Create from scratch |
| `app/api/leagues/[id]/me/route.ts` | New | PATCH endpoint for onboarded_at | Create new route file |
| `supabase/migrations/` | New | Adds `onboarded_at` column + RLS policy | Write and run migration |
| `tests/unit/ligas-page.test.tsx` | Modified | Test modal trigger logic | Add cases for modal show/hide |
| `tests/integration/leagues.test.ts` | Modified | Test new GET fields + PATCH endpoint | Add integration tests |

---

## Testing Approach

### Unit Tests

**`components/LeagueWelcomeModal.tsx` (`tests/unit/LeagueWelcomeModal.test.tsx`, new file):**
- Screen 1 renders on open; "Voltar" button absent on Screen 1
- "Próximo" advances to Screen 2; progress dot index updates
- "Voltar" on Screen 2 returns to Screen 1
- Screen 3 renders "Convidar amigos" button (not "Próximo")
- Screen 4 shows creator copy when `role === 'admin'`; joiner copy when `role === 'member'`
- "Copiar" button calls `navigator.clipboard.writeText` with the correct invite URL
- WhatsApp anchor `href` contains `wa.me/?text=` with encoded message and invite URL
- "Pronto, bora jogar!" calls `onComplete`
- `PATCH /api/leagues/{id}/me` is called exactly once on component mount

**`app/ligas/[id]/page.tsx` (existing `tests/unit/ligas-page.test.tsx`):**
- Modal renders when `user_onboarded_at === null` in API response
- Modal does not render when `user_onboarded_at` is a non-null string
- After `onComplete` fires, modal is removed from DOM

### Integration Tests

**`tests/integration/leagues.test.ts`:**
- `GET /api/leagues/{id}` response includes `invite_token` (non-null string) and `user_onboarded_at` fields
- `user_onboarded_at` is null for a freshly joined member
- `user_onboarded_at` is a timestamp string after calling `PATCH /api/leagues/{id}/me`
- `PATCH /api/leagues/{id}/me` returns 401 for unauthenticated requests
- `PATCH /api/leagues/{id}/me` returns 403 for a user not in the league
- `PATCH /api/leagues/{id}/me` is idempotent — calling twice does not error

---

## Development Sequencing

### Build Order

1. **Migration** (`20260523000016_add_league_members_onboarded_at.sql`) — no dependencies; run first so `onboarded_at` column exists before any code references it

2. **Type update** (`lib/api/types.ts`) — depends on step 1; add `invite_token: string` and `user_onboarded_at: string | null` to `LeagueDetail`

3. **GET endpoint update** (`app/api/leagues/[id]/route.ts`) — depends on step 2; extend SELECT to include `invite_token` from `leagues` and `onboarded_at` from `league_members`; populate `user_onboarded_at` in response

4. **PATCH endpoint** (`app/api/leagues/[id]/me/route.ts`) — depends on steps 1 and 2; new route file using `getSupabaseServerClient` pattern

5. **`LeagueWelcomeModal` component** (`components/LeagueWelcomeModal.tsx`) — depends on step 4 (calls PATCH on mount) and step 2 (consumes `invite_token` from props)

6. **Page integration** (`app/ligas/[id]/page.tsx`) — depends on steps 3 and 5; reads `user_onboarded_at` from fetched `LeagueDetail`, renders `<LeagueWelcomeModal>` when null

7. **Tests** — depends on all previous steps

### Technical Dependencies

- Supabase migration must be applied to all environments (local, staging, production) before deploying API changes
- `NEXT_PUBLIC_SITE_URL` must be set in all environments; used in the copy-link URL and WhatsApp message
- The `league_members_update_own_onboarded_at` RLS policy must be active before the PATCH endpoint is deployed

---

## Monitoring and Observability

- **`onboarded_at` timestamp** is the primary signal: query `league_members WHERE onboarded_at IS NOT NULL GROUP BY DATE(onboarded_at)` for daily onboarding starts
- **Invite activity**: track join count via invite by correlating `league_members.joined_at` with dates where `onboarded_at` was set — indirect proxy for Screen 4 WhatsApp/copy usage in Phase 1
- **API errors**: existing error logging on API routes covers 4xx/5xx from the new PATCH endpoint; no new instrumentation required

---

## Technical Considerations

### Known Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| RLS policy missing on `onboarded_at` UPDATE causes silent no-op | High if migration is incomplete | Integration test asserts the DB row is actually updated |
| `invite_token` is null in DB for a league (data integrity gap) | Low — token added in earlier migration | Graceful fallback: disable copy-link input; show "Token não disponível" |
| `navigator.clipboard.writeText` unavailable (non-HTTPS or older browser) | Low | Wrap in try-catch; fallback to `document.execCommand('copy')` |
| WhatsApp `wa.me` link prompts QR scan on some desktop browsers | Medium — known behavior | Accepted; `wa.me` is the canonical format; native app detection is OS-level |

---

## Architecture Decision Records

- [ADR-001: Per-League Welcome Onboarding Flow](adrs/adr-001.md) — Show all 4 screens on first access to each league, tracked by `onboarded_at` on `league_members`
- [ADR-002: Extend LeagueDetail API Response](adrs/adr-002.md) — Add `invite_token` and `user_onboarded_at` to `GET /api/leagues/{id}` for all members to avoid extra round-trips
- [ADR-003: PATCH /api/leagues/{id}/me Write Path](adrs/adr-003.md) — New minimal endpoint for self-updating `onboarded_at`; chosen over reusing existing PATCH to keep admin/member concerns separate
