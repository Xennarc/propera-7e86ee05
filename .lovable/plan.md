

# Fix: Remove Non-Existent `cuisine_type` Column Reference

## Problem Summary

When navigating to a guest detail page (or any staff page within a resort context), the application triggers a prefetch query that references `restaurants.cuisine_type` — a column that does not exist in the database schema. This causes the error:

```
column restaurants.cuisine_type does not exist
```

The error is blocking or interfering with proper page rendering, which is why tapping on a guest in the list results in an error.

## Root Cause

The file `src/hooks/usePrefetch.ts` at line 37 contains:

```typescript
.select('id, name, cuisine_type, is_active, opening_time, closing_time')
```

The `cuisine_type` column was removed from the `restaurants` table (or never existed), but this code was not updated.

## Solution

Remove `cuisine_type` from the `.select()` call in `usePrefetch.ts`.

## Changes Required

| File | Change |
|------|--------|
| `src/hooks/usePrefetch.ts` | Remove `cuisine_type` from the restaurants prefetch query |

## Technical Details

### Before (line 37)
```typescript
.select('id, name, cuisine_type, is_active, opening_time, closing_time')
```

### After
```typescript
.select('id, name, is_active, opening_time, closing_time')
```

## Impact

- **Fixes**: Guest list navigation, Guest detail page loading, and any other page that triggers the prefetch hook
- **No breaking changes**: The `cuisine_type` field was not being used anywhere since it doesn't exist
- **No schema changes required**: This is purely a frontend code fix

## Testing

After the fix:
1. Navigate to the Guests page
2. Click on any guest in the list
3. Verify the Guest Detail page loads without errors

