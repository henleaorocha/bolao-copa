# TechSpec: Bolão da Copa 2026 — Ligas (PRD 2)

## Executive Summary

This TechSpec defines the implementation of multi-league support for Bolão da Copa 2026. The work extends the Foundation (PRD 1) in three areas:

1. **Database layer** — two migrations: add `invite_token` and `active_league_id` columns; add RLS policies for league visibility and membership management.
2. **API layer** — seven new REST endpoints under `/api/leagues/` following the Foundation's structured response envelope.
3. **UI layer** — League Hub screen, topbar context switcher, Create League modal, invite link flow, league detail screen, and admin management — all implemented as Next.js App Router pages and Client Components using the `designReferences/` design system.

**Primary trade-off**: Persisting the active league in the DB (`users.active_league_id`) makes the context cross-device and server-authoritative, at the cost of one extra `UPDATE` per league switch. The alternative (localStorage) was rejected for being device-only and inconsistent with the project's DB-first pattern. This choice means the `/api/auth/me` endpoint becomes the single bootstrap point for the entire app context, and all downstream screens stay stateless.

---

## System Architecture

### Component Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     Client Browser                           │
│                                                              │
│  AppLayout (Server Component)                                │
│  └─ LeagueProvider ('use client') ◄── initialLeague prop    │
│      ├─ Topbar + LeagueSwitcher                              │
│      ├─ /ligas (LeaguesScreen — Hub)                         │
│      │   ├─ My Leagues tab                                   │
│      │   └─ Discover tab                                     │
│      ├─ /ligas/[id] (LeagueDetailScreen)                     │
│      ├─ /join?token=<t> (JoinPage — invite flow)             │
│      └─ /dashboard, /predictions, /ranking (unchanged shell) │
└──────────────────────────────────┬───────────────────────────┘
                                   │ fetch / API calls
┌──────────────────────────────────▼───────────────────────────┐
│               Next.js API Routes (/app/api/*)                │
│                                                              │
│  GET    /api/auth/me                 (updated — active league)│
│  PATCH  /api/auth/me                 (new — set active_league)│
│  GET    /api/leagues                 (user's leagues list)    │
│  POST   /api/leagues                 (create league)         │
│  GET    /api/leagues/discover        (open leagues)          │
│  GET    /api/leagues/[id]            (league detail)         │
│  PATCH  /api/leagues/[id]            (rename / access type)  │
│  DELETE /api/leagues/[id]            (delete league)         │
│  POST   /api/leagues/[id]/join       (join via token or open) │
│  DELETE /api/leagues/[id]/members/[userId] (remove member)   │
└──────────────────────────────────┬───────────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────────┐
│              Supabase (PostgreSQL + Auth)                    │
│                                                              │
│  users          ← new: active_league_id                      │
│  leagues        ← new: invite_token                          │
│  league_members ← existing (role, joined_at)                 │
│  + updated RLS policies                                      │
└──────────────────────────────────────────────────────────────┘
```

**LeagueProvider** — 'use client' React Context Provider mounted in `app/layout.tsx`. Initialized with the server-fetched active league. Exposes `useLeague()` hook to all Client Components.

**LeagueSwitcher** — Topbar dropdown ('use client'). Calls `PATCH /api/auth/me` on selection, then calls `setLeague()` from `useLeague()` for instant UI update without page reload.

**JoinPage** (`/join`) — Server Component. Validates the `?token=` param server-side. Handles unauthenticated cold-start by saving the original URL to `sessionStorage` before OAuth redirect, restoring it in `/auth/callback`.

---

## Implementation Design

### Core Interfaces

**LeagueContext value (shared hook)**
```typescript
interface LeagueSummary {
  id: string
  name: string
  access_type: 'open' | 'private'
  logo_url: string | null
  role: 'admin' | 'member'
  member_count: number
}

interface LeagueContextValue {
  league: LeagueSummary
  setLeague: (l: LeagueSummary) => void
}

export function useLeague(): LeagueContextValue
```

**League detail (API response)**
```typescript
interface LeagueMember {
  user_id: string
  full_name: string | null
  avatar_url: string | null
  avatar_color: string
  role: 'admin' | 'member'
  joined_at: string
}

interface LeagueDetail extends LeagueSummary {
  description: string | null
  created_by: string        // user_id of admin
  created_at: string
  members: LeagueMember[]
}
```

### Data Models

**Migration 1 — `leagues` table additions**
```sql
ALTER TABLE public.leagues
  ADD COLUMN invite_token TEXT UNIQUE
    NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  ADD COLUMN member_count INTEGER NOT NULL DEFAULT 0;

-- Maintain member_count via trigger
CREATE OR REPLACE FUNCTION sync_league_member_count()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.leagues SET member_count = (
    SELECT COUNT(*) FROM public.league_members
    WHERE league_id = COALESCE(NEW.league_id, OLD.league_id)
  ) WHERE id = COALESCE(NEW.league_id, OLD.league_id);
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_member_count
  AFTER INSERT OR DELETE ON public.league_members
  FOR EACH ROW EXECUTE FUNCTION sync_league_member_count();
```

**Migration 2 — `users` table addition**
```sql
ALTER TABLE public.users
  ADD COLUMN active_league_id UUID
    REFERENCES public.leagues(id) ON DELETE SET NULL;
```

**Updated RLS policies**

The existing `leagues` SELECT policy already allows members to see their leagues and open leagues. Two new policies are needed:

```sql
-- League admin can UPDATE their own league
CREATE POLICY leagues_admin_update ON public.leagues
  FOR UPDATE USING (
    auth.uid() = created_by
  );

-- League admin can DELETE their own league
CREATE POLICY leagues_admin_delete ON public.leagues
  FOR DELETE USING (
    auth.uid() = created_by
  );

-- Any authenticated user can INSERT a new league
CREATE POLICY leagues_insert ON public.leagues
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
  );

-- League admin can DELETE members from their leagues
CREATE POLICY league_members_admin_delete ON public.league_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.leagues
      WHERE id = league_members.league_id
        AND created_by = auth.uid()
    )
  );

-- Any authenticated user can INSERT themselves as a member
CREATE POLICY league_members_self_insert ON public.league_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );
```

### API Endpoints

All endpoints follow the Foundation's `ApiResponse<T>` envelope: `{ status, data, timestamp }` on success; `{ status, error, code, statusCode, timestamp }` on error. Authentication is required on all endpoints unless noted.

---

**`GET /api/leagues`** — User's leagues list
```
Response 200: { data: LeagueSummary[] }
  — leagues where the user is a member, ordered by joined_at DESC

Error: 401 SESSION_EXPIRED | 500 DATABASE_ERROR
```

---

**`POST /api/leagues`** — Create league
```
Body: { name: string, access_type: 'open'|'private', description?: string }
Validation: name 2–50 chars; access_type required

Response 201: { data: LeagueSummary }
  — creator is inserted into league_members as 'admin'
  — invite_token generated by DB default
  — active_league_id on users is set to the new league

Error: 400 INVALID_BODY | 401 SESSION_EXPIRED | 500 DATABASE_ERROR
```

---

**`GET /api/leagues/discover`** — Open leagues the user has not joined
```
Response 200: { data: LeagueSummary[] }
  — WHERE access_type='open' AND user is NOT in league_members
  — ordered by member_count DESC, created_at DESC

Error: 401 SESSION_EXPIRED | 500 DATABASE_ERROR
```

---

**`GET /api/leagues/[id]`** — League detail + member list
```
Response 200: { data: LeagueDetail }
  — includes members array; invite_token is EXCLUDED from response

Error: 401 SESSION_EXPIRED | 403 NOT_A_MEMBER | 404 LEAGUE_NOT_FOUND | 500 DATABASE_ERROR
```

---

**`PATCH /api/leagues/[id]`** — Rename or change access type (admin only)
```
Body: { name?: string, access_type?: 'open'|'private' }
Validation: name 2–50 chars if provided

Response 200: { data: LeagueSummary }

Error: 400 INVALID_BODY | 401 SESSION_EXPIRED | 403 NOT_ADMIN | 404 LEAGUE_NOT_FOUND | 500 DATABASE_ERROR
```

---

**`DELETE /api/leagues/[id]`** — Delete league (admin only)
```
Body: { confirm_name: string }  — must match league.name exactly

Response 200: { data: { ok: true } }
  — cascades to league_members; users.active_league_id reset to NULL by FK

Error: 400 CONFIRM_NAME_MISMATCH | 401 SESSION_EXPIRED | 403 NOT_ADMIN | 404 LEAGUE_NOT_FOUND | 500 DATABASE_ERROR
```

---

**`POST /api/leagues/[id]/join`** — Join a league
```
Body: { token?: string }  — required for private leagues; omitted for open leagues

Response 200: { data: LeagueSummary }
  — inserts user into league_members as 'member'
  — sets users.active_league_id to this league

Error: 400 ALREADY_A_MEMBER | 401 SESSION_EXPIRED | 403 INVALID_TOKEN | 404 LEAGUE_NOT_FOUND | 500 DATABASE_ERROR
```

---

**`DELETE /api/leagues/[id]/members/[userId]`** — Remove member (admin only)
```
Response 200: { data: { ok: true } }
  — cannot remove the admin (created_by) themselves

Error: 400 CANNOT_REMOVE_ADMIN | 401 SESSION_EXPIRED | 403 NOT_ADMIN | 404 LEAGUE_NOT_FOUND | 500 DATABASE_ERROR
```

---

**`PATCH /api/auth/me`** — Set active league (updated endpoint)
```
Body: { active_league_id: string }
Validation: user must be a member of that league

Response 200: { data: AuthMeResponse }  — same shape as GET /api/auth/me

Error: 400 INVALID_BODY | 401 SESSION_EXPIRED | 403 NOT_A_MEMBER | 500 DATABASE_ERROR
```

---

**`GET /api/leagues/[id]/invite-link`** — Get invite link for a league (admin only)
```
Response 200: { data: { invite_url: string } }
  — constructs: ${NEXT_PUBLIC_SITE_URL}/join?token=${league.invite_token}
  — invite_token is NEVER returned directly; only the full URL

Error: 401 SESSION_EXPIRED | 403 NOT_ADMIN | 404 LEAGUE_NOT_FOUND
```

---

## Integration Points

### OAuth Cold-Start Redirect Preservation

The `/join?token=<t>` page is accessible to unauthenticated users. When middleware detects no session, instead of a plain redirect to `/login`, it must preserve the original URL:

```
1. /join?token=abc123 requested by unauthenticated user
2. middleware.ts stores request URL in response header: x-invite-redirect: /join?token=abc123
3. Login page reads header and stores value in sessionStorage: inviteRedirect = /join?token=abc123
4. After OAuth callback success, /auth/callback checks sessionStorage for inviteRedirect
5. If present: redirect to that URL and clear the key
6. If absent: redirect to /dashboard (existing behavior)
```

This is the only integration point beyond the existing Supabase Auth flow. No new external services.

---

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
|-----------|-------------|---------------------|-----------------|
| `supabase/migrations/` | new (×2) | Add `invite_token` to `leagues`; add `active_league_id` to `users`; add new RLS policies; add `member_count` trigger. Medium risk: RLS changes are security-critical. | Test all new policies with Supabase RLS test tool; verify cascades locally |
| `lib/league-context.tsx` | new | `LeagueProvider` + `useLeague()` hook. Low risk; standard React Context. | Unit-test hook in isolation |
| `app/layout.tsx` | modified | Wrap children in `LeagueProvider`; fetch active league server-side from updated `/api/auth/me`. Medium risk: root layout change affects every page. | Smoke-test all existing routes after change |
| `app/api/auth/me/route.ts` | modified | Replace hardcoded `DEFAULT_LEAGUE_ID` with `users.active_league_id` (with NULL fallback). Low risk: behavior identical for existing users whose `active_league_id IS NULL`. | Update unit tests for the endpoint |
| `app/api/auth/me/route.ts` | modified | Add `PATCH` handler to update `active_league_id`. Low risk: new method on existing file. | |
| `app/api/leagues/` | new | 7 new route handlers. Medium risk: each endpoint requires correct auth + RLS enforcement. | Integration test for each endpoint including error paths |
| `app/ligas/page.tsx` | new | League Hub (My Leagues + Discover tabs). Low risk: read-only UI. | Manual test on mobile viewport (375px) |
| `app/ligas/[id]/page.tsx` | new | League Detail + member list + admin actions. Low risk: UI only; mutations via API. | Manual test admin vs member views |
| `app/join/page.tsx` | new | Invite join flow (Server Component). Medium risk: cold-start OAuth redirect loop. | E2E test: unauthenticated → OAuth → join |
| `components/topbar/LeagueSwitcher.tsx` | new | Topbar dropdown. Low risk. | Manual test with multiple leagues |
| `app/dashboard/page.tsx` | modified | Replace `DEFAULT_LEAGUE_ID` with `league.id` from `useLeague()`. Low risk: same logic, dynamic ID. | |
| `lib/user-sync.ts` | modified | Remove hard-enrollment in `DEFAULT_LEAGUE_ID` from `ensureUserSynced()`; this is now handled only by the DB trigger (which auto-enrolls in the default league). | Verify trigger still fires on first login |

---

## Testing Approach

### Unit Tests

**Components to test:**
- `useLeague()` hook — verify initial value, `setLeague()` triggers re-render, value is accessible in nested consumers
- `formatSuccess` / `formatError` helpers (already tested in Foundation; add league-specific error codes)
- League name validation function (2–50 chars, trim whitespace, reject empty)

### Integration Tests

Key scenarios (run against local `supabase start`):

1. **League creation + auto-admin**: `POST /api/leagues` → user appears in `league_members` with role `'admin'`; `users.active_league_id` is set to the new league.

2. **Invite link + join (private league)**: Create private league → get invite URL → second user `POST /api/leagues/[id]/join` with token → member appears in member list.

3. **Open league discovery + join**: Create open league → different user hits `GET /api/leagues/discover` → sees the league → `POST /api/leagues/[id]/join` without token → joined.

4. **RLS: private league invisible without membership**: User A creates private league → User B `GET /api/leagues/[id]` → `403 NOT_A_MEMBER`. User B also cannot see it in `GET /api/leagues/discover`.

5. **Admin remove member**: Admin calls `DELETE /api/leagues/[id]/members/[userId]` → member no longer in list; member's predictions and scores untouched in DB.

6. **Delete league name confirmation**: `DELETE /api/leagues/[id]` with wrong `confirm_name` → `400 CONFIRM_NAME_MISMATCH`. Correct name → league deleted; all `league_members` rows cascade-deleted; `users.active_league_id` set to NULL by FK.

7. **Cold-start invite redirect**: Unauthenticated GET `/join?token=abc` → middleware stores URL → OAuth redirect → callback restores URL → user lands on join page.

8. **Active league switcher persists on refresh**: User switches active league → `PATCH /api/auth/me` → hard page reload → `GET /api/auth/me` returns the same league.

---

## Development Sequencing

### Build Order

1. **DB migrations** — add `invite_token` + `active_league_id` columns, `member_count` trigger, new RLS policies. No dependencies; start here.

2. **Updated `GET /api/auth/me`** — replace hardcoded `DEFAULT_LEAGUE_ID` with dynamic `active_league_id` (NULL fallback). Depends on step 1 (column must exist).

3. **`LeagueProvider` + `useLeague()` hook** — `lib/league-context.tsx`. Depends on step 2 (initial value comes from `/api/auth/me` response).

4. **`app/layout.tsx` update** — mount `LeagueProvider` with server-fetched active league. Depends on steps 2 and 3.

5. **League CRUD API Routes** (`POST /api/leagues`, `GET /api/leagues`, `GET /api/leagues/discover`, `PATCH /api/leagues/[id]`, `DELETE /api/leagues/[id]`). Depends on step 1 (schema) and step 2 (auth pattern established).

6. **Member management API Routes** (`GET /api/leagues/[id]`, `POST /api/leagues/[id]/join`, `DELETE /api/leagues/[id]/members/[userId]`, `GET /api/leagues/[id]/invite-link`). Depends on step 5 (league must exist to have members).

7. **`PATCH /api/auth/me`** (set active league). Depends on steps 1 and 2.

8. **League Hub screen** (`app/ligas/page.tsx`) — My Leagues + Discover tabs. Depends on steps 5 and 6 (APIs must return data).

9. **LeagueSwitcher component** (topbar). Depends on steps 3, 4, and 7.

10. **League Detail screen** (`app/ligas/[id]/page.tsx`) — member list + admin actions. Depends on step 6.

11. **Join page** (`app/join/page.tsx`) + OAuth redirect preservation in `middleware.ts` and `/auth/callback`. Depends on steps 5 and 6.

12. **Dashboard refactor** — replace `DEFAULT_LEAGUE_ID` with `useLeague().league.id`. Depends on steps 3 and 4.

13. **Integration tests** — all scenarios in Testing Approach. Depends on steps 1–12.

### Technical Dependencies

- Steps 2–13 all depend on **step 1** (migrations deployed locally via `supabase db push`).
- Steps 8–12 (UI) can start in parallel once the API routes they consume (steps 5–7) are complete.
- Step 13 (tests) can begin for completed endpoints as soon as each API route is done — no need to wait for full UI.

---

## Monitoring and Observability

### Key Metrics

- **League creation rate**: leagues created per day (target: ≥ 30% of active users in first week)
- **Invite conversion rate**: `/join` page visits → successful joins (target: ≥ 50%)
- **Active league switch latency**: `PATCH /api/auth/me` p95 response time (target: < 300ms)
- **Discovery join rate**: joins from `/api/leagues/discover` vs. invite token (target: ≥ 10% from discovery)

### Log Events

All existing Foundation log events are preserved. New events:

```json
{ "event": "league_created", "league_id": "uuid", "access_type": "private", "user_id": "uuid" }
{ "event": "league_joined", "league_id": "uuid", "via": "invite|discover|direct", "user_id": "uuid" }
{ "event": "league_deleted", "league_id": "uuid", "user_id": "uuid" }
{ "event": "member_removed", "league_id": "uuid", "removed_user_id": "uuid", "admin_id": "uuid" }
{ "event": "active_league_switched", "from_league_id": "uuid", "to_league_id": "uuid", "user_id": "uuid" }
{ "event": "invite_cold_start", "token_prefix": "abc1", "user_id": null }
```

### Alerting

- **RLS violation on `leagues` (private league exposed)**: treat as security incident; alert immediately.
- **`PATCH /api/auth/me` error rate > 5%**: alert (context switcher broken; degrades every screen).

---

## Technical Considerations

### Key Decisions

**1. `active_league_id` on `users` table** [[ADR-002]]
- Cross-device, server-authoritative, consistent with DB-first pattern.
- NULL fallback: first `league_members` row by `joined_at ASC`.

**2. `invite_token` as column on `leagues`** [[ADR-003]]
- Single lookup, no JOIN. 128-bit hex token prevents enumeration.
- Token excluded from all API responses; only returned wrapped in the full invite URL.

**3. React Context for active league** [[ADR-004]]
- No new dependencies. Provider initialized server-side, updated client-side on switch.
- Context value memoized with `useMemo` to prevent unnecessary re-renders.

**4. No logo upload in MVP** — auto-generated initial avatar (first letter + design system color) replaces file upload. Simplifies surface area; Supabase Storage setup deferred to Phase 2.

**5. API Routes for all mutations** — consistent with Foundation; server-side validation before any DB write; no raw Supabase client calls from the browser for mutations.

### Known Risks

**1. RLS policy for private leagues**
- **Risk**: A misconfigured policy could expose private league rows to non-members.
- **Likelihood**: Medium (RLS is security-critical and complex).
- **Mitigation**: Integration test scenario 4 specifically verifies this. Run Supabase RLS test tool on new policies before every deploy.

**2. Cold-start OAuth loop loses invite URL**
- **Risk**: User clicks invite link → redirected to Google OAuth → returns to `/dashboard` instead of `/join`.
- **Likelihood**: High without the preservation mechanism.
- **Mitigation**: `sessionStorage` preservation described in Integration Points. E2E test scenario 7 covers this.

**3. `active_league_id` points to a deleted or left league**
- **Risk**: User context becomes invalid; all screens break.
- **Likelihood**: Low (FK `ON DELETE SET NULL` handles deletion; remove-member flow sets `active_league_id` to NULL for the removed user).
- **Mitigation**: `/api/auth/me` must verify membership before returning the active league; reset to NULL and use fallback if not a member.

**4. `member_count` trigger contention**
- **Risk**: Concurrent joins to a popular open league could cause row-level lock contention on the `leagues` row.
- **Likelihood**: Low at MVP scale (< 200 members per league).
- **Mitigation**: `member_count` is a denormalized cache; if contention arises, switch to a `COUNT(*)` subquery in the SELECT instead of storing the count.

---

## Architecture Decision Records

- [ADR-001: Liga as Central Context Hub with Dedicated Screen](adrs/adr-001.md) — Dedicated League Hub screen + global topbar context switcher over modal-first and per-route alternatives.
- [ADR-002: Active League Persisted as DB Column on users Table](adrs/adr-002.md) — `users.active_league_id` (nullable, ON DELETE SET NULL) as the cross-device, server-authoritative source of truth for the active league context.
- [ADR-003: Invite Token as Column on leagues Table](adrs/adr-003.md) — Single `invite_token TEXT UNIQUE` column on `leagues` (128-bit hex) over a separate `league_invites` table; sufficient for MVP, YAGNI applied.
- [ADR-004: React Context for Active League Client State](adrs/adr-004.md) — `LeagueProvider` + `useLeague()` hook over Zustand; no new dependencies required for a single shared value.
