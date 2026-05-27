---
name: task_03-football-api-client
description: Execution record for task_03 — lib/football-api.ts implementation
metadata:
  type: project
---

# Task Memory: task_03 — API Football client

## Objective Snapshot

Create `lib/football-api.ts` with `ApiFootballFixture` interface and `fetchWorldCupFixtures()`. Add `API_FOOTBALL_KEY` to `.env.example`. Write unit tests. **COMPLETE.**

## Important Decisions

- URL used: `GET /fixtures?league=1&season=2026` (no `&next=100` from ADR note; no status filter from techspec comment). Task spec is authoritative.
- API Football response envelope: parsed from `json.response` (not `json.data`). Real API returns `{ response: [...] }`.
- Malformed response (non-array): throws `Error` rather than returning empty array — cleaner error propagation for callers.

## Learnings

- Global vitest coverage threshold (80% lines) fails when running a single test file against the full `lib/**` + `app/api/**` coverage scope. Use `--coverage.include="lib/football-api.ts"` to scope verification to just the touched file. 100% coverage confirmed for `lib/football-api.ts`.
- `vi.stubGlobal('fetch', mockFetch)` + `vi.unstubAllGlobals()` in afterEach is the correct pattern for mocking global fetch in vitest node environment.

## Files / Surfaces

- `lib/football-api.ts` — created (new)
- `.env.example` — added `API_FOOTBALL_KEY` entry
- `tests/unit/football-api.test.ts` — created (5 unit tests, 100% coverage)

## Errors / Corrections

None.

## Ready for Next Run

- task_04 (sync endpoint): calls `fetchWorldCupFixtures()` from `lib/football-api.ts`. It receives `ApiFootballFixture[]` and maps to DB rows via `ALL_COPA_TEAMS` flag lookup.
- task_04 is also responsible for calling `revalidateTag('fixtures')` after successful upsert.
