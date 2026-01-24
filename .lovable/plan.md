
# Fix Remaining special_occasions.map Crash

## Problem
The `GuestDetailPage` still crashes for some guests because several files call `.map()` or `.join()` on `special_occasions` (and `dietary_preferences`) without `Array.isArray()` guards. The database may store these as strings instead of arrays for some guests, causing `TypeError: x.map is not a function`.

## Root Cause Locations

| File | Line | Unsafe Code |
|------|------|-------------|
| `PrearrivalChecklist.tsx` | 56 | `profile.dietary_preferences.length` without Array check |
| `PrearrivalChecklist.tsx` | 72, 77 | `profile.special_occasions.length` and `.join()` |
| `PrearrivalSummaryCard.tsx` | 172-174 | `profile.special_occasions.length` and `.map()` |
| `PrearrivalProfileCard.tsx` | 215-216 | `profile.dietary_preferences.join()` |
| `PrearrivalProfileCard.tsx` | 219-220 | `profile.special_occasions.join()` |
| `PreArrivalSubmissionCard.tsx` | 127-128 | `payload.dietary_preferences.length` and `payload.special_occasions.length` |
| `PreArrivalSubmissionCard.tsx` | 189 | `payload.special_occasions!.map()` |
| `usePrearrivalStatus.ts` | 110-111, 113-114 | Unsafe casts to `string[]` without validation |

## Solution

Add `Array.isArray()` guards before every `.length`, `.map()`, or `.join()` call on these array fields.

---

## Technical Changes

### File 1: `src/components/guest/prearrival/PrearrivalChecklist.tsx`

**Line 55-57** - Add Array guard for dietary_preferences:
```typescript
const hasPreferences = !!(
  (Array.isArray(profile?.dietary_preferences) && profile.dietary_preferences.length > 0) ||
  profile?.allergies
);
```

**Line 72** - Add Array guard for special_occasions:
```typescript
const hasOccasions = Array.isArray(profile?.special_occasions) && profile.special_occasions.length > 0;
```

**Line 77** - Already safe because `hasOccasions` is a boolean gate, but the `.join()` is now safe.

---

### File 2: `src/components/guest/prearrival/PrearrivalSummaryCard.tsx`

**Line 172** - Add Array guard:
```typescript
{Array.isArray(profile?.special_occasions) && profile.special_occasions.length > 0 && (
```

---

### File 3: `src/components/prearrival/PrearrivalProfileCard.tsx`

**Line 215** - Add Array guard for dietary_preferences:
```typescript
if (Array.isArray(profile?.dietary_preferences) && profile.dietary_preferences.length > 0) {
```

**Line 219** - Add Array guard for special_occasions:
```typescript
if (Array.isArray(profile?.special_occasions) && profile.special_occasions.length > 0) {
```

---

### File 4: `src/components/staff/PreArrivalSubmissionCard.tsx`

**Line 127** - Add Array guard:
```typescript
const hasDietaryInfo = (Array.isArray(payload.dietary_preferences) && payload.dietary_preferences.length > 0) || payload.allergies;
```

**Line 128** - Add Array guard:
```typescript
const hasOccasions = Array.isArray(payload.special_occasions) && payload.special_occasions.length > 0;
```

---

### File 5: `src/hooks/usePrearrivalStatus.ts`

**Lines 110-111** - Safe array normalization for dietaryPreferences:
```typescript
hasDietaryPreferences: !!(Array.isArray(profile?.dietary_preferences) && profile.dietary_preferences.length > 0),
dietaryPreferences: Array.isArray(profile?.dietary_preferences) ? profile.dietary_preferences : [],
```

**Lines 113-114** - Safe array normalization for specialOccasions:
```typescript
hasSpecialOccasions: !!(Array.isArray(profile?.special_occasions) && profile.special_occasions.length > 0),
specialOccasions: Array.isArray(profile?.special_occasions) ? profile.special_occasions : [],
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/guest/prearrival/PrearrivalChecklist.tsx` | Add Array.isArray guards at lines 56 and 72 |
| `src/components/guest/prearrival/PrearrivalSummaryCard.tsx` | Add Array.isArray guard at line 172 |
| `src/components/prearrival/PrearrivalProfileCard.tsx` | Add Array.isArray guards at lines 215 and 219 |
| `src/components/staff/PreArrivalSubmissionCard.tsx` | Add Array.isArray guards at lines 127 and 128 |
| `src/hooks/usePrearrivalStatus.ts` | Safe array normalization at lines 110-114 |

---

## Impact
- Prevents ErrorBoundary crashes when array fields contain strings or null
- No visual changes for guests with properly formatted data
- Graceful handling returns empty arrays or skips rendering for malformed data

## Testing
After implementation:
1. Navigate to GuestDetailPage for guests that were previously crashing
2. Verify no crash occurs
3. Confirm array fields render correctly for guests with valid data
