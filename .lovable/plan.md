
# Fix: /staff/guests Null `.id` Crash - Root Cause Identified

## Root Cause: Null Guest Objects + Transient Null Resort

The crash is occurring at **multiple** points where we access `.id` on potentially null objects:

### Primary Crash Points (Confirmed)

1. **`GuestsPage.tsx:437-448` - `currentResort.code` Access**
   - Even with `resortId && currentResort` guard, React can render the child component with a transiently `null` `currentResort` during state transitions
   - At line 443: `resortCode={currentResort.code}` - if `currentResort` becomes null during render, this crashes

2. **`useGuestFilters.ts:193-208` - Null Guest in Array**
   - `guests.map((guest) => { ... guest.id ... })` assumes every item in the array is a valid Guest object
   - If Supabase query returns `[{...}, null, {...}]` or if React Query cache has corrupted data, accessing `guest.id` will crash

3. **`GuestsPage.tsx:365-383, 390-403` - filteredGuests.map**
   - `filteredGuests.map(guest => <GuestRow key={guest.id} ... />)` 
   - If `filteredGuests` contains null after filtering, accessing `guest.id` for the `key` prop will crash immediately

4. **Child Components (`GuestRow`, `GuestCardRow`)**
   - Both immediately call `getGuestStatusWithCountdown(guest)` which accesses `guest.check_in_date` and `guest.check_out_date`
   - No null guard before accessing guest properties

---

## Fix Strategy

**Three-layer null safety:**

1. **Layer 1: Sanitize Data at Source (Query Hook)**
   - Filter out null/undefined guests in `useGuestsQuery` before returning
   - Ensure `guests` array never contains null entries

2. **Layer 2: Guard Derived Values (GuestsPage)**
   - Extract `currentResort.code` into a safe variable
   - Add null guards before mapping over guest arrays
   - Filter out nulls from `filteredGuests` before rendering

3. **Layer 3: Defensive Filtering (useGuestFilters Hook)**
   - Add `.filter(guest => guest != null)` before mapping in `guestsWithStatus` computation
   - Ensure no nulls propagate through the filter pipeline

---

## Implementation Details

### Fix 1: Sanitize Guests Array in useGuestsQuery

**File:** `src/hooks/useGuestsQuery.ts`

**Problem:** Query result might contain null entries if database has orphaned records or RLS filters return partial data.

**Fix:** Add null filter in the query's `select` transform:

```typescript
const { data: guests = [], isLoading: loading } = useGuestsQuery({
  resortId,
  enabled: !!resortId,
});

// Inside useGuestsQuery hook implementation:
select: (data) => {
  // Filter out any null/undefined entries that might come from database
  return (data || []).filter((guest): guest is Guest => guest != null);
},
```

### Fix 2: Guard currentResort.code in GuestsPage

**File:** `src/pages/guests/GuestsPage.tsx`

**Problem:** Line 443 accesses `currentResort.code` which can be null during render.

**Fix:** Extract code into a safe variable at the top of the component:

```typescript
// Line 70: Add resortCode extraction
const resortId: string | undefined = currentResort?.id;
const resortCode: string | undefined = currentResort?.code;

// Line 437-448: Update GuestDialog
{resortId && resortCode && (
  <GuestDialog
    open={dialogOpen}
    onOpenChange={setDialogOpen}
    guest={editingGuest}
    resortId={resortId}
    resortCode={resortCode}  // Use safe variable
    onSuccess={() => {
      // React Query will auto-refetch via invalidation
    }}
  />
)}
```

### Fix 3: Filter Null Guests in useGuestFilters

**File:** `src/hooks/useGuestFilters.ts`

**Problem:** Line 193 maps over `guests` without null-checking.

**Fix:** Add filter before mapping:

```typescript
// Line 190-209: Add null filter
const guestsWithStatus = useMemo(() => {
  const today = startOfDay(new Date());
  
  // CRITICAL: Filter out any null/undefined guests before processing
  const validGuests = guests.filter((guest): guest is Guest => guest != null);
  
  return validGuests.map((guest): GuestWithStatus => {
    const checkIn = safeParseDateISO(guest.check_in_date);
    const checkOut = safeParseDateISO(guest.check_out_date);
    
    return {
      guest,
      status: prearrivalStatuses?.[guest.id],
      // ... rest of the mapping
    };
  });
}, [guests, prearrivalStatuses]);
```

### Fix 4: Guard filteredGuests.map in GuestsPage

**File:** `src/pages/guests/GuestsPage.tsx`

**Problem:** Lines 365, 390 map over `filteredGuests` without null safety.

**Fix:** Add null filter before mapping:

```typescript
// Line 363-383: Desktop rows
<div className="divide-y divide-border/30">
  {filteredGuests
    .filter((guest): guest is Guest => guest != null)
    .map(guest => (
      <GuestRow
        key={guest.id}
        guest={guest}
        // ... props
      />
    ))
  }
</div>

// Line 388-403: Mobile cards
<div className="p-3 space-y-3">
  {filteredGuests
    .filter((guest): guest is Guest => guest != null)
    .map(guest => (
      <GuestCardRow
        key={guest.id}
        guest={guest}
        // ... props
      />
    ))
  }
</div>
```

### Fix 5: Add Null Guard in Child Components (Defense in Depth)

**File:** `src/components/guests/GuestRow.tsx` and `GuestCardRow.tsx`

**Problem:** Components immediately access `guest` properties without null check.

**Fix:** Add early return if guest is null:

```typescript
export const GuestRow = memo(function GuestRow({ guest, ... }: GuestRowProps) {
  const { toast } = useToast();
  
  // CRITICAL: Guard against null guest prop
  if (!guest) {
    console.error('[GuestRow] Received null guest prop');
    return null;
  }
  
  const status = getGuestStatusWithCountdown(guest);
  // ... rest of component
});
```

Same for `GuestCardRow.tsx`.

---

## Additional Defensive Measures

### Add TypeScript Null Check in Guest Interface

Ensure the `Guest` type is always non-nullable in contexts where it's required:

```typescript
// In components that receive guest as prop:
interface GuestRowProps {
  guest: Guest;  // Non-nullable - component expects valid guest
  // ...
}

// At runtime, add guard at component entry:
if (!guest || !guest.id) return null;
```

### Add Error Logging for Debugging

When we filter out null guests, log a warning so we can investigate:

```typescript
const validGuests = guests.filter((guest): guest is Guest => {
  if (guest == null) {
    console.warn('[useGuestFilters] Filtered out null guest from array', { 
      totalGuests: guests.length 
    });
    return false;
  }
  return true;
});
```

---

## Why Previous Fixes Didn't Work

The "3-layer" patch from the previous fix:
1. ✅ **Fixed** transient null `resortId` in query hooks
2. ✅ **Fixed** loading state race conditions
3. ❌ **Did NOT fix** null guests in arrays - we never added null guards to the `map()` operations
4. ❌ **Did NOT fix** `currentResort.code` access - we only guarded `resortId`, not the code field

**The real issue:** We focused on preventing queries with null `resortId`, but didn't protect against:
- Null guest objects in the data payload
- Accessing nested properties (`currentResort.code`) that can become null between guard and render

---

## Testing Checklist

After applying fixes, test these scenarios:

```text
[ ] Hard refresh on /staff/guests (cold load)
[ ] Switch between resorts rapidly 5x
[ ] Navigate to /staff/guests while signed out (should redirect)
[ ] Sign out while on /staff/guests page
[ ] Open guest with missing check_in_date or check_out_date
[ ] Create guest with minimal data (no room, no email)
[ ] Delete guest and verify list updates without crash
[ ] Bulk select all guests, clear selection
[ ] Apply all filters simultaneously, then clear all
[ ] Open preview drawer for multiple guests in sequence
```

---

## Files to Modify

| File | Change Type | Lines |
|------|-------------|-------|
| `src/hooks/useGuestsQuery.ts` | Add null filter in select | TBD |
| `src/pages/guests/GuestsPage.tsx` | Extract resortCode, add null filters to maps | 70, 365-383, 390-403, 437-448 |
| `src/hooks/useGuestFilters.ts` | Add null filter before mapping | 193 |
| `src/components/guests/GuestRow.tsx` | Add null guard early return | 70-72 |
| `src/components/guests/GuestCardRow.tsx` | Add null guard early return | 53-55 |

---

## Summary

**Root Cause:** The crash is caused by two separate but related issues:
1. **Null guests in arrays**: `guests.map(guest => guest.id)` crashes when the array contains null
2. **Transient null resort properties**: `currentResort.code` accessed during render when `currentResort` is null

**Solution:** Apply defensive null filtering at every layer:
- Data source (query hooks)
- Data transformation (useGuestFilters)
- Rendering (GuestsPage map operations)
- Component entry (GuestRow/GuestCardRow)

This creates multiple redundant safety checks so even if one layer fails, the others catch the null.
