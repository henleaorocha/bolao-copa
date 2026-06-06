# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State
- task_01 was marked "completed" but its artifacts were MISSING from the codebase (no
  `TOTAL_MATCH_COUNT`, no `LeagueDetail.matches_played`). task_04 re-created BOTH per
  TechSpec: `TOTAL_MATCH_COUNT = GROUP_STAGE_MATCH_COUNT + 32 = 104` (`lib/copa-teams.ts`)
  + `LeagueDetail.matches_played: number` (`lib/api/types.ts`), now POPULATED by the
  league-detail handler. Treat task_01 deliverables as present (via task_04).
- task_04 done: `matches_played` (tournament-wide finished count, non-null both scores)
  returned by GET /api/leagues/[id]; per-user `guesses_made`/`guesses_total` REMOVED from
  the handler, `UserStats`, `StatsRow`, and all fixtures. 3rd StatsRow card is now
  "JOGOS JÁ REALIZADOS" → `matches_played/104`, subtitle "fase de grupos + mata-mata".
- task_02 done: shared `components/match/` layer — `matchStatus.ts` (`MatchStatus` + `groupMatchStatus`/`slotMatchStatus`), `StatusBadge`, `TeamRow`, `ScoreInputs`, `FinalResult`. NOT wired into screens (task_05/06). `StatusBadge` exposes a `testId` override so Palpites can keep `badge-aberto/palpitado/fechado`; defaults match Mata-mata's `badge-*` ids. See task_02 memory for the per-screen composition contract.
- task_05 done: Palpites `MatchRow` now composes the shared pieces + a `finished`/`ENCERRADO`
  branch rendering `FinalResult` (predicted-vs-actual); inputs disabled when not open.
  Gotcha — `MatchRow` renders BOTH a mobile + desktop layout into the DOM, so shared pieces
  with FIXED test ids collide under jsdom `getByTestId`. Fixes used: (a) badge testIds are
  `badge-*` on mobile, `badge-*-lg` on desktop; (b) `ScoreInputs` gained an optional
  `testIdSuffix` (default '') — desktop passes `-lg`; (c) `FinalResult` (no override prop)
  is rendered ONCE at card level outside both wrappers. task_06's MatchCard is single-layout,
  so it can use default test ids without this dance.
- task_06 done: knockout `MatchCard` recomposed onto the shared pieces (StatusBadge/TeamRow/
  ScoreInputs/FinalResult) + `ABERTO`/`✓ PALPITADO` split via `slotMatchStatus(slot.state, slot.prediction!==null)`.
  Single-layout, so it uses DEFAULT badge test ids — the new `predicted` state is `badge-predicted`
  (no override). Inputs render only for `open` slots (predicted = open+prediction, still editable/
  pre-filled); locked/finished render no inputs. Multiplier badge, kickoff, placeholder slots,
  and the `locked-prediction` read-only block preserved. All five shared pieces are now wired into
  both screens (Palpites task_05 + Mata-mata task_06).
- task_07 done: `buildBracketResponse` now also returns `activePhase: KnockoutPhase` (pure):
  first phase in `PHASE_ORDER` with any slot `state !== 'finished'`, else fallback `final`;
  always non-null. `newlyUnlockedPhase` untouched & independent. Mata-mata page seeds
  `selectedPhase` from `activePhase` ONCE via a `useRef(false)` guard inside the fetch `.then`
  (never overrides user tab nav). Bracket route unchanged (payload rides along). Final task
  of this PRD.

## Shared Decisions

## Shared Learnings
- Repo baseline is NOT green: ~51 pre-existing test failures (11 files) + ~362 eslint `no-explicit-any` errors, unrelated to this PRD. Verify deltas against this baseline, not absolute zero.
- `LeagueDetail` is constructed as a literal in 4+ test fixtures: `tests/unit/api-responses.test.ts` (3), `tests/integration/league-detail-page.test.tsx`, `tests/unit/ranking-page.test.tsx`. Any required field add/remove on `LeagueDetail`/`UserStats` (e.g. task_04 dropping `guesses_made`/`guesses_total`) must update all of them or tsc fails.

## Open Risks

## Handoffs
- task_04 DONE (see Current State). No open handoff.
- Note for any task touching `UserStats`/`LeagueDetail` literals: the fixture list in
  "Shared Learnings" is now all updated to drop guesses + add `matches_played`.
