
# Fix Debug Console Visibility - Higher Z-Index and Render During Loading

## Problem

The `GuestDebugConsole` is getting hidden by other elements in the guest portal because:

1. **Z-index conflict**: The console uses `z-50`, but so does the `GuestOnboardingTour` overlay (`fixed inset-0 z-50`)
2. **Not rendered during loading**: The debug console only renders after `loading` completes and `guest` exists, so if there's an error during authentication or data loading, the debug console is never shown
3. **Dark theme masking**: The loading state with `hero-pattern` background appears as a black screen, with no way to see debug info

---

## Solution

### 1. Increase Debug Console Z-Index to Maximum

Change the debug console from `z-50` to `z-[9999]` to ensure it floats above everything, including:
- Toast notifications (`z-[100]`)
- Onboarding tour (`z-50`)
- Dialogs and sheets (`z-50`)

**File:** `src/components/guest/GuestDebugConsole.tsx`

| Location | Current | Change To |
|----------|---------|-----------|
| Line 275 (minimized view) | `z-50` | `z-[9999]` |
| Line 295 (expanded view) | `z-50` | `z-[9999]` |

### 2. Render Debug Console During Loading State

Move the debug console rendering **outside** the loading/guest checks in `GuestLayout.tsx` so it's always visible when `?debug=1` is present.

**File:** `src/components/guest/GuestLayout.tsx`

Currently the console only renders after loading:
```jsx
if (loading || !isInitialized) {
  return <ProperaLoader ... />;
}
if (!guest) {
  return <Navigate to="/guest/login" replace />;
}
return (
  <div>
    ...
    {showDebugPanel && <GuestDebugConsole />}
  </div>
);
```

Change to include debug console in ALL return paths:
```jsx
// Move debug tracker initialization to run unconditionally
useEffect(() => {
  // Check URL for debug param directly (don't depend on guest)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('debug') !== '1') return;
  
  const cleanupErrors = initErrorCapture();
  const cleanupQueries = initQueryTracker(queryClient);
  return () => { cleanupErrors(); cleanupQueries(); };
}, [queryClient]);

// Loading state - include debug console
if (loading || !isInitialized) {
  return (
    <>
      <div className="flex min-h-screen items-center justify-center hero-pattern">
        <ProperaLoader size={64} text="Loading your experience..." />
      </div>
      {showDebugPanel && <GuestDebugConsole />}
    </>
  );
}

// No guest - include debug console before redirect
if (!guest) {
  return (
    <>
      {showDebugPanel && <GuestDebugConsole />}
      <Navigate to="/guest/login" replace />
    </>
  );
}
```

### 3. Handle Missing Guest Context in Debug Console

The debug console currently depends on `useGuestAuth()` which could be null. Add defensive handling:

**File:** `src/components/guest/GuestDebugConsole.tsx`

Update the `Guest Session` section to handle null guest gracefully (already does this, but verify logout function doesn't crash):
```jsx
const { guest, logout } = useGuestAuth();

const handleClearSession = useCallback(() => {
  localStorage.removeItem(STORAGE_KEY);
  setLocalStorageData(validateLocalStorageSession());
  if (logout) logout();  // Guard against undefined
}, [logout]);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/guest/GuestDebugConsole.tsx` | Update `z-50` to `z-[9999]` (lines 275, 295) |
| `src/components/guest/GuestLayout.tsx` | Render debug console in loading and no-guest states; make tracker init independent of guest |

---

## Visual Result

After this fix:
- Debug console will appear at the **very top** of the z-stack (`z-[9999]`)
- Debug console will be visible **during loading states** so you can see errors/queries
- Debug console will be visible **even if auth fails** so you can inspect localStorage

---

## Testing

1. Navigate to `/guest?debug=1` (while logged out)
2. Verify debug console appears over the loading screen
3. Verify debug console shows localStorage inspection
4. Login with PIN and verify console remains visible
5. Trigger an error and verify it appears in the error log
6. Verify console floats above the onboarding tour if triggered
