# TechSpec: Create New League

## Executive Summary

This feature adds a league creation modal to the `/ligas` page. The page is a Next.js Server Component and must remain so; a self-contained `CreateLeagueModal` client component encapsulates the trigger card, form state, API call, and post-creation navigation without touching the server-side data path.

The primary trade-off is that the "Criar nova liga" card UI is owned by the new client component rather than the server page, creating a minor duplication of card styles. This is the idiomatic Next.js boundary pattern and is preferable to converting the page to a client component and losing SSR data fetching.

Two concrete file changes are required: the new `components/CreateLeagueModal.tsx` and a small extension to `app/api/leagues/route.ts` to accept and persist the `prize_pool` field.

---

## System Architecture

### Component Overview

```
app/ligas/page.tsx (Server Component)
  └── <CreateLeagueModal />          ← new, 'use client'
        ├── Dashed card trigger (replaces static card at lines 101–110)
        ├── Modal overlay + form
        └── fetch('/api/leagues', POST)
              └── app/api/leagues/route.ts (extended)
                    └── supabase.from('leagues').insert(...)
                    └── supabase.from('league_members').insert(...)
                    └── supabase.from('users').update({ active_league_id })
```

**`CreateLeagueModal`** — client component at `components/CreateLeagueModal.tsx`. Owns all modal state: `isOpen`, `name`, `access`, `hasPrize`, `prize`, `loading`, `error`. Renders the dashed trigger card when closed, and the modal overlay when open. On successful creation, calls `router.push('/ligas/{newId}')`.

**`POST /api/leagues`** — extended to accept an optional `prize_pool` field. No other endpoints are modified.

**`app/ligas/page.tsx`** — replaces the static JSX block (lines 101–110) with `<CreateLeagueModal />`. No other changes.

---

## Implementation Design

### Core Interfaces

```typescript
// components/CreateLeagueModal.tsx — component props (none required)
// Internal form state shape:
interface CreateLeagueFormState {
  name: string;           // 2–50 chars, required
  access: 'open' | 'private';  // default: 'private'
  hasPrize: boolean;
  prize: string;          // max 300 chars, only stored when hasPrize=true
}

// Request body sent to POST /api/leagues
interface CreateLeagueBody {
  name: string;
  access_type: 'open' | 'private';
  prize_pool?: string | null;   // new field, omitted or null when hasPrize=false
}

// POST /api/leagues success response (unchanged shape, existing LeagueSummary + role)
interface CreateLeagueResponse {
  status: 'success';
  data: {
    id: string;
    name: string;
    access_type: 'open' | 'private';
    logo_url: string | null;
    role: 'admin';
    member_count: number;
  };
  timestamp: string;
}
```

### Data Models

No new tables or columns are needed. The `leagues` table already has a `prize_pool TEXT` column (added in migration `20260522000002_create_leagues.sql`).

The API route currently does not read or write `prize_pool`. This field must be added to the `INSERT` statement.

**Existing `leagues` table columns relevant to this feature:**

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | generated, PK |
| `name` | TEXT NOT NULL | 2–50 chars validated in API |
| `access_type` | TEXT CHECK ('open','private') | required |
| `prize_pool` | TEXT | **currently not written by API — must be added** |
| `created_by` | UUID FK → users.id | set to auth user |

**No migration required** — `prize_pool` column already exists.

### API Endpoints

#### `POST /api/leagues` — extended

**Request body changes:**

```typescript
// Add to existing validation block (after access_type check):
// prize_pool: optional string, max 300 chars
```

| Field | Type | Validation | Change |
|-------|------|-----------|--------|
| `name` | string | required, 2–50 chars | unchanged |
| `access_type` | `'open'`\|`'private'` | required | unchanged |
| `prize_pool` | string \| null | optional, max 300 chars | **new** |

**Supabase insert change** — add `prize_pool` to the insert object:

```typescript
// app/api/leagues/route.ts — inside POST handler, supabase insert call
const { data: newLeague, error: insertError } = await supabase
  .from('leagues')
  .insert({
    name: validatedName,
    access_type: validatedAccessType,
    prize_pool: validatedPrizePool ?? null,   // ← add this line
    created_by: user.id,
  })
  .select('id, name, access_type, logo_url, member_count')
  .single();
```

**Response:** unchanged — `201` with existing `LeagueSummary` shape. `prize_pool` is not included in the response (consumer navigates away immediately).

---

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
|-----------|-------------|---------------------|-----------------|
| `components/CreateLeagueModal.tsx` | new | New client component; no existing code affected | Create file |
| `app/ligas/page.tsx` | modified | Replace static JSX block (lines 101–110) with `<CreateLeagueModal />` | Low risk — surgical 10-line swap |
| `app/api/leagues/route.ts` | modified | Add `prize_pool` validation + include in Supabase insert | Low risk — additive change only |
| `tests/unit/ligas-page.test.tsx` | modified | Existing test for `data-testid="create-league-card"` may need updating if the card is now rendered by the client component | Update test to work with client component |

---

## Testing Approach

### Unit Tests

**`CreateLeagueModal` component:**
- Modal is closed by default; clicking the trigger card opens it.
- "Cancelar" button and × close the modal without submitting.
- Clicking the backdrop closes the modal.
- Submitting with an empty name shows an inline validation error and does not call `fetch`.
- Submitting with a name shorter than 2 chars shows a validation error.
- Prize textarea only appears when the checkbox is checked.
- "Criar liga" button is disabled and shows a loading state while `fetch` is in flight.
- On a mocked success response (`201`), `router.push` is called with `/ligas/{id}`.
- On a mocked error response, a toast error is shown and the modal stays open.

**`POST /api/leagues` route:**
- `prize_pool` is accepted and written to the insert (add to existing route tests).
- `prize_pool` exceeding 300 chars returns 400.
- `prize_pool: null` is accepted and written as null.

### Integration Tests

- End-to-end: open modal → fill name → select "Aberta" → check prize → submit → assert navigation to `/ligas/{id}`.
- Confirm `league_members` row is created with `role = 'admin'` for the creator.
- Confirm `users.active_league_id` is updated to the new league id.

---

## Development Sequencing

### Build Order

1. **Extend `POST /api/leagues`** — add `prize_pool` validation and include it in the Supabase insert. No dependencies. Write/update unit test for the route.

2. **Create `components/CreateLeagueModal.tsx`** — depends on step 1 (the component calls the extended endpoint). Implement: trigger card UI, modal overlay, form fields, loading/error states, `router.push` on success.

3. **Wire into `app/ligas/page.tsx`** — depends on step 2. Replace the static card block (lines 101–110) with `<CreateLeagueModal />`. Import the component.

4. **Update existing tests** — depends on step 3. Update `tests/unit/ligas-page.test.tsx` for the new card rendering model.

### Technical Dependencies

- No infrastructure changes required.
- No new npm packages required (`useRouter` is from `next/navigation`; icons from `lucide-react` already installed).
- `prize_pool` column already exists in the database schema — no migration needed.

---

## Monitoring and Observability

- **Log event on creation success**: the API route already logs errors via its catch block; add a structured log on successful insert with `league_id` and `access_type`.
- **Track double-submission prevention**: the disabled button state on the client prevents double calls; no server-side idempotency key is needed for MVP.
- **Error rate**: existing API error logging covers `DATABASE_ERROR` (500) responses.

---

## Technical Considerations

### Known Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `data-testid="create-league-card"` test breaks because the card is now rendered client-side | Medium | Update `tests/unit/ligas-page.test.tsx` to either mock `CreateLeagueModal` or test the card via the client component's own test |
| Double tap on mobile submits twice before loading state kicks in | Low | `isLoading` state is set synchronously before `await fetch(...)` — first render with disabled button prevents second submission |
| `router.push` triggers before server has committed the league insert | Very low | `router.push` is called only inside the `if (res.ok)` branch, after the full `await fetch()` resolves |

---

## Architecture Decision Records

- [ADR-001: Single-Step Centered Modal for League Creation](adrs/adr-001.md) — Chose a single-screen modal over a multi-step wizard or inline card expansion; matches the design mockup and minimizes implementation surface for 3 fields.
- [ADR-002: Self-Contained Client Component for Modal Trigger and State](adrs/adr-002.md) — Introduced `'use client'` boundary in a dedicated `CreateLeagueModal` component to keep the server page's SSR data fetching intact while enabling modal interactivity.
