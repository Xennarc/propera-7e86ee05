
# Add Comprehensive Debug Console to Guest Portal

## Overview

Create a new `GuestDebugConsole` component that provides deep diagnostics for the guest portal, modeled after the staff debug panel but tailored for guest-specific context. This will be accessible via `?debug=1` query parameter and help diagnose issues like the recent React error #300.

---

## Architecture

The guest debug console will integrate:
- **Existing utilities**: `debug-error-capture.ts` (error log) and `debug-query-tracker.ts` (query performance)
- **Existing hook**: `useGuestDebugMode` (controls visibility via `?debug=1`)
- **Guest-specific context**: `GuestAuthContext` session data, localStorage inspection

---

## Implementation

### 1. Create GuestDebugConsole Component

**File:** `src/components/guest/GuestDebugConsole.tsx`

A mobile-optimized debug panel with collapsible sections:

| Section | Content |
|---------|---------|
| **Active Queries** | Live React Query requests with timing indicators |
| **Query Performance** | Avg response time, slow query count, recent queries list |
| **Guest Session** | guestId, fullName, roomNumber, resortId, checkIn/checkOut dates, sessionId |
| **LocalStorage Inspection** | Raw `propera_guest_session` value with JSON validation |
| **Error Log** | Captured console.error, unhandled exceptions, with stack traces |
| **Page Diagnostics** | Current route, search params, render timestamp |

Key features:
- Fixed position (bottom-right), mobile-friendly width (90vw max 400px)
- Minimize/close controls
- Collapsible sections to manage height
- Copy buttons for error details
- Clear actions for errors and query history

### 2. Integrate into GuestLayout

**File:** `src/components/guest/GuestLayout.tsx`

Add conditional rendering of `GuestDebugConsole` when `showDebugPanel` is true:

```text
Changes:
- Import useGuestDebugMode hook
- Import GuestDebugConsole component
- Call useGuestDebugMode(guest?.resortId) to get showDebugPanel
- Render <GuestDebugConsole /> after the nav element when showDebugPanel is true
```

### 3. Initialize Trackers in GuestLayout

The debug console requires error capture and query tracking to be initialized:

```text
Changes to GuestLayout.tsx:
- Import initErrorCapture from debug-error-capture.ts
- Import initQueryTracker from debug-query-tracker.ts
- Import useQueryClient from @tanstack/react-query
- Add useEffect to initialize trackers when debug mode is active
- Clean up on unmount
```

---

## Component Structure

```text
GuestDebugConsole
├── Sticky Header (title, minimize, close buttons)
├── ScrollArea (sections container)
│   ├── DebugSection: Active Queries (live pending queries)
│   ├── DebugSection: Query Performance (stats + recent history)
│   ├── DebugSection: Guest Session (context inspection)
│   ├── DebugSection: LocalStorage (raw session data)
│   ├── DebugSection: Error Log (captured errors)
│   └── DebugSection: Page Diagnostics (route, params, time)
└── Sticky Footer (hint to remove ?debug=1)
```

---

## Technical Details

### Guest Session Section
Displays all fields from `GuestSession` interface:
- `guestId` (truncated UUID)
- `fullName`
- `roomNumber`
- `checkInDate` / `checkOutDate`
- `resortId` (truncated UUID)
- `resortName`
- `resortTimezone`
- `sessionId` (truncated)
- `sessionToken` (truncated, security masked)

### LocalStorage Inspection
Critical for debugging React error #300:
- Shows raw JSON from `localStorage.getItem('propera_guest_session')`
- Validates JSON parse success
- Highlights if session contains non-string values (potential cause of render errors)
- "Clear Session" button for recovery

### Error Log
Uses `initErrorCapture()` and `getErrors()`:
- Real-time capture of `console.error`, `window.onerror`, `unhandledrejection`
- Expandable error details with full message and stack trace
- Copy button for each error
- Clear button to reset error list

### Query Performance
Uses `initQueryTracker()`, `getPendingQueries()`, `getRecentQueries()`, `getQueryStats()`:
- Live pending queries with duration and slow indicator
- Performance stats (avg, slow count, total)
- Recent query history with status icons
- Color-coded timing (green <300ms, amber <500ms, red >500ms)

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/guest/GuestDebugConsole.tsx` | Main debug console component |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/guest/GuestLayout.tsx` | Import and render GuestDebugConsole when `?debug=1` |

---

## Mobile Optimization

The console is designed for mobile-first guest portal:
- Width: `min(90vw, 400px)` to fit phone screens
- Max height: `70vh` with scroll area
- Touch-friendly tap targets (44px minimum)
- Bottom-right positioning with safe area inset awareness
- Minimize mode shows compact indicator with error/query counts

---

## Activation

Access the debug console by appending `?debug=1` to any guest portal URL:
- `/guest?debug=1`
- `/guest/bookings?debug=1`
- `/guest/activities?debug=1`

For DEMO resort guests, debug logging is always enabled but the panel only appears with explicit `?debug=1`.

---

## Testing Checklist

1. Navigate to `/guest?debug=1` after login
2. Verify debug console appears in bottom-right
3. Check Guest Session section shows correct data
4. Trigger a console.error and verify it appears in Error Log
5. Navigate between tabs and verify Active Queries updates
6. Test minimize and close functionality
7. Verify mobile responsiveness on narrow viewport
8. Test "Clear Session" action in LocalStorage section
9. Verify console hides when `?debug=1` is removed
