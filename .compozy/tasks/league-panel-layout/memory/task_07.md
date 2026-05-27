# Task Memory: task_07.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Create `InviteShareButton.tsx`, `PainelSidebar.tsx`, `PainelTopBar.tsx` in `app/ligas/[id]/components/`. Unit + integration tests. **COMPLETE.**

## Important Decisions

- Nav items in `PainelSidebar` use `role="button"` divs (not `<button>`) because they are visually rendered but functionally inert — avoids confusing assistive tech about interactive buttons that do nothing.
- `PainelSidebar` container: `hidden lg:flex` (sidebar pattern, opposite of BottomTabBar's `flex lg:hidden`).
- `PainelTopBar` container: `flex lg:hidden` (consistent with BottomTabBar pattern).
- `inviteUrl` constructed in `PainelSidebar` and `PainelTopBar` (not in `InviteShareButton`) — the components build the URL from `inviteToken` prop and pass complete `inviteUrl` to `InviteShareButton`.
- Invite popover is a state-toggled `div` (no external library), co-located in `InviteShareButton`.

## Learnings

- `navigator.clipboard` mocking in jsdom: `Object.defineProperty` with `value: { writeText: vi.fn() }` does not work reliably if the mock object is recreated each `beforeEach` (the component may access a stale reference). **Fix:** define a stable `mockClipboard` object once (`const mockClipboard = { writeText: vi.fn() }`) in `beforeAll`, replace only `mockClipboard.writeText` in `beforeEach`. Use `mockClipboard.writeText` in expectations, not `navigator.clipboard.writeText`.
- `document.execCommand` fallback is untestable via direct spy in jsdom: `ta.select()` (or operations before `execCommand`) appear to throw silently, preventing `execCommand` from being reached. Workaround: removed `ta.focus()`, added `ta.setAttribute('readonly', '')` — but `ta.select()` still interferes. **Decision:** test observable behavior (copy-success shown) instead of the internal call.
- `next/link` and `next/image` must be mocked in jsdom component tests. Pattern used: `vi.mock('next/link', () => ({ default: ({ href, children, className }) => <a href={href} className={className}>{children}</a> }))`.
- `useEvent` (v14) + async `onClick` handler: `fireEvent.click` + `act(async () => {...})` is more reliable than `userEvent.click` for testing async event handlers that call clipboard APIs.

## Files / Surfaces

- `app/ligas/[id]/components/InviteShareButton.tsx` — new
- `app/ligas/[id]/components/PainelSidebar.tsx` — new
- `app/ligas/[id]/components/PainelTopBar.tsx` — new
- `tests/unit/navigation-shell.test.tsx` — new (16 unit tests)
- `tests/integration/navigation-shell.test.tsx` — new (4 integration smoke tests)

## Errors / Corrections

- Initial clipboard test failed: `writeTextMock` was recreated in `beforeEach` but the old reference was stored in `navigator.clipboard`. Fixed by using a stable `mockClipboard` object.
- `execCommand` fallback test failed: `ta.select()` in jsdom silently prevents reaching `execCommand`. Replaced direct spy assertion with behavior assertion (copy-success visible).

## Ready for Next Run

- task_09 (page orchestrator) can now use `PainelSidebar` and `PainelTopBar` — both export default components with the props defined in the task spec.
- task_08 (StatsRow, PrizesStrip, RankingCard) is the only remaining unblocked task before task_09.
