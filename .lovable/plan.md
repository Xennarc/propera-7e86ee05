
# Definitive Fix: special_occasions.map / dietary_preferences.map Crashes

## Problem Summary

The `GuestDetailPage` crashes with `TypeError: c.special_occasions.map is not a function` for some guests because the database stores `dietary_preferences` and `special_occasions` as JSONB. In some records, these fields contain **strings** (e.g., `"Honeymoon"`) instead of **arrays** (e.g., `["Honeymoon"]`), causing `.map()`, `.join()`, and `.length` calls to fail.

## Root Cause Analysis

| Layer | Issue |
|-------|-------|
| **Database** | Some legacy records have these fields stored as strings or malformed JSON |
| **Data Hooks** | `useStaffPrearrivalData.ts` passes raw data without normalization |
| **UI Components** | Multiple files use `.length`/`.map()` without `Array.isArray()` guards |

### Files with Remaining Unsafe Code

| File | Lines | Unsafe Code |
|------|-------|-------------|
| `useStaffPrearrivalData.ts` | 126, 130 | `data.dietary_preferences || null` — passes through without array validation |
| `useStaffPrearrivalData.ts` | 194, 196 | `profile.dietary_preferences.length` in `hasPartialData()` helper |
| `PrearrivalProfileCard.tsx` | 492, 494, 496 | `profile.special_occasions.length` and `.map()` without Array check |
| `GuestPrearrivalHome.tsx` | 78, 81 | `profile.dietary_preferences.length` and `profile.special_occasions.length` |
| `PrearrivalChecklist.tsx` | 77 | `profile.special_occasions.join()` (relies on `hasOccasions` guard, but fragile) |

---

## Solution: Defense in Depth

### Part 1: Create a Shared Array Coercion Utility

Create a new utility in `src/lib/safe-array.ts` that safely coerces any value into an array:

```text
┌─────────────────────────────────────────────────────────┐
│  toStringArray(value: unknown): string[]                │
├─────────────────────────────────────────────────────────┤
│  Input           │  Output                              │
│  ─────────────── │  ──────────────────────────────────  │
│  null/undefined  │  []                                  │
│  "Honeymoon"     │  ["Honeymoon"]                       │
│  ["A", "B"]      │  ["A", "B"]                          │
│  [1, "A", null]  │  ["A"] (filters non-strings)         │
└─────────────────────────────────────────────────────────┘
```

```typescript
/**
 * Safely coerce a value to a string array.
 * Handles: null, undefined, strings (wrap as single-item array), and actual arrays.
 */
export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }
  return [];
}
```

### Part 2: Normalize Data at the Hook Level

**File: `src/hooks/useStaffPrearrivalData.ts`**

1. Import the utility at the top of the file
2. Change interface types from `string[] | null` to `string[]` (always arrays)
3. Normalize at lines 126 and 130:
   - `dietary_preferences: toStringArray(data.dietary_preferences)`
   - `special_occasions: toStringArray(data.special_occasions)`
4. Simplify `hasPartialData()` helper (lines 194-196) since fields are now guaranteed arrays

**File: `src/hooks/usePrearrivalData.ts`** (guest-facing)

Similarly normalize the profile data after fetching from the RPC to guarantee arrays for downstream components.

### Part 3: Add Safety Guards to UI Components (Belt & Suspenders)

Even with normalized hooks, add `Array.isArray()` guards as a safety net:

**File: `src/components/prearrival/PrearrivalProfileCard.tsx`**

Lines 492-496 — Update to:
```typescript
{(Array.isArray(profile.special_occasions) && profile.special_occasions.length > 0) || profile.special_requests ? (
  <div className="space-y-2">
    {Array.isArray(profile.special_occasions) && profile.special_occasions.length > 0 && (
      <div className="flex flex-wrap gap-1.5">
        {profile.special_occasions.map((occ: string) => (
```

**File: `src/pages/guest/GuestPrearrivalHome.tsx`**

Lines 78, 81 — Update to:
```typescript
(Array.isArray(profile.dietary_preferences) && profile.dietary_preferences.length > 0) ||
...
(Array.isArray(profile.special_occasions) && profile.special_occasions.length > 0) ||
```

**File: `src/components/guest/prearrival/PrearrivalChecklist.tsx`**

Line 77 — Update to use safe coercion:
```typescript
description: hasOccasions
  ? (Array.isArray(profile?.special_occasions) ? profile.special_occasions : []).join(', ')
  : 'Honeymoon, anniversary, birthday...',
```

### Part 4: Clean Existing Malformed Data in the Database

Run UPDATE queries to convert any string values to proper JSON arrays:

```sql
-- Fix dietary_preferences stored as strings in prearrival_profiles
UPDATE prearrival_profiles
SET dietary_preferences = jsonb_build_array(dietary_preferences::text)
WHERE dietary_preferences IS NOT NULL 
  AND jsonb_typeof(dietary_preferences) = 'string';

-- Fix special_occasions stored as strings in prearrival_profiles
UPDATE prearrival_profiles
SET special_occasions = jsonb_build_array(special_occasions::text)
WHERE special_occasions IS NOT NULL 
  AND jsonb_typeof(special_occasions) = 'string';

-- Fix dietary_preferences in pre_arrival_submissions payload
UPDATE pre_arrival_submissions
SET payload = jsonb_set(
  payload, 
  '{dietary_preferences}', 
  jsonb_build_array((payload->>'dietary_preferences'))
)
WHERE payload->>'dietary_preferences' IS NOT NULL
  AND jsonb_typeof(payload->'dietary_preferences') = 'string';

-- Fix special_occasions in pre_arrival_submissions payload
UPDATE pre_arrival_submissions
SET payload = jsonb_set(
  payload, 
  '{special_occasions}', 
  jsonb_build_array((payload->>'special_occasions'))
)
WHERE payload->>'special_occasions' IS NOT NULL
  AND jsonb_typeof(payload->'special_occasions') = 'string';
```

---

## Files to Create/Modify

| File | Action | Changes |
|------|--------|---------|
| `src/lib/safe-array.ts` | **Create** | Add `toStringArray()` utility function |
| `src/hooks/useStaffPrearrivalData.ts` | Modify | Import utility, update types, normalize lines 126 + 130 |
| `src/hooks/usePrearrivalData.ts` | Modify | Normalize array fields after RPC fetch |
| `src/components/prearrival/PrearrivalProfileCard.tsx` | Modify | Add `Array.isArray()` guards at lines 492-496 |
| `src/pages/guest/GuestPrearrivalHome.tsx` | Modify | Add `Array.isArray()` guards at lines 78, 81 |
| `src/components/guest/prearrival/PrearrivalChecklist.tsx` | Modify | Safe `.join()` at line 77 |
| **Database** | Data cleanup | Run UPDATE queries to fix malformed JSONB |

---

## Why This Fixes It "For Good"

1. **Centralized normalization** — Hooks guarantee downstream components always receive `string[]`
2. **Defensive UI guards** — Components won't crash even if data bypasses hooks
3. **Clean database** — Existing malformed data is converted to proper arrays
4. **Type consistency** — The `toStringArray()` utility handles all edge cases (null, undefined, string, array)

---

## Testing After Implementation

1. Navigate to GuestDetailPage for previously-crashing guests
2. Verify no ErrorBoundary crash occurs
3. Confirm special occasions and dietary preferences render correctly
4. Check that the database UPDATE queries affected the expected rows
