# Task Memory: task_01.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Create `lib/bracket-skeleton.ts`: 32 immutable slot definitions (KnockoutPhase, PHASE_ORDER, BracketSlot interface, BRACKET_SKELETON array, resolveSlot lookup, isConfirmedMatchup predicate). No DB changes.

## Important Decisions

- **Calendar keys use my best knowledge of official FIFA 2026 knockout schedule** (dates June 28–July 19 UTC). These will degrade gracefully if API-Football returns different dates/venues (slots just stay placeholder per ADR-004). The skeleton is meant to be maintained against the official schedule.
- **R32 labels**: "Vencedor 1º Grupo A" / "Vencedor 2º Grupo B" for winners/runners-up; "3º Grupos X/Y/Z/W" for 8 best 3rd-place slots.
- **Later round labels**: "Vencedor 1/32 #N", "Vencedor 1/16 #N", "Vencedor 1/8 #N" for R16/QF/SF.
- **3rd place labels**: "Perdedor SF #1" / "Perdedor SF #2" (SF losers).
- **Final labels**: "Vencedor SF #1" / "Vencedor SF #2" (SF winners).
- **feeds field** only points to where the WINNER goes (Final, not 3rd place). SF losers go to 3rd place but this is not captured in feeds (interface only allows one target).
- **16 official 2026 venues used**: MetLife, AT&T, SoFi, Levi's, Gillette, Lincoln Financial Field, Arrowhead, Mercedes-Benz, NRG, Rose Bowl, Hard Rock, BC Place, BMO Field, Estadio Azteca, Estadio Akron, Estadio BBVA.

## Learnings

- `lib/copa-teams.ts` already exports `VALID_TEAM_NAMES` (a Set) — use directly for `isConfirmedMatchup`.
- The sync stores `venue: f.fixture.venue.name` — calendar key venue strings must match API-Football's venue name format exactly (can drift; degrades gracefully).
- Test file goes in `tests/unit/bracket-skeleton.test.ts` (mirrors copa-teams pattern).

## Files / Surfaces

- `lib/bracket-skeleton.ts` — new file (being authored)
- `tests/unit/bracket-skeleton.test.ts` — new test file

## Errors / Corrections

(none yet)

## Ready for Next Run

- task_02 (bracket endpoint) needs: BRACKET_SKELETON, resolveSlot, isConfirmedMatchup from this file.
- task_05 (predictions guard) needs: isConfirmedMatchup from this file.
