# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State

- Task 01 (Copa Countdown Utility): completed — `lib/leagues/get-days-until-copa.ts` exports `CopaCountdown` interface and `getDaysUntilCopa()`.
- Task 02 (LeagueHubItem Type): completed — `lib/api/types.ts` exports `CopaCountdown` (re-export), `LeagueHubItem`, `LeagueHubResponse`.
- Task 06 (Leagues Hub Page Rewrite): completed — `app/ligas/page.tsx` is a full async Server Component; old `tests/integration/ligas.test.tsx` deleted and replaced by `tests/unit/ligas-page.test.tsx` + `tests/integration/ligas-page.test.tsx`.
- Task 07 (Auth Callback Redirect): completed — `app/auth/callback-redirect/page.tsx` line 19 fallback changed from `/dashboard` to `/ligas`; tests in `tests/unit/callback-redirect.test.tsx`.

## Shared Decisions

- `CopaCountdown` lives in `lib/leagues/get-days-until-copa.ts` (task_01 output) and is re-exported from `lib/api/types.ts` for API consumers. Do not duplicate the definition.
- `LeagueHubItem` is defined in `lib/api/types.ts` as the single source of truth — downstream tasks (03–06) import from there.

## Shared Learnings

- In TypeScript, `export type { X } from '...'` alone does not make `X` usable as a local type within the same file. To both re-export and use locally, use `import type { X }` + `export type { X }` as two separate statements.
- Vitest mock variables used inside `vi.mock()` factories must be declared with `vi.hoisted(() => vi.fn())` — plain `const mockFn = vi.fn()` before `vi.mock()` is NOT safe because `vi.mock()` is hoisted above variable declarations.
- Async Server Components (Next.js) can be unit-tested in Vitest + jsdom by calling the page function directly (`const ui = await PageComponent()`), then rendering the returned JSX with RTL `render(ui)`. All server-side deps (`getSupabaseServerClient`, `redirect`, data-layer functions) must be mocked.
- Client Components with browser APIs (sessionStorage, useRouter) must be tested in `tests/unit/` with `@vitest-environment jsdom`. Do NOT add them to `tests/integration/auth.test.ts` — that file is HTTP-level and requires a live Supabase server. Use `vi.hoisted(() => vi.fn())` for mocks and `act(async () => { render(...) })` to flush effects.

## Shared Artifacts

- `lib/leagues/get-leagues-hub.ts` exports `getLeaguesHub(supabase, userId)` — call this from task_04 (API route) and task_06 (page). Takes a pre-initialized `SupabaseClient`, NOT `getSupabaseServerClient()` internally.
- Test Bolão UUID in Supabase: `00000000-0000-0000-0000-000000000001`; `MAIN_LEAGUE_ID` is now set in `.env.local`.
- Sort order: group 1 = is_main, group 2 = all member leagues (including public ones, `joined_at DESC`), group 3 = public non-member `member_count DESC`. Public member leagues go in group 2, not 3.

## Open Risks

## Handoffs
