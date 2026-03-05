

## Root Cause: React Hooks Ordering Violation in StaffShell

The React Error #300 is caused by a **hooks ordering violation** in `StaffShell.tsx`.

### The Bug

In `src/components/staff/StaffShell.tsx`, the `useDepartmentRedirect()` hook is called on **line 116**, which is **after** multiple conditional early returns (lines 72-113). React requires hooks to be called in the same order on every render.

When the user switches tabs and returns:
1. The auth token refreshes, briefly setting `userDataLoading = true`
2. `StaffShell` hits the early return on line 89 — **before** `useDepartmentRedirect()` runs
3. When loading finishes, the component renders fully, calling `useDepartmentRedirect()` again
4. React detects a different number of hooks between renders, corrupting internal state
5. In minified production React 19, this manifests as Error #300

### Fix Plan (2 changes)

**1. Move `useDepartmentRedirect()` before conditional returns** (`StaffShell.tsx`)
- Move `const deptRedirect = useDepartmentRedirect();` to line ~46, alongside the other hooks
- The hook already handles loading states internally, so calling it early is safe

**2. Add React deduplication to Vite config** (`vite.config.ts`)
- Add `resolve.dedupe: ['react', 'react-dom', 'react/jsx-runtime']` to prevent any duplicate React instances from libraries, which is a secondary cause of Error #300

Both changes are zero-risk — no feature logic changes, just correctness fixes.

