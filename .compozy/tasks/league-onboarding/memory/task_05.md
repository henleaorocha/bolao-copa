# Task Memory: task_05.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Build `components/LeagueWelcomeModal.tsx` — a 4-screen wizard modal. Also create `tests/unit/LeagueWelcomeModal.test.tsx` with 14 tests covering all spec-required cases.

## Important Decisions

- Used `Share` (not `Share2`) from lucide-react for Screen 4 icon, per task spec.
- Gradient: `linear-gradient(135deg, #0097A9 0%, #4CAF82 100%)` — no exact screenshot verification possible, used task-spec hint.
- `useEffect` dependency array uses `[leagueId]` (not `[]`) to satisfy ESLint and still fire once (leagueId is stable).
- Backdrop uses `data-testid="welcome-modal-backdrop"` with no onClick → non-dismissible.
- WhatsApp share implemented as `<a data-testid="whatsapp-link" href={waHref}>` rather than `window.open` — enables href assertion in tests.

## Learnings

- **Critical jsdom/user-event clipboard issue**: `userEvent.setup()` installs its own `Clipboard [EventTarget]` stub on `navigator.clipboard`, overwriting any `Object.defineProperty` set before it. Solution: call `userEvent.setup()` FIRST, then set `Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: mockFn } })` AFTER — so the per-test mock wins.
- `vi.spyOn(navigator.clipboard, 'writeText')` fails in jsdom because `navigator.clipboard` is initially undefined (jsdom does not define it by default; user-event sets it up).
- `vi.stubGlobal('navigator', ...)` in `beforeEach` does NOT reliably replace jsdom's navigator before user-event setup. Must be done inline in each test that needs it, or use Object.defineProperty AFTER userEvent.setup().
- `vi.restoreAllMocks()` does NOT clean up `Object.defineProperty` changes — `navigator.clipboard` persists between tests. A baseline clipboard mock in `beforeEach` prevents TypeError in tests that don't set up their own.

## Files / Surfaces

- `components/LeagueWelcomeModal.tsx` — created (new file, 247 lines)
- `tests/unit/LeagueWelcomeModal.test.tsx` — created (new file, 14 tests)
- No existing files modified.

## Errors / Corrections

1. Initial clipboard test strategy: `vi.stubGlobal('navigator', { clipboard: { writeText: mockFn } })` in beforeEach — failed because user-event's clipboard stub overwrote it.
2. `Object.defineProperty(navigator, 'clipboard', ...)` in beforeEach — correct concept but overwritten by userEvent.setup() called inside each test.
3. `vi.spyOn(navigator.clipboard, 'writeText')` — fails because `navigator.clipboard` is undefined before user-event.
4. Fix: set `Object.defineProperty` AFTER `userEvent.setup()` inside the test that needs it.

## Ready for Next Run

Task complete. task_06 can now import and use `<LeagueWelcomeModal>` from `components/LeagueWelcomeModal.tsx`.
Props required: `leagueId`, `leagueName`, `inviteToken`, `role`, `onComplete`.
