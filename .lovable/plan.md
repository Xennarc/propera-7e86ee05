
# Staff Debug Console Implementation

## Problem Analysis

The "Cannot read properties of null (reading 'id')" error on `/staff/guests` is caused by race conditions during authentication and resort data loading. Despite multiple fixes to `ResortContext`, the issue persists, indicating a complex state transition problem that requires real-time visibility to diagnose.

**Why previous fixes haven't worked:**
1. Multiple components and hooks depend on `currentResort.id` simultaneously
2. React Query refetches can temporarily clear data during background updates
3. The exact timing of when `currentResort` becomes null is unclear
4. Different browsers/network conditions may trigger different race conditions

**Best Solution:** Implement a **Staff Debug Console** (similar to the existing Guest Debug Console) to provide real-time visibility into:
- `currentResort` state transitions (null → Resort → null)
- `AuthContext` loading states and membership data
- React Query cache status and active/pending queries
- Route and navigation state
- Captured errors with stack traces

This will allow us to see **exactly** when and why `currentResort.id` is being accessed on a null object.

---

## Implementation Plan

### 1. Create Staff Debug Hook (`useStaffDebugMode.ts`)

**Current state:** Already exists at `src/hooks/useStaffDebugMode.ts`
- Checks for `?debug=1` URL parameter
- Only accessible by Super Admins and Resort Admins
- Already integrated into the codebase

**Status:** ✅ No changes needed

---

### 2. Create Staff Debug Console Component

**New file:** `src/components/staff/StaffDebugConsole.tsx`

**Architecture:**
- Similar structure to `GuestDebugConsole.tsx`
- Positioned with high z-index (z-[9999]) above all content
- Fixed position: bottom-right corner, above footer
- Minimizable to icon badge showing error count
- Draggable (optional enhancement)

**Sections to include:**

#### Section A: Auth & Resort State (default open)
Shows the exact state causing the crash:
```typescript
- User ID: abc123... (truncated)
- Global Role: SUPER_ADMIN / STANDARD
- Memberships: 3 resorts
- User Data Loading: false / true
- Current Resort: 
  - ID: def456...
  - Name: Paradise Resort
  - Code: PARADISE
  - Status: null / Resort / loading
- Resort Loading: false / true
```

**Why critical:** This shows if `currentResort` is null when it shouldn't be.

#### Section B: React Query Diagnostics
```typescript
- Total Queries in Cache: 12
- Active Queries: 2
- Pending Queries: 1
  - guests-resort-abc123 (1200ms) SLOW
  - prearrival-settings-abc123 (pending)
- Failed Queries: 0
- Recent Query History:
  - guests-resort-abc123: success (1200ms)
  - resorts-list: success (350ms)
```

**Why critical:** Shows if queries are refetching and potentially clearing data.

#### Section C: Error Capture
Reuse `debug-error-capture.ts` to show:
```typescript
- Error count badge
- Latest errors with timestamps
- Stack traces (expandable)
- Copy button for each error
```

**Why critical:** This will capture the exact "Cannot read properties of null" error with stack trace.

#### Section D: Page Diagnostics
```typescript
- Current Route: /staff/guests
- Search Params: ?debug=1
- Component Render Count: 15
- Last Navigation: 2s ago
- Performance:
  - Page Load: 1.2s
  - React Query Init: 0.3s
```

**Why critical:** Shows if rapid navigation or re-renders are causing issues.

---

### 3. Integrate Error Capture

**File:** `src/components/staff/StaffShell.tsx`

Add error capture initialization when debug mode is active:

```typescript
import { useStaffDebugMode } from '@/hooks/useStaffDebugMode';
import { initErrorCapture } from '@/lib/debug-error-capture';

// Inside StaffShell component:
const { isDebugMode, showDebugPanel } = useStaffDebugMode();

useEffect(() => {
  if (isDebugMode) {
    const cleanup = initErrorCapture();
    return cleanup;
  }
}, [isDebugMode]);
```

**Why:** Ensures all errors are captured globally when debug mode is active.

---

### 4. Add Debug Console to StaffShell

**File:** `src/components/staff/StaffShell.tsx`

After the main content area, add:

```typescript
{showDebugPanel && <StaffDebugConsole />}
```

**Placement:** After `</main>` tag, before closing `</div>` of the shell.

---

### 5. Enhance React Query Tracking

**File:** `src/lib/debug-query-tracker.ts`

**Current state:** Already exists for guest portal
- Tracks query starts, completions, durations
- Identifies slow queries (>1000ms)
- Maintains query history

**Status:** ✅ Already exists, can be reused for staff console

---

## Component Design Specs

### Visual Design
- **Size:** `w-[min(90vw,420px)] max-h-[75vh]`
- **Position:** `fixed bottom-4 right-4`
- **Z-index:** `z-[9999]` (above modals and toasts)
- **Background:** `bg-background/95 backdrop-blur-sm`
- **Border:** `border border-border shadow-2xl rounded-xl`

### Header
```
┌─────────────────────────────────────┐
│ 🐛 Staff Debug Console    [−] [×]  │
├─────────────────────────────────────┤
```

### Minimized View
```
┌────────────────┐
│ 🐛  ⚠️3  [+]  │
└────────────────┘
```
Shows bug icon + error count badge + expand button

### Sections (Collapsible)
Each section uses `<Collapsible>` from Radix UI:
- Click header to expand/collapse
- ChevronDown/ChevronRight icon
- Badge showing count (errors, pending queries, etc.)

---

## Data Flow

```
1. User adds ?debug=1 to URL
2. useStaffDebugMode detects debug mode + checks permissions
3. initErrorCapture() starts capturing errors globally
4. StaffDebugConsole mounts with high z-index
5. Console polls every 500ms for:
   - currentResort state from ResortContext
   - user/memberships from AuthContext
   - Pending queries from debug-query-tracker
   - Errors from debug-error-capture
6. When "Cannot read properties of null" occurs:
   - Error is captured with stack trace
   - Console shows exact state at time of error
   - Developer can see which hook/component caused it
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/staff/StaffDebugConsole.tsx` | **CREATE** | Main debug console component |
| `src/components/staff/StaffShell.tsx` | **MODIFY** | Add error capture init + render console |
| `src/hooks/useStaffDebugMode.ts` | **REVIEW** | Already exists, may need minor updates |
| `src/lib/debug-error-capture.ts` | **REUSE** | Already exists, works for staff too |
| `src/lib/debug-query-tracker.ts` | **REUSE** | Already exists, works for staff too |

---

## Privacy & Security

**Access Control:**
- Only visible when `?debug=1` is in URL
- Only works for Super Admins and Resort Admins (already enforced by `useStaffDebugMode`)
- Cannot be enabled by standard staff users

**Data Masking:**
- User IDs: Show first 8 chars + "..."
- Resort IDs: Show first 8 chars + "..."
- Email addresses: Not shown in console
- Full names: Not shown in console
- Session tokens: Not shown

**Production Safety:**
- Debug console is only shown with explicit `?debug=1` parameter
- No automatic activation
- Can be closed/minimized without affecting app functionality

---

## Implementation Code Outline

### StaffDebugConsole.tsx Structure

```typescript
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { 
  getErrors, 
  clearErrors, 
  type CapturedError 
} from '@/lib/debug-error-capture';
import {
  getPendingQueries,
  getRecentQueries,
  getQueryStats,
  clearQueryHistory
} from '@/lib/debug-query-tracker';

export function StaffDebugConsole() {
  const { user, memberships, userDataLoading, isSuperAdmin } = useAuth();
  const { currentResort, resorts, loading: resortLoading } = useResort();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  
  // Live data refresh
  const [errors, setErrors] = useState<CapturedError[]>([]);
  const [pendingQueries, setPendingQueries] = useState([]);
  const [recentQueries, setRecentQueries] = useState([]);
  const [queryStats, setQueryStats] = useState({ avgDuration: 0, slowCount: 0, totalCount: 0 });
  
  useEffect(() => {
    const refresh = () => {
      setErrors(getErrors());
      setPendingQueries(getPendingQueries());
      setRecentQueries(getRecentQueries());
      setQueryStats(getQueryStats());
    };
    
    refresh();
    const interval = setInterval(refresh, 500);
    return () => clearInterval(interval);
  }, []);
  
  if (!isVisible) return null;
  
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[9999]...">
        {/* Minimized badge view */}
      </div>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-[9999]...">
      {/* Header */}
      {/* Auth & Resort State Section */}
      {/* React Query Diagnostics Section */}
      {/* Error Log Section */}
      {/* Page Diagnostics Section */}
      {/* Footer */}
    </div>
  );
}
```

### StaffShell.tsx Integration

```typescript
import { useStaffDebugMode } from '@/hooks/useStaffDebugMode';
import { initErrorCapture } from '@/lib/debug-error-capture';
import { StaffDebugConsole } from '@/components/staff/StaffDebugConsole';

export function StaffShell() {
  const { isDebugMode, showDebugPanel } = useStaffDebugMode();
  
  // Initialize error capture when debug mode is active
  useEffect(() => {
    if (isDebugMode) {
      const cleanup = initErrorCapture();
      return cleanup;
    }
  }, [isDebugMode]);
  
  return (
    <div className="min-h-screen bg-background">
      {/* ...existing code... */}
      
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
      
      {/* Debug Console */}
      {showDebugPanel && <StaffDebugConsole />}
    </div>
  );
}
```

---

## Expected Debugging Workflow

### Before Implementation:
```
1. User reports: "Can't see guest list, error about null.id"
2. Developer: "Hmm, is it currentResort or guest that's null?"
3. Developer adds console.logs
4. Developer asks user to check console
5. User sends screenshot
6. Developer guesses at fix
7. Repeat 3-6 until solved (current situation)
```

### After Implementation:
```
1. User reports: "Can't see guest list, error about null.id"
2. Developer: "Add ?debug=1 to your URL"
3. User opens debug console
4. Console shows:
   - currentResort: null (← AHA! There's the problem)
   - Resort Loading: false (← Should be true)
   - User Data Loading: true (← Race condition found)
   - Error Log: "Cannot read properties of null (reading 'id')"
     at GuestsPage.tsx:81 (← Exact location)
5. Developer: "It's the prearrival settings query running before resort loads"
6. Developer adds guard to that specific query
7. Fixed in 1 iteration
```

---

## Testing Plan

### Test 1: Debug Console Appears
1. Log in as Super Admin
2. Navigate to `/staff/guests?debug=1`
3. ✅ Debug console appears in bottom-right
4. ✅ Shows Auth & Resort State section
5. ✅ Shows current resort name and ID

### Test 2: Error Capture
1. Open console with `?debug=1`
2. Trigger an error (e.g., navigate rapidly between routes)
3. ✅ Error appears in Error Log section
4. ✅ Stack trace is visible
5. ✅ Copy button works

### Test 3: Query Tracking
1. Open console
2. Refresh page (triggers queries)
3. ✅ Shows pending queries during load
4. ✅ Shows completed queries with durations
5. ✅ Marks slow queries (>1000ms)

### Test 4: Resort State Tracking
1. Open console
2. Log out and log back in
3. ✅ Watch currentResort transition: null → loading → Resort
4. ✅ Verify userDataLoading state changes
5. ✅ Confirm no crashes during transitions

### Test 5: Minimize/Close
1. Click minimize button
2. ✅ Console collapses to small badge
3. ✅ Badge shows error count
4. Click expand
5. ✅ Console reopens with same data
6. Click X to close
7. ✅ Console disappears completely

### Test 6: Permission Check
1. Log in as standard staff user (not admin)
2. Navigate to `/staff/guests?debug=1`
3. ✅ Debug console does NOT appear
4. ✅ No errors in browser console

---

## Benefits of This Approach

### 1. **Visibility Instead of Guessing**
Instead of adding more defensive checks blindly, we can SEE exactly when and why `currentResort` becomes null.

### 2. **Reusable for Future Issues**
Any future race condition, null access, or query issue can be diagnosed using the same console.

### 3. **Production-Safe**
Only accessible with `?debug=1` and admin permissions. No performance impact when not active.

### 4. **Minimal Code Changes**
Reuses existing utilities (`debug-error-capture`, `debug-query-tracker`). Only need to create the console component and add 2 lines to StaffShell.

### 5. **User-Friendly**
Super Admins can enable it themselves without developer intervention. Makes support easier.

---

## Alternative Fixes Considered (Why They're Not Sufficient)

### Option A: Add more optional chaining everywhere
**Problem:** Masks the root cause. `currentResort?.id || ''` might prevent crashes but breaks functionality.

### Option B: Add loading guards to every component
**Problem:** 50+ components use `currentResort`. We'd need to audit and update all of them.

### Option C: Prevent ResortContext from ever setting null
**Problem:** During logout or auth changes, `currentResort` MUST be null temporarily. Can't eliminate the null state.

### Option D: Delay rendering GuestsPage until resort is loaded
**Problem:** Already tried with loading states. The race condition happens during RE-renders, not initial render.

---

## Conclusion

The Staff Debug Console is the **most efficient solution** because:
1. It will definitively identify the root cause (instead of guessing)
2. It's reusable for future debugging
3. It's production-safe and permission-gated
4. It provides real-time visibility that console.logs can't match
5. It empowers Super Admins to self-diagnose issues

Once we see the exact state transitions in the debug console, we can apply a surgical fix to the specific component/hook causing the issue, rather than adding defensive checks everywhere.

---

## Technical Details Summary

**Components to create:**
- `src/components/staff/StaffDebugConsole.tsx` (main console, ~400 lines)

**Components to modify:**
- `src/components/staff/StaffShell.tsx` (add 10 lines for error capture + render console)

**Utilities to reuse:**
- `src/lib/debug-error-capture.ts` ✅ Already exists
- `src/lib/debug-query-tracker.ts` ✅ Already exists
- `src/hooks/useStaffDebugMode.ts` ✅ Already exists

**Total new code:** ~420 lines
**Estimated implementation time:** 45-60 minutes
**Debugging time saved:** Hours per issue

**Access:** Only Super Admins and Resort Admins with `?debug=1` parameter
