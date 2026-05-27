# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State

All 6 tasks are complete. `lib/standings.ts`, `GroupChips.tsx`, `StandingsRow.tsx`, `GroupCard.tsx`,
`StandingsGrid.tsx`, `app/ligas/[id]/tabela/page.tsx`, nav activation in `PainelSidebar.tsx`
and `BottomTabBar.tsx`, and the pg_cron migration `20260526000021_schedule_hourly_sync.sql` are ready.

## Shared Decisions

- **Global coverage threshold caveat:** `vitest.config.ts` sets a global 80% line threshold over `lib/**` + `app/api/**`. Running a single test file fails the threshold because many pre-existing route files have 0% coverage. Verify module-level coverage from the per-file row in the report, not the global summary.
- **Two-pass roster design:** `computeStandings` builds each group's team roster in a first pass (all group-phase matches), then aggregates in a second pass (only `finished` matches). This ensures scheduled-only groups still list all teams at 0.

## Shared Learnings

- `tsc --noEmit` is the TypeScript gate; run it alongside vitest for a complete backend task verification.
- Pre-existing test failures (13 files, unrelated to tabela-copa) exist in the suite — these are not regressions from this work.

## Open Risks

- None. All tabela-copa tasks complete.

## Handoffs

- Task 04 complete: `app/ligas/[id]/tabela/page.tsx` exists at the route `/ligas/[id]/tabela`.
- Task 05 complete: "Tabela" nav activated in both `PainelSidebar.tsx` (line 31) and `BottomTabBar.tsx` (line 17). Tests in `tests/integration/tabela-nav.test.tsx`.
- **BottomTabBar test pattern:** `BottomTabBar` passes `role="tab"` explicitly to each `Link`, so the rendered element has `role="tab"` (not the implicit link role). Use `getByRole('tab', ...)` in tests, not `getByRole('link', ...)`. The `aria-selected` prop type on mock `<a>` must be `boolean`, not `string | boolean`.
- Task 06 complete: `supabase/migrations/20260526000021_schedule_hourly_sync.sql` enables `pg_cron`/`pg_net`, registers job `sync-matches-hourly` at `0 * * * *`. Two SECURITY DEFINER helpers (`public.admin_get_cron_job`, `public.admin_get_installed_extensions`) expose cron/extension state for admin tooling and tests (PostgREST cannot reach `cron` or `pg_catalog` schemas directly). Tests in `tests/integration/sync-cron.test.ts`.
- Anchor contract `grupo-a` … `grupo-l` (lowercase) is live in `GroupCard` and consumed by `GroupChips`. Do not rename.
- `GroupChips` uses `lg:hidden`; components that wrap it must not apply conflicting visibility overrides.
- `StandingsRow` and `GroupCard` are **named exports**; `StandingsGrid` is the **default export**.
- In tests, mock `redirect` from `next/navigation` to throw `Error('NEXT_REDIRECT')` to stop execution at guard points.
- GP/GC columns use `hidden sm:inline-block`; SG column has no `hidden` class — assert class names directly in jsdom.
