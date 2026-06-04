# Task Memory: task_01.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
Reconcile `lib/copa-teams.ts` to seed 020's real 48 nations: drop Itália/Camarões/Dinamarca/Honduras/Jamaica/Bolívia; add Irã/Iraque/Suécia/Turquia/Bósnia e Herzegovina/Rep. Democrática do Congo. Drives VALID_TEAM_NAMES, flags (resolveFlag), champion picker.

## Important Decisions
- RD Congo uses seed-020 authoritative name `Rep. Democrática do Congo` (code `cd`), NOT the task's shorthand "RD Congo". `isConfirmedMatchup` = `VALID_TEAM_NAMES.has(home) && .has(away)`, and group-stage rows come from seed 020, so the names must match seed 020 verbatim. ADR-003 + "authoritative names from seed 020" govern over the shorthand label.
- Kept FEATURED_TEAMS at 12 by promoting Croácia into Itália's removed slot (existing test asserts 12). The 6 new qualifiers go in the long tail.
- Flag codes taken from seed 020: ba, tr, se, ir, iq, cd (all unique vs existing).

## Learnings
- Roster now equals seed 020 exactly (48 teams, same PT names + flag codes; verified by a node diff against the migration — 0 mismatches). openfootball-wc2026-teams.json also has 48.
- `isConfirmedMatchup(home, away)` is just `VALID_TEAM_NAMES.has(home) && .has(away)` (lib/bracket-skeleton.ts), so roster names must equal seeded match-row names verbatim.
- Repo full suite has ~45 PRE-EXISTING failures (UI tests: `useLeaguePanel must be used within LeaguePanelProvider`) unrelated to the roster — proven by stashing this diff. Don't be alarmed by them in later tasks.
- copa-teams.ts coverage = 100%.

## Files / Surfaces
- `lib/copa-teams.ts` (roster, VALID_TEAM_NAMES)
- `tests/unit/copa-teams.test.ts`
- consumers: `resolveFlag` in `app/api/admin/sync-matches/route.ts`; `isConfirmedMatchup` in `lib/bracket-skeleton.ts`

## Errors / Corrections

## Ready for Next Run
