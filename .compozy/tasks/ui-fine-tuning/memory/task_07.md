# Task Memory: task_07.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Add `activePhase: KnockoutPhase` to `BracketResponse`, computed purely in
  `buildBracketResponse`; Mata-mata page seeds `selectedPhase` from it once. DONE.

## Important Decisions
- Implementation matches ADR-004 exactly: `phases.find(p => p.slots.some(s => s.state !== 'finished'))?.phase ?? PHASE_ORDER[last]`. Page guards the seed with a `useRef(false)` (`phaseSeededRef`) inside the fetch `.then`, NOT effect-body state — so it never overrides user tab navigation on re-render and is not flagged by `react-hooks/set-state-in-effect`.
- The bracket route needs NO change: it already returns the full `buildBracketResponse` payload, so `activePhase` rides along.

## Learnings
- Pre-existing lint error `react-hooks/set-state-in-effect` at `mata-mata/page.tsx:50` (`setLoading(true)`) is on UNCHANGED code — confirmed identical on HEAD via stash. Not introduced by this task; part of the ~362-error baseline.
- Coverage of touched source (lib/bracket.ts + page.tsx) = 92.61% stmts / 82.29% branch — above the 80% target.

## Files / Surfaces
- `lib/bracket.ts` — `activePhase` on `BracketResponse` interface (~L36-43) + computed (~L182-189).
- `app/ligas/[id]/mata-mata/page.tsx` — `phaseSeededRef` + seed block in fetch `.then`.
- `tests/unit/bracket-helper.test.ts` — `activePhase` describe block (4 lifecycle cases + newlyUnlockedPhase regression guard).
- `tests/unit/league-bracket-api.test.ts` — asserts GET response includes non-null `activePhase`.
- `tests/unit/mata-mata.test.tsx` — lands on activePhase on first load + does-not-override user tab on re-render.

## Errors / Corrections
- None. Implementation + tests were already present in the working tree from a prior interrupted run; this run verified and finalized tracking.

## Ready for Next Run
- task_07 complete and verified. Last task in this PRD (no dependents). Diff left uncommitted (--auto-commit=false).
