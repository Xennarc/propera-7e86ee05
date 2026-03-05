

## Plan: Server-side filtering for DeptPlannerPage and DeptInboxPage

### Problem
Both pages fetch **all** `activity_sessions` for a resort, then filter client-side by `activity.category === scope`. This over-fetches data unnecessarily.

### Solution
Use PostgREST's `!inner` join syntax to filter at the database level. Changing `activity:activities(...)` to `activity:activities!inner(...)` allows adding `.eq('activity.category', category)` which filters rows server-side, returning only matching sessions.

### Changes

**`src/pages/department/DeptInboxPage.tsx`** (lines ~50-66):
- When `category` is set: use `activity:activities!inner(name, category)` + `.eq('activity.category', category)` in the query
- When `category` is null (unscoped): keep the current non-inner join (return all sessions)
- Remove the post-fetch `.filter()` call

**`src/pages/department/DeptPlannerPage.tsx`** (lines ~117-134):
- Same pattern: when `category` is set, use `!inner` join + `.eq('activity.category', category)`
- When unscoped, use normal join without category filter
- Remove the post-fetch `.filter()` call

Both changes are minimal — modifying the select string and adding one `.eq()` call, then deleting the client-side filter lines.

