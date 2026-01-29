
# Fix: Pre-arrival Guest Portal Blank Page & Missing Activities

## Problem Summary
Pre-arrival guests see a **completely blank page** when accessing the guest portal. Additionally, activities during their stay dates do not display.

### Root Causes Identified

| Bug | Location | Cause |
|-----|----------|-------|
| **Blank Page** | `GuestPrearrivalHome.tsx` (line 90-92) | Returns `null` when `is_enabled: false` instead of a fallback UI |
| **No Activities** | `PrearrivalActivitiesPreview.tsx` (line 48-52) | Wrong RPC parameters: passes `p_resort_id` but RPC expects `p_guest_id, p_date, p_category` |

### Database Context
- Resort "The Residence Falhumaafushi" has `prearrival_settings.is_enabled = false`
- Guest "Sam Smith" (Room 222) has check-in date 2026-01-31 (pre-arrival status)
- When the guest logs in, they're routed to `GuestPrearrivalHome` which then returns `null`

---

## Solution

### Fix 1: Show Fallback UI When Pre-arrival Features Disabled

**File**: `src/pages/guest/GuestPrearrivalHome.tsx`

Instead of returning `null` when pre-arrival is disabled, show a simplified welcome experience:

**Current Code (line 89-92)**:
```tsx
if (!settings?.is_enabled) {
  return null;
}
```

**New Behavior**:
- Show a simplified welcome banner with countdown to check-in
- Display quick actions to browse activities and dining
- Omit the pre-arrival checklist/wizard (since the feature is disabled)

**Implementation**:
```tsx
// If pre-arrival form is disabled, still show basic countdown + booking access
if (!settings?.is_enabled) {
  return (
    <div className="space-y-6">
      {/* Welcome Banner (simplified) */}
      <Card className="guest-hero border-0 shadow-guest-card overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-transparent">
        <CardContent className="p-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 shadow-sm">
              <Plane className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {t('prearrival.welcomeTitle', { name: firstName })}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('prearrival.getReady', 'Get ready for your upcoming stay')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Countdown */}
      <PrearrivalCountdown 
        checkInDate={guest.checkInDate}
        checkOutDate={guest.checkOutDate}
        roomNumber={guest.roomNumber}
      />

      {/* Quick Actions to browse */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/guest/activities">
          <Card className="guest-card hover:border-primary/30 transition-colors h-full">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <IconActivities className="h-6 w-6 text-primary" />
              </div>
              <span className="font-medium text-sm">{t('prearrival.browseActivities', 'Browse Activities')}</span>
            </CardContent>
          </Card>
        </Link>
        
        <Link to="/guest/restaurants">
          <Card className="guest-card hover:border-primary/30 transition-colors h-full">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-lagoon/10">
                <IconRestaurants className="h-6 w-6 text-lagoon" />
              </div>
              <span className="font-medium text-sm">{t('prearrival.browseDining', 'Browse Dining')}</span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
```

### Fix 2: Correct RPC Parameter Names in Activities Preview

**File**: `src/components/guest/prearrival/PrearrivalActivitiesPreview.tsx`

**Current Code (line 48-52)**:
```tsx
const { data, error } = await supabase.rpc('guest_get_available_sessions', {
  p_resort_id: guest.resortId,  // WRONG - this param doesn't exist
  p_date: selectedDate,
  p_guest_id: guest.guestId,    // WRONG position
});
```

**Fixed Code**:
```tsx
const { data, error } = await supabase.rpc('guest_get_available_sessions', {
  p_guest_id: guest.guestId,
  p_date: selectedDate,
  p_category: null, // optional filter
});
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/guest/GuestPrearrivalHome.tsx` | Replace `return null` with fallback UI when pre-arrival disabled |
| `src/components/guest/prearrival/PrearrivalActivitiesPreview.tsx` | Fix RPC parameter names: remove `p_resort_id`, use correct `p_guest_id, p_date, p_category` signature |

---

## Testing Checklist

1. **Pre-arrival guest with disabled settings**:
   - Login as Sam Smith (Room 222, Last name Smith, PIN from database)
   - Verify welcome banner + countdown appear (no blank page)
   - Verify activities and dining quick action cards are visible
   
2. **Activities loading**:
   - Click on activities quick action or day chip
   - Verify sessions for stay dates load correctly
   
3. **Pre-arrival guest with enabled settings**:
   - Enable pre-arrival for the resort in database
   - Verify full pre-arrival experience appears (checklist, wizard, etc.)

---

## Technical Notes

- The `guest_get_available_sessions` RPC derives `resort_id` internally from the guest record, so passing `p_resort_id` is unnecessary and was causing the call to fail
- The fallback UI preserves the guest experience even when the resort hasn't configured pre-arrival forms
- No database changes required - this is purely a frontend fix
