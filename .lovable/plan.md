
# Fix Blank Pre-Arrival Guest Portal

## Summary
Address the issue where the pre-arrival guest portal appears blank by adding proper error handling, fixing a duplicate text bug, and ensuring proper data state management.

---

## Root Causes

| Issue | Location | Impact |
|-------|----------|--------|
| Missing error state handling | `GuestPrearrivalHome.tsx` | When RPC fails, shows fallback UI instead of error message |
| Duplicate resort name render | `PrearrivalCountdown.tsx` | Minor cosmetic bug (shows resort name twice) |
| No graceful degradation | `usePrearrivalData.ts` | Missing data defaults cause blank UI |

---

## Solution

### Fix 1: Add Error State Handling in GuestPrearrivalHome

Currently the component only handles loading state. Add error handling to show a retry option when data fails to load:

```tsx
// GuestPrearrivalHome.tsx - Line 30
const { data: prearrivalData, isLoading, error, refetch } = usePrearrivalData();

// After the isLoading check (line 65), add:
if (error) {
  return (
    <div className="space-y-6">
      <Card className="guest-card bg-destructive/5 border-destructive/20">
        <CardContent className="p-5 text-center">
          <h2 className="text-lg font-semibold mb-2">Unable to load pre-arrival data</h2>
          <p className="text-sm text-muted-foreground mb-4">
            We couldn't fetch your pre-arrival information. Please try again.
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Fix 2: Fix Duplicate Resort Name in PrearrivalCountdown

Remove the duplicate render of `resortName`:

```tsx
// PrearrivalCountdown.tsx - Lines 55-61
// Before:
{resortName && (
  <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
    <MapPin className="h-4 w-4" />
    {String(resortName)}
    {resortName}  // <-- DUPLICATE - remove this
  </p>
)}

// After:
{resortName && (
  <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
    <MapPin className="h-4 w-4" />
    {String(resortName)}
  </p>
)}
```

### Fix 3: Add Default Settings Fallback in usePrearrivalData

Add a default settings object to prevent undefined access:

```tsx
// usePrearrivalData.ts - Add after interfaces
export const DEFAULT_PREARRIVAL_SETTINGS: PrearrivalSettings = {
  is_enabled: false,
  allow_activity_bookings: false,
  allow_dining_bookings: false,
  allow_spa_bookings: false,
  show_arrival_details: true,
  show_preferences: true,
  show_special_occasions: true,
  custom_questions_json: [],
  welcome_message: null,
};
```

Then update `GuestPrearrivalHome.tsx` to use the default:

```tsx
// GuestPrearrivalHome.tsx - Line 70
const settings = prearrivalData?.settings ?? DEFAULT_PREARRIVAL_SETTINGS;
```

### Fix 4: Update usePrearrivalData Hook Return Type

Add `error` and `refetch` to the hook's return:

```tsx
// usePrearrivalData.ts - update to expose error and refetch
export function usePrearrivalData() {
  const { guest } = useGuestAuth();

  const query = useQuery({
    // ... existing config
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/guest/GuestPrearrivalHome.tsx` | Add error state handling, use default settings fallback |
| `src/components/guest/prearrival/PrearrivalCountdown.tsx` | Remove duplicate `resortName` render |
| `src/hooks/usePrearrivalData.ts` | Export default settings constant, update hook return type |

---

## Technical Details

### Data Flow After Fix

```text
usePrearrivalData()
    ├── isLoading: true → Show GuestHomeLoading skeleton
    ├── error: present → Show error card with retry button
    └── data: loaded
        ├── settings.is_enabled: false → Show fallback UI (intended)
        └── settings.is_enabled: true → Show full pre-arrival experience
```

### Safe Settings Access Pattern

```tsx
// Before (unsafe)
const settings = prearrivalData?.settings;
if (!settings?.is_enabled) { ... }  // Could be undefined

// After (safe)
const settings = prearrivalData?.settings ?? DEFAULT_PREARRIVAL_SETTINGS;
if (!settings.is_enabled) { ... }  // Always defined
```

---

## Testing Checklist

1. **Normal Load**: Pre-arrival page loads with full content when settings enabled
2. **Error State**: Simulate RPC failure → Shows error card with retry button
3. **No Settings**: Resort without prearrival_settings → Shows fallback UI gracefully
4. **Settings Disabled**: Resort with is_enabled=false → Shows fallback UI
5. **Countdown Display**: Resort name appears once (not duplicated)
6. **Retry Works**: Click retry button → Refetches data successfully
