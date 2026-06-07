# TechSpec: League Permissions & Test-League Hiding

## Executive Summary

This change gates league creation behind a new per-user boolean and removes the seeded test
league (`00000000-0000-0000-0000-000000000001`) from all user-facing listings, while keeping
it usable by its members (testers). Authorization is enforced **at the database (RLS) layer**
— the project's existing authorization model — with the API and UI layered on top for clean
errors and a tidy interface. A single migration set adds `users.can_create_league` (default
`false`), grants it to two operator e-mails, tightens the `leagues_insert` and
`leagues_select_open` policies, and stops the `handle_new_user()` trigger from auto-enrolling
new users into the test league.

The primary trade-off: enforcing in RLS **and** the API means the `can_create_league` check
is expressed in two places that must stay aligned, in exchange for an authoritative security
boundary plus friendly client errors. Because new users are no longer auto-enrolled anywhere,
the design also makes "no league" a valid, non-error state that guides users to enter via a
league invite link.

## System Architecture

### Component Overview

- **Database schema & RLS (Supabase migrations)** — authoritative layer. Adds the
  `can_create_league` column, grants it to operator e-mails, and updates three policy/trigger
  objects: `leagues_insert` (creation gate), `leagues_select_open` (test-league hiding), and
  `handle_new_user()` (stop auto-enroll).
- **`POST /api/leagues` (`app/api/leagues/route.ts`)** — reads the caller's
  `can_create_league` and returns `403` when false, before attempting the insert.
- **Leagues hub page (`app/ligas/page.tsx`)** — server component; reads the caller's
  `can_create_league` and conditionally renders `CreateLeagueModal`. Renders the no-league
  empty state.
- **`GET /api/auth/me` & `app/dashboard/page.tsx`** — updated to treat "no active league" as a
  valid state (return `league: null` / redirect to `/ligas`) instead of erroring.

Data flow: the migrations define the rules; reads (`getLeaguesHub`, discover) inherit the
test-league exclusion automatically through RLS; writes (`POST /api/leagues`) are blocked by
both the API guard and the RLS `WITH CHECK`.

## Implementation Design

### Core Interfaces

The capability is surfaced to the leagues page through a small server-side helper so the page
does not inline a Supabase query. The primary type other components depend on:

```typescript
// lib/leagues/can-create-league.ts
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Returns whether the given user is allowed to create leagues.
 * Reads users.can_create_league; defaults to false on any missing row.
 */
export async function canCreateLeague(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('can_create_league')
    .eq('id', userId)
    .single()

  if (error || !data) return false
  return data.can_create_league === true
}
```

`AuthUser` (in `lib/api/types.ts`) gains an optional flag so `/api/auth/me` can expose it to
client components without a second round-trip:

```typescript
export interface AuthUser {
  id: string
  email: string
  // ...existing fields...
  can_create_league: boolean
}
```

### Data Models

`public.users` — add one column:

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `can_create_league` | `BOOLEAN` | `false` `NOT NULL` | New users are born `false`. |

No other table changes. The test league exclusion uses the existing fixed UUID
`00000000-0000-0000-0000-000000000001`; no new column or table is introduced.

Grant (one-time, existing accounts only — see ADR-004 / the chosen "UPDATE now" approach):

```sql
UPDATE public.users
   SET can_create_league = true
 WHERE email IN ('hen.leao.rocha@gmail.com', 'henrique.rocha@arkmeds.com');
```

RLS changes:

```sql
-- Creation gate (replaces the old leagues_insert)
DROP POLICY IF EXISTS leagues_insert ON public.leagues;
CREATE POLICY leagues_insert ON public.leagues
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (SELECT 1 FROM public.users u
                WHERE u.id = auth.uid() AND u.can_create_league = true)
  );

-- Hide test league from open discovery (replaces leagues_select_open)
DROP POLICY IF EXISTS "leagues_select_open" ON public.leagues;
CREATE POLICY "leagues_select_open" ON public.leagues
  FOR SELECT USING (
    (access_type = 'open' AND id <> '00000000-0000-0000-0000-000000000001'::uuid)
    OR EXISTS (SELECT 1 FROM public.league_members lm
               WHERE lm.league_id = id AND lm.user_id = auth.uid())
  );
```

Trigger change — drop the auto-enroll INSERT from `handle_new_user()`, keeping the
`public.users` upsert:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email,
          NEW.raw_user_meta_data->>'full_name',
          NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  -- Auto-enroll into the test league removed (PRD ADR-002).
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### API Endpoints

| Method | Path | Change |
|--------|------|--------|
| POST | `/api/leagues` | Before insert, fetch `can_create_league`; if `false`, return `403 FORBIDDEN` (`formatError('FORBIDDEN', 'Você não tem permissão para criar ligas', 403)`). |
| GET | `/api/auth/me` | Include `can_create_league` in the `user` payload; when no active league, return `200` with `league: null` instead of `500`. |

`GET /api/leagues/discover` and `getLeaguesHub()` are **unchanged** — they inherit the
test-league exclusion through the updated `leagues_select_open` policy.

## Integration Points

Supabase Postgres / PostgREST via the user session (anon key + RLS). No external services.
Authorization is carried by `auth.uid()` inside the policies; the API uses the same session
client (`getSupabaseServerClient()`), so RLS applies automatically.

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
|-----------|-------------|----------------------|-----------------|
| `users` table | modified | New `can_create_league` column; low risk (additive, defaulted). | Migration adds column. |
| `handle_new_user()` trigger | modified | Stops auto-enroll; new users start league-less. Medium risk: downstream code assuming every user has a league. | Update trigger; harden no-league paths. |
| `leagues_select_open` policy | modified | Test league hidden from non-members across all read surfaces. Low-medium risk: a missed member-read path. | Replace policy; verify testers still see it. |
| `leagues_insert` policy | modified | Creation now requires the flag. Risk: legitimate creators lacking the flag are blocked. | Replace policy; grant operator e-mails. |
| `POST /api/leagues` | modified | Adds 403 guard. Low risk. | Add flag check + error. |
| `app/ligas/page.tsx` | modified | Conditionally renders create card; adds no-league empty state. Low risk. | Read flag; render guard + empty state. |
| `app/dashboard/page.tsx` | modified | No-league now redirects to `/ligas` instead of throwing. Low risk. | Replace throw with redirect. |
| `GET /api/auth/me` | modified | Returns `league: null` for no-league users; adds flag to payload. Risk: clients assuming `league` always present. | Update handler; audit consumers. |
| `lib/api/types.ts` | modified | `AuthUser` gains `can_create_league`. Low risk. | Add field. |
| `lib/leagues/can-create-league.ts` | new | Single helper reading the flag. | Add file. |
| Test fixtures/integration tests | modified | Tests auto-joined to the test league via trigger must now join explicitly; new tests for the gate and hiding. | Update `tests/`. |

## Testing Approach

### Unit Tests

- `canCreateLeague()`: returns `true`/`false` per column value; returns `false` on missing
  row or query error.
- `getLeaguesHub()`: existing tests still pass (RLS-level change; mock data already excludes
  the test league). Add a case asserting a member of the test league still receives it.

### Integration Tests

- **Creation gate**: a user with `can_create_league = false` gets `403` from `POST
  /api/leagues` and no row is inserted; a user with `true` succeeds. Verify the RLS path too:
  a direct insert as a non-permitted user is rejected.
- **Test-league hiding**: a non-member user does not see `00000000-…-0001` in
  `getLeaguesHub()` or `/api/leagues/discover`; a member (tester) still sees it.
- **No auto-enroll**: a freshly created user has zero `league_members` rows.
- **No-league state**: `/api/auth/me` returns `200` + `league: null`; `/dashboard` redirects
  to `/ligas`; `/ligas` shows the invite-link empty state.
- Test setup: factories must explicitly add members to leagues now that the trigger no longer
  does so (update `tests/fixtures/factories.ts` and dependent suites).

## Development Sequencing

### Build Order

1. **Migration: add `can_create_league` column + grant operator e-mails** — no dependencies.
2. **Migration: update `leagues_insert`, `leagues_select_open`, and `handle_new_user()`** —
   depends on step 1 (the insert policy references the new column).
3. **`lib/leagues/can-create-league.ts` helper** — depends on step 1 (column exists).
4. **`POST /api/leagues` 403 guard** — depends on step 3.
5. **`app/ligas/page.tsx` conditional create card + no-league empty state** — depends on
   step 3.
6. **`GET /api/auth/me` (flag in payload + `league: null`) and `lib/api/types.ts`** — depends
   on step 1; coordinate with step 5's consumers.
7. **`app/dashboard/page.tsx` no-league redirect** — depends on step 2 (no-league users can
   now exist).
8. **Update tests/fixtures and add new suites** — depends on steps 1–7.

### Technical Dependencies

- Local Supabase must apply the new migrations before app changes can be verified.
- The grant UPDATE assumes the operator rows exist; if `hen.leao.rocha@gmail.com` has not
  signed up yet, grant it manually later (per ADR-004's "UPDATE now" decision).

## Monitoring and Observability

- Reuse the existing structured JSON logs. Emit a `403` log line in `POST /api/leagues` with
  `reason: 'cannot_create_league'` and `user_id` when the gate blocks a request.
- The existing "getLeaguesHub returned zero leagues" warning now also fires for legitimate
  no-league users; treat it as informational, not an error.

## Technical Considerations

### Key Decisions

- **Decision**: Hide the test league via the `leagues_select_open` RLS policy.
  **Rationale**: One change covers every read surface and direct PostgREST access.
  **Trade-off**: A literal UUID lives in a policy. **Rejected**: per-query app filters
  (easy to miss a surface), flipping to `private` (breaks test semantics). See ADR-003.
- **Decision**: Enforce creation in RLS + API. **Rationale**: authoritative gate plus clean
  403. **Trade-off**: the check exists in two aligned places. **Rejected**: RLS-only (ugly
  errors), API-only (bypassable). See ADR-004.
- **Decision**: Grant the two operator e-mails via a one-time `UPDATE` (no trigger
  hardcoding). **Rationale**: simplest; keeps the trigger free of e-mail literals.
  **Trade-off**: a future signup of an operator e-mail needs a manual grant.
- **Decision**: Treat no-league as a valid state guiding to an invite link. **Rationale**:
  new users are no longer auto-enrolled. **Trade-off**: `/api/auth/me` consumers must handle
  `league: null`. See ADR-005.

### Known Risks

- **Risk**: Service-role/tooling queries bypass RLS and still see the test league.
  **Mitigation**: documented; validation tooling handles the UUID explicitly.
- **Risk**: An `/api/auth/me` consumer assumes `league` is always present. **Mitigation**:
  audit consumers during step 6.
- **Risk**: Tests previously relied on auto-enroll. **Mitigation**: update factories to add
  memberships explicitly (step 8).

## Architecture Decision Records

- [ADR-001: Per-user boolean flag to gate league creation](adrs/adr-001.md) — Single
  per-user capability, default off, granted to two e-mails, enforced in UI and server.
- [ADR-002: Hide the test league and stop auto-enrolling users](adrs/adr-002.md) — Reserve
  the test league; exclude from listings and stop auto-enroll while keeping it usable by
  testers.
- [ADR-003: Hide the test league via the `leagues_select_open` RLS policy](adrs/adr-003.md) —
  Centralize the exclusion in RLS rather than per-query filters.
- [ADR-004: Enforce league-creation permission in RLS and the API](adrs/adr-004.md) —
  Authoritative `WITH CHECK` gate plus an API 403 for clean errors.
- [ADR-005: Graceful no-league state guiding users to an invite link](adrs/adr-005.md) —
  Treat no-league as valid; redirect/return `league: null` and show an invite-link empty
  state.
