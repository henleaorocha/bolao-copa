# Task Memory: task_05.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Create `app/ligas/[id]/components/ChampionBanner.tsx` — deadline countdown banner with CTA that opens `PreCopaBetModal`. Must return `null` when past `BET_DEADLINE`. Write unit + integration tests.

## Important Decisions

- Deadline guard uses `Date.now() >= BET_DEADLINE.getTime()` (not `getDaysUntilCopa().isUnderway`) — `BET_DEADLINE` (21:00 UTC Jun 11) ≠ `COPA_START` (00:00 UTC Jun 11), so they are different gates.
- Countdown computes days + hours directly from `BET_DEADLINE` (not from `getDaysUntilCopa()` which only returns `days` and is based on `COPA_START`).
- Modal state (`showModal`) lives inside `ChampionBanner` via `useState`; parent is notified only via `onBetComplete` callback after success.
- `PreCopaBetModal` is conditionally rendered (`{showModal && <PreCopaBetModal ... />}`), not mounted-then-hidden.

## Learnings

- `vi.spyOn(Date, 'now')` works for the past-deadline test since countdown uses `Date.now()` internally.
- Unit tests for "past deadline" mock `Date.now()` with `vi.spyOn`; restore with `vi.restoreAllMocks()` in `afterEach`.
- Integration tests for banner state can be jsdom renders (no live server needed) — same pattern as `tests/integration/static-panel-components.test.tsx`.

## Files / Surfaces

- `app/ligas/[id]/components/ChampionBanner.tsx` — new
- `tests/unit/ChampionBanner.test.tsx` — new
- `tests/integration/champion-banner.test.tsx` — new

## Errors / Corrections

(none)

## Status

COMPLETE. All 12 tests pass (9 unit + 3 integration). tsc clean. All requirements verified line-by-line.
