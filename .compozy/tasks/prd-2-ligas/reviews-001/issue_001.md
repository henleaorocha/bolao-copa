---
provider: manual
pr:
round: 1
round_created_at: 2026-05-22T20:47:00Z
status: pending
file: app/ligas/page.tsx
line: 428
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Incorrect eslint-disable comment hides setState-in-effect warning

## Review Comment

The eslint-disable comment on line 428 attempts to suppress `react-hooks/set-state-in-effect`, but the actual linter error being raised is about "Calling setState synchronously within an effect can trigger cascading renders" — a different rule that is not suppressed by the current comment.

The current code:
```typescript
// eslint-disable-next-line react-hooks/set-state-in-effect
useEffect(() => {
  loadLeagues()
}, [loadLeagues])
```

The `loadLeagues()` function is a useCallback that calls multiple setState functions (`setIsLoading`, `setMyLeagues`, `setDiscoverLeagues`). When called directly in the effect body, this triggers a linter warning about performance implications of setState calls in effects.

**Why this matters**: The incorrect suppress comment masks the real warning, making it unclear whether the pattern is intentional or overlooked. The correct approach is to either:

1. **Recommended**: Move the fetch logic inside the useEffect instead of calling a separate useCallback function:
   ```typescript
   useEffect(() => {
     setIsLoading(true)
     Promise.all([...]) // fetch logic inline
   }, [])
   ```

2. **Alternative**: Fix the eslint-disable comment to match the actual rule being triggered, or explicitly acknowledge the pattern as intentional with a more precise comment explaining why setState-in-effect is acceptable here (e.g., "data fetching on mount is a standard React pattern").

**Affected code context**: Lines 336-431 in ligas/page.tsx

## Triage

- Decision: `UNREVIEWED`
- Notes: Linter verification needed; check what the actual ESLint rule is that's being triggered
