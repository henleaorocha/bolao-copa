# Task Memory: task_08.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

COMPLETE. Created `UpcomingMatchesCard.tsx`, wired into `page.tsx`, deleted `UpcomingGamesStub.tsx`, updated 6 test files, wrote 12 unit tests. All task-specific tests pass; `tsc --noEmit` clean.

## Important Decisions

- Style follows `YourBetCard.tsx` pattern: `rounded-[28px] bg-white border border-slate-100 shadow-sm p-6 h-full`.
- `is_deadline_passed` from the API response drives ABERTO/FECHADO — no client-side recompute.
- AbortController used in useEffect cleanup.
- Date formatting: `toLocaleDateString('pt-BR')` + `toLocaleTimeString('pt-BR')` = browser local timezone.
- vitest coverage config only includes `lib/**` and `app/api/**` — frontend component tests don't gate the global coverage threshold.

## Learnings

- 6 existing test files mocked or imported `UpcomingGamesStub` — all updated to reference `UpcomingMatchesCard`.
- 2 pre-existing failures remain in the suite (unrelated): `ScoringSchemeCard` footer text, `PainelTopBar` flex class. Confirmed via `git stash` baseline run.

## Files / Surfaces

New:
- `app/ligas/[id]/components/UpcomingMatchesCard.tsx`
- `tests/unit/UpcomingMatchesCard.test.tsx` (12 tests, all pass)

Modified:
- `app/ligas/[id]/page.tsx` (import + JSX + comment updated)
- `tests/unit/league-detail.test.tsx`
- `tests/integration/league-detail-page.test.tsx`
- `tests/unit/league-page-bet-modal.test.tsx`
- `tests/unit/league-page-bet-modal-deadline.test.tsx`
- `tests/integration/static-panel-components.test.tsx`
- `tests/unit/static-panel-components.test.tsx`

Deleted:
- `app/ligas/[id]/components/UpcomingGamesStub.tsx`

## Errors / Corrections

None.

## Ready for Next Run

task_09 (Palpites list page) and task_10 (Bet detail screen) are pending.
