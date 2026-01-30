
# Fix: Guest Portal Pages Appearing Blank After Login

## Root Cause Analysis

The blank page issue is caused by a **React Rules of Hooks violation** in `GuestHome.tsx` and potential silent failures in data fetching hooks.

### Critical Issue Identified

In `GuestHome.tsx` (lines 62-64):
```tsx
const showPrearrival = activeStay?.status === 'pre_arrival' || isPrearrival;

if (showPrearrival) {
  return <GuestPrearrivalHome activeStay={activeStay} />;  // ← EARLY RETURN
}

// HOOKS BELOW ARE CALLED CONDITIONALLY (VIOLATES REACT RULES)
const { data: bookings, isLoading } = useQuery({ ... });  // Line 82
const { data: canSubmitFeedback } = useQuery({ ... });    // Line 97
const { data: resort } = useQuery({ ... });               // Line 111
```

**React's Rules of Hooks require that hooks are called unconditionally at the top level.** When `showPrearrival` is true, the component returns early, but on subsequent renders when it becomes false, React sees different hooks being called - causing a silent crash and blank page.

### Secondary Issues

1. **Missing Global Error Handler**: Unhandled promise rejections in async data fetching can crash the app silently.
2. **Insufficient Loading States**: Some pages don't show loading states while data is being fetched, appearing "blank" temporarily.
3. **Pre-arrival Logic Edge Cases**: The 12-hour transition logic change may cause edge cases where `isPrearrival` flickers between true/false.

---

## Solution

### Phase 1: Fix React Hooks Violation in GuestHome.tsx

**Move ALL hooks to the top of the component**, before any conditional returns:

```tsx
export default function GuestHome() {
  const { guest } = useGuestAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isPrearrival } = useIsPrearrivalGuest();
  const { activeStay, isLoading: stayLoading } = useActiveStay();
  const { data: prearrivalData } = usePrearrivalData();
  const [wizardOpen, setWizardOpen] = useState(false);

  // ✅ MOVE ALL QUERIES TO TOP - BEFORE CONDITIONAL RETURNS
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['guest-bookings', guest?.guestId],
    queryFn: async () => { ... },
    enabled: !!guest && !isPrearrival,  // ← Disable when pre-arrival
  });

  const { data: canSubmitFeedback } = useQuery({
    queryKey: ['can-submit-feedback', guest?.guestId],
    queryFn: async () => { ... },
    enabled: !!guest && !isPrearrival,  // ← Disable when pre-arrival
  });

  const { data: resort } = useQuery({
    queryKey: ['guest-resort', guest?.resortId],
    queryFn: async () => { ... },
    enabled: !!guest,  // Keep enabled for branding
  });

  const { showOnboarding, completeOnboarding, skipOnboarding } = useGuestOnboarding(
    guest?.guestId || '',
    guest?.resortId || ''
  );

  // ✅ NOW CONDITIONAL RETURNS ARE SAFE
  const showPrearrival = activeStay?.status === 'pre_arrival' || isPrearrival;
  
  if (showPrearrival) {
    return <GuestPrearrivalHome activeStay={activeStay} />;
  }

  if (!guest) return null;
  if (isLoading) return <GuestHomeLoading />;

  // ... rest of component
}
```

### Phase 2: Add Global Unhandled Rejection Handler

Add a defensive error handler in `App.tsx` to catch any unhandled promise rejections:

```tsx
// In App.tsx - add useEffect at app root level
useEffect(() => {
  const handleRejection = (event: PromiseRejectionEvent) => {
    console.error("Unhandled rejection:", event.reason);
    // Prevent blank screen by catching the error
    event.preventDefault();
  };

  window.addEventListener("unhandledrejection", handleRejection);
  return () => window.removeEventListener("unhandledrejection", handleRejection);
}, []);
```

### Phase 3: Ensure Loading States Are Shown

Update components to explicitly show loading states during the initial data fetch:

**GuestHome.tsx:**
```tsx
// After hooks, before content
if (!guest) return null;
if (stayLoading) return <GuestHomeLoading />;
if (isLoading && !showPrearrival) return <GuestHomeLoading />;
```

**GuestPrearrivalHome.tsx:**
Already has proper loading handling - no changes needed.

### Phase 4: Stabilize Pre-arrival Detection

Memoize the `isPrearrival` calculation to prevent flickering:

```tsx
// In usePrearrivalData.ts
export function useIsPrearrivalGuest() {
  const { guest } = useGuestAuth();
  
  // Memoize to prevent recalculation on every render
  return useMemo(() => {
    if (!guest) {
      return { isPrearrival: false, daysUntilArrival: 0, hoursUntilArrival: 0 };
    }

    const resortTimezone = guest.resortTimezone || 'UTC';
    const nowLocal = nowInTimezone(resortTimezone);
    const todayStart = startOfDay(nowLocal);
    const checkInDate = startOfDay(parseISO(guest.checkInDate));
    const hoursUntilArrival = differenceInHours(checkInDate, nowLocal);
    const daysUntilArrival = differenceInDays(checkInDate, todayStart);
    const isPrearrival = hoursUntilArrival > 12;

    return {
      isPrearrival,
      daysUntilArrival: Math.max(0, daysUntilArrival),
      hoursUntilArrival: Math.max(0, hoursUntilArrival),
    };
  }, [guest?.checkInDate, guest?.resortTimezone]);
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/guest/GuestHome.tsx` | Move all `useQuery` hooks to top of component, add loading state checks |
| `src/hooks/usePrearrivalData.ts` | Wrap `useIsPrearrivalGuest` return in `useMemo` for stability |
| `src/App.tsx` | Add global unhandled rejection handler component |

---

## Technical Details

### React Hooks Rule

React tracks hooks by call order. If component renders with:
- Render 1: Hook A → Hook B → Hook C → early return
- Render 2: Hook A → Hook B → Hook C → Hook D → Hook E

React throws: "Rendered more hooks than during the previous render."

In production React, this may fail silently, causing a blank screen.

### Fix Pattern

Always call hooks unconditionally, then use `enabled` flag for conditional data fetching:

```tsx
// ❌ BAD: Conditional hook call
if (someCondition) {
  return <OtherComponent />;
}
const { data } = useQuery({ ... });

// ✅ GOOD: Hook always called, conditionally enabled
const { data } = useQuery({ 
  ...,
  enabled: !!someCondition 
});
if (someCondition) {
  return <OtherComponent />;
}
```

---

## Testing Checklist

1. **Fresh Login**: Login as a guest and verify home page loads with content
2. **Pre-arrival Guest**: Login as pre-arrival guest → see pre-arrival home
3. **In-house Guest**: Login as in-house guest → see full home page with bookings
4. **Tab Navigation**: Switch between Home, Activities, Requests, Bookings tabs
5. **Page Refresh**: Refresh any guest portal page → content loads correctly
6. **Error Recovery**: Simulate network error → page recovers gracefully
7. **12-hour Transition**: Test guest exactly 12 hours before check-in → sees in-house view
