
# Portal Behavior Unification Plan (Phase 1)

## Overview
Unify the Guest Portal so **both pre-arrival and in-house guests** use the exact same routes, layout, and UI shell. The only difference: guests accessing the portal **before their check-in date** (in resort timezone) see a skippable Pre-Arrival Form interstitial on first visit.

## Current State Analysis

### Existing Architecture
| Component | Current Behavior |
|-----------|------------------|
| `GuestHome.tsx` | Already routes to `GuestPrearrivalHome` if `isPrearrival` is true |
| `useIsPrearrivalGuest()` | Uses browser's local date (not resort timezone) |
| `useActiveStay()` | Fetches stay with `status` field (pre_arrival, in_house, checked_out) |
| `usePrearrivalData()` | Fetches profile with `prearrival_status` (not_started, partial, completed) |
| `PrearrivalWizard` | Full dialog-based form for arrival details, preferences, occasions |
| `GuestLayout.tsx` | Same shell for all guests (header + bottom nav) |
| Staff `PreArrivalSubmissionCard.tsx` | Already shows submission data in Guest Detail page |

### What Works Today
- Same portal routes (`/guest/*`) for all guests
- Pre-arrival checklist shown on `GuestPrearrivalHome`
- Staff can view pre-arrival submissions via `PreArrivalSubmissionCard`
- `PrearrivalWizard` handles form submission

### What Needs Improvement
1. **`useIsPrearrivalGuest` uses browser timezone** — should use resort timezone
2. **No interstitial/gate** — guests go directly to pre-arrival home without explicit prompt
3. **No skip mechanism** — guests can't dismiss the prompt for the session
4. **No persistent "Complete Pre-Arrival" card** on the regular home page after check-in
5. **Staff detail page already shows data** via `PreArrivalSubmissionCard` ✓

---

## Implementation Plan

### Task 1: Update `useIsPrearrivalGuest` to Use Resort Timezone

**File:** `src/hooks/usePrearrivalData.ts`

**Current Logic (uses browser timezone):**
```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);

const checkInDate = new Date(guest.checkInDate);
checkInDate.setHours(0, 0, 0, 0);

const diffTime = checkInDate.getTime() - today.getTime();
```

**New Logic (uses resort timezone):**
```typescript
import { nowInTimezone } from '@/lib/timezone-utils';
import { startOfDay, differenceInDays, parseISO } from 'date-fns';

export function useIsPrearrivalGuest(): { isPrearrival: boolean; daysUntilArrival: number } {
  const { guest } = useGuestAuth();
  
  if (!guest) {
    return { isPrearrival: false, daysUntilArrival: 0 };
  }

  // Get "today" in the resort's timezone
  const resortTimezone = guest.resortTimezone || 'UTC';
  const nowLocal = nowInTimezone(resortTimezone);
  const todayStart = startOfDay(nowLocal);
  
  // Parse check-in date (stored as YYYY-MM-DD)
  const checkInDate = startOfDay(parseISO(guest.checkInDate));

  const daysUntilArrival = differenceInDays(checkInDate, todayStart);

  return {
    isPrearrival: daysUntilArrival > 0,
    daysUntilArrival: Math.max(0, daysUntilArrival),
  };
}
```

---

### Task 2: Create `GuestPortalGate` Wrapper Component

**New File:** `src/components/guest/GuestPortalGate.tsx`

This component wraps the `<Outlet />` in `GuestLayout` and shows a pre-arrival prompt interstitial when appropriate.

**Logic:**
1. Check if `isPrearrival` is true (using updated hook)
2. Check if `prearrivalData.profile.prearrival_status !== 'completed'`
3. Check if NOT recently skipped (localStorage key `preArrivalSkippedUntil`)
4. If all conditions met → show `PreArrivalPromptScreen`
5. Else → render `<Outlet />` (normal portal)

**Component Structure:**
```typescript
interface GuestPortalGateProps {
  children: React.ReactNode;
}

export function GuestPortalGate({ children }: GuestPortalGateProps) {
  const { isPrearrival } = useIsPrearrivalGuest();
  const { data: prearrivalData, isLoading } = usePrearrivalData();
  const [showPrompt, setShowPrompt] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    // Skip if loading or not pre-arrival
    if (isLoading || !isPrearrival) {
      setShowPrompt(false);
      return;
    }

    // Skip if pre-arrival not enabled for this resort
    if (!prearrivalData?.settings?.is_enabled) {
      setShowPrompt(false);
      return;
    }

    // Skip if already completed
    if (prearrivalData?.profile?.prearrival_status === 'completed') {
      setShowPrompt(false);
      return;
    }

    // Check localStorage skip marker
    const skippedUntil = localStorage.getItem('preArrivalSkippedUntil');
    if (skippedUntil) {
      const skipExpiry = new Date(skippedUntil);
      if (skipExpiry > new Date()) {
        setShowPrompt(false);
        return;
      }
      // Expired, clean up
      localStorage.removeItem('preArrivalSkippedUntil');
    }

    setShowPrompt(true);
  }, [isPrearrival, prearrivalData, isLoading]);

  const handleSkip = () => {
    // Skip for 24 hours
    const skipUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
    localStorage.setItem('preArrivalSkippedUntil', skipUntil.toISOString());
    setShowPrompt(false);
  };

  const handleComplete = () => {
    setWizardOpen(true);
  };

  const handleWizardClose = (open: boolean) => {
    setWizardOpen(open);
    if (!open) {
      // After wizard closes, re-check status
      // The query will auto-refetch and update prearrivalData
      setShowPrompt(false);
    }
  };

  if (isLoading) {
    return children; // Don't block during loading
  }

  if (showPrompt) {
    return (
      <>
        <PreArrivalPromptScreen
          onComplete={handleComplete}
          onSkip={handleSkip}
          guestName={...}
          checkInDate={...}
          settings={prearrivalData?.settings}
        />
        <PrearrivalWizard
          open={wizardOpen}
          onOpenChange={handleWizardClose}
          profile={prearrivalData?.profile || null}
          settings={prearrivalData?.settings!}
          checkInDate={guest.checkInDate}
        />
      </>
    );
  }

  return <>{children}</>;
}
```

---

### Task 3: Create `PreArrivalPromptScreen` Component

**New File:** `src/components/guest/prearrival/PreArrivalPromptScreen.tsx`

A full-screen or modal interstitial with:
- Resort branding/logo
- Welcome message: "Welcome, {firstName}!"
- Check-in countdown
- Primary CTA: "Complete Pre-Arrival" → opens wizard
- Secondary CTA: "Skip for now" → sets localStorage marker

**Design:**
```text
+-------------------------------------------+
|       [Resort Logo]                       |
|                                           |
|     Welcome, James!                       |
|     Your stay begins in 5 days            |
|                                           |
|   Help us prepare for your arrival by     |
|   sharing a few preferences.              |
|                                           |
|  +-----------------------------------+    |
|  |     Complete Pre-Arrival (2 min)  |    | ← Primary Button
|  +-----------------------------------+    |
|                                           |
|         Skip for now →                    | ← Text link
|                                           |
+-------------------------------------------+
```

---

### Task 4: Integrate Gate into `GuestLayout`

**File:** `src/components/guest/GuestLayout.tsx`

**Current:**
```tsx
<main ref={mainRef} className="...">
  <div className="p-4 max-w-lg mx-auto animate-fade-in contain-layout">
    <Outlet />
  </div>
</main>
```

**Updated:**
```tsx
import { GuestPortalGate } from '@/components/guest/GuestPortalGate';

// In the return:
<main ref={mainRef} className="...">
  <div className="p-4 max-w-lg mx-auto animate-fade-in contain-layout">
    <GuestPortalGate>
      <Outlet />
    </GuestPortalGate>
  </div>
</main>
```

---

### Task 5: Add "Complete Pre-Arrival" Card to Regular Home

**File:** `src/pages/guest/GuestHome.tsx`

The current code already has a "Soft Pre-arrival Nudge" card (lines 242-278) for in-stay guests who haven't completed pre-arrival:

```tsx
{!isPrearrival && 
 prearrivalData?.settings?.is_enabled && 
 prearrivalData?.profile?.prearrival_status !== 'completed' &&
 !prearrivalNudgeDismissed && (
  <Card className="...">
    ...
    <Button onClick={() => setWizardOpen(true)}>
      Complete Now
    </Button>
  </Card>
)}
```

**Enhancement:** Make this card persistent (not dismissible) until completed. Add visual distinction to show it's optional but helpful.

Current has `!prearrivalNudgeDismissed` — we'll keep the dismiss capability but the card will reappear on next session if still not completed.

---

### Task 6: Verify Staff Pre-Arrival Data Display

**Files to verify (no changes needed):**
- `src/pages/guests/GuestDetailPage.tsx` — Already imports and renders `PreArrivalSubmissionCard`
- `src/components/staff/PreArrivalSubmissionCard.tsx` — Already displays:
  - Status badge (Completed/Not Started)
  - Arrival details (time, flight, transfer)
  - Dietary & allergies
  - Water comfort level
  - Special occasions
  - Special requests
  - Last updated timestamp

**Current Integration (lines 115-122 in GuestDetailPage):**
```tsx
const { 
  stay: activeStay, 
  accessLinks, 
  submission,  // ← Pre-arrival data
  isLoading: stayLoading,
  refetch: refetchStay 
} = useStaffGuestStay(id || '', guest?.resort_id || currentResort?.id || '');
```

**Staff section rendering (already exists):**
```tsx
<PreArrivalSubmissionCard 
  submission={submission} 
  isLoading={stayLoading} 
/>
```

✅ **No changes needed** — Staff already sees pre-arrival data with status.

---

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/usePrearrivalData.ts` | **Modify** | Update `useIsPrearrivalGuest` to use resort timezone |
| `src/components/guest/GuestPortalGate.tsx` | **Create** | Gate wrapper that shows pre-arrival prompt |
| `src/components/guest/prearrival/PreArrivalPromptScreen.tsx` | **Create** | Full-screen interstitial with CTAs |
| `src/components/guest/GuestLayout.tsx` | **Modify** | Wrap `<Outlet />` with `<GuestPortalGate>` |
| `src/pages/guest/GuestHome.tsx` | **Minor** | Enhance existing nudge card behavior |
| Staff files | **None** | Already displays pre-arrival data correctly |

---

## Backward Compatibility

| Concern | Mitigation |
|---------|------------|
| Existing sessions | `useIsPrearrivalGuest` still returns same shape, just with correct timezone |
| Token-based logins | Unaffected — all login routes lead to same portal |
| In-house guests | Never see the prompt (isPrearrival = false) |
| Completed pre-arrival | Never see prompt (status check) |
| Skipped guests | Can still browse activities, make bookings, use all features |

---

## Acceptance Criteria Validation

| Criteria | Implementation |
|----------|----------------|
| Guest with future start date sees pre-arrival prompt | ✅ `GuestPortalGate` checks `isPrearrival` + status |
| Prompt is skippable | ✅ "Skip for now" sets 24h localStorage marker |
| Skipping goes to portal home | ✅ `setShowPrompt(false)` renders children |
| Skip doesn't block bookings | ✅ All routes remain accessible |
| In-stay guest never sees prompt | ✅ `isPrearrival: false` bypasses gate |
| Staff sees pre-arrival data | ✅ Already implemented via `PreArrivalSubmissionCard` |
| No existing routes break | ✅ Additive wrapper only |

---

## Technical Notes

### Timezone Calculation
The key fix is using `nowInTimezone(resortTimezone)` instead of `new Date()`:
- A guest accessing the portal at 11pm in New York for a Maldives resort (UTC+5) should see "pre-arrival" based on Maldives time, not NY time
- If it's Jan 25 in Maldives and check-in is Jan 26, they should see the prompt

### Skip Duration
- 24 hours chosen as balance between "not annoying" and "reminding them"
- Stored as ISO timestamp for accurate expiry across page reloads
- Clears automatically when expired

### Loading States
- Gate doesn't block during `isLoading` to prevent flash
- Wizard loading is handled by existing `PrearrivalWizard` component

