# Task Memory: task_05.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Create `components/LeagueCard.tsx` (Client Component) and `tests/unit/LeagueCard.test.tsx`. Status: **complete**.

## Important Decisions

- Shield color formula: `SHIELD_COLORS[Math.floor(pos / 5) % 6]` where `pos = max(0, firstChar.charCodeAt(0) - 65)`. Groups A-E→0, F-J→1, K-O→2, P-T→3 (T is at pos 19 → floor(19/5)=3 → `#7E4FE3`), U-Y→4, Z→5. This satisfies the task's required assertion that 'T' maps to index 3.
- `getShieldColor` is exported as a named export to allow direct unit testing without DOM rendering.
- Error state: on PATCH failure or network error, shows inline error message and re-enables the button. Does NOT navigate.

## Learnings

- The task spec required 'T' → index 3 → `#7E4FE3`. A simple `charCode % 6` gives 0 for 'T' (charCode 84). The alphabet-group formula (`floor(pos/5) % 6`) is the minimal formula that satisfies this constraint with a reasonable semantic.
- JSDOM converts inline hex colors to RGB in `element.style.backgroundColor`; testing `getShieldColor` directly (as a pure function) avoids this ambiguity.

## Files / Surfaces

- `components/LeagueCard.tsx` — created (new)
- `tests/unit/LeagueCard.test.tsx` — created (new, 20 tests)

## Errors / Corrections

None.

## Ready for Next Run

- task_05 is done. task_06 (Leagues Hub Page Rewrite) imports `<LeagueCard>` — it should import as default from `@/components/LeagueCard`. The `LeagueCardProps` interface and `getShieldColor` function are also named exports available for testing.
