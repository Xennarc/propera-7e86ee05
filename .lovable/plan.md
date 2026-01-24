
# Staff Debug Console for `/staff/guests` and Beyond

## Overview

Create a comprehensive Staff Debug Console that helps diagnose issues in the staff portal. The console will be activated via `?debug=1` query parameter (matching the guest portal pattern) and will be accessible to Super Admins and Resort Admins.

This debug console will display:
- Auth context (user ID, profile, role)
- Resort context (current resort, code, timezone)
- Permissions state (resolved permissions, role)
- React Query cache status
- Recent network errors
- Database query diagnostics
- Console error capture

---

## Architecture

```text
+----------------------------------+
|       StaffShell.tsx             |
|  (renders if ?debug=1)           |
|                                  |
|   +---------------------------+  |
|   |   StaffDebugPanel         |  |
|   |   (fixed bottom-right)    |  |
|   +---------------------------+  |
+----------------------------------+
         |
         v
+------------------+     +---------------------+
| useStaffDebug    | --> | Debug Context Data  |
| Mode.ts          |     | - Auth state        |
+------------------+     | - Resort state      |
                         | - Permissions       |
                         | - Query cache       |
                         | - Error log         |
                         +---------------------+
```

---

## Files to Create

| File | Description |
|------|-------------|
| `src/hooks/useStaffDebugMode.ts` | Hook to detect `?debug=1` and gate access to Super/Resort Admins |
| `src/components/staff/StaffDebugPanel.tsx` | Main debug console UI with collapsible sections |
| `src/lib/debug-error-capture.ts` | Utility to capture and store console errors in memory |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/staff/StaffShell.tsx` | Import and conditionally render `StaffDebugPanel` based on `useStaffDebugMode` |

---

## Technical Details

### 1. `useStaffDebugMode` Hook

```typescript
interface StaffDebugMode {
  isDebugMode: boolean;        // True if ?debug=1 and user is admin
  showDebugPanel: boolean;     // Same as isDebugMode for staff
  debugLog: (msg: string, data?: object) => void;
}
```

- Uses `useSearchParams()` to detect `?debug=1`
- Uses `useAuth().isSuperAdmin()` or `usePermissions().currentResortRole === 'RESORT_ADMIN'` to gate access
- Returns `isDebugMode: false` for non-admin users even with `?debug=1`

### 2. `StaffDebugPanel` Component

A fixed-position card in the bottom-right corner (matching GuestDebugPanel pattern) with these collapsible sections:

**Section 1: Auth Context**
- `user.id` (truncated UUID)
- `user.email`
- `profile.full_name`
- `globalRole` (SUPER_ADMIN / STANDARD)
- `memberships.length` count

**Section 2: Resort Context**
- `currentResort.id` (truncated)
- `currentResort.name`
- `currentResort.code`
- `currentResort.timezone`
- Number of accessible resorts

**Section 3: Permissions**
- `currentResortRole` (e.g., RESORT_ADMIN, MANAGER)
- `permissionsLoading` status
- Count of resolved permissions
- Quick access checks: canAccessGuests, canManageResortStaff

**Section 4: Query Cache**
- Total cached queries count
- Queries with errors
- Stale queries count
- Button to invalidate all queries

**Section 5: Error Log**
- Last 5 console errors captured
- Clear button
- Error timestamps

**Section 6: Page Diagnostics**
- Current route path
- Component render time
- Data loading states for current page

### 3. Error Capture Utility

Simple in-memory error capture that hooks into `window.onerror` and `console.error`:

```typescript
// Captures last N errors for display in debug panel
class DebugErrorCapture {
  private errors: Array<{ timestamp: Date; message: string; stack?: string }> = [];
  
  capture(error: Error | string): void { ... }
  getErrors(): typeof this.errors { ... }
  clear(): void { ... }
}
```

### 4. Integration in StaffShell

```tsx
// In StaffShell.tsx
import { useStaffDebugMode } from '@/hooks/useStaffDebugMode';
import { StaffDebugPanel } from './StaffDebugPanel';

export function StaffShell() {
  const { showDebugPanel } = useStaffDebugMode();
  
  // ... existing code ...
  
  return (
    <TooltipProvider>
      {/* ... existing layout ... */}
      
      {showDebugPanel && (
        <StaffDebugPanel />
      )}
    </TooltipProvider>
  );
}
```

---

## Visual Design

The debug panel will match the existing `GuestDebugPanel` styling:
- Fixed position: `bottom-4 right-4`
- Width: `w-96` (wider than guest panel for more data)
- Semi-transparent backdrop: `bg-background/95 backdrop-blur`
- Amber accent border: `border-amber-500/50`
- Collapsible with Bug icon header
- Monospace font for IDs and technical data
- Color-coded status indicators (green/amber/red)

---

## Access Control

| User Type | Can See Debug Panel |
|-----------|---------------------|
| Super Admin | Yes (with `?debug=1`) |
| Resort Admin | Yes (with `?debug=1`) |
| Manager | No |
| Front Office | No |
| Other roles | No |

---

## Usage

1. Navigate to any staff page: `/staff/guests?debug=1`
2. Debug panel appears in bottom-right
3. Expand sections to inspect:
   - Whether auth/resort context is correct
   - If permissions are resolved
   - Any cached query errors
   - Recent console errors
4. Use "Invalidate Cache" button to clear React Query cache
5. Use "Clear Errors" to reset error log

---

## Benefits for Debugging

This console will help diagnose:

1. **Auth issues**: Missing profile, wrong role resolution
2. **Resort context issues**: Wrong resort selected, missing memberships
3. **Permission issues**: Permissions not loading, wrong access levels
4. **Query failures**: Failed API calls, stale data
5. **Schema mismatches**: Database errors captured in error log
6. **Routing issues**: Current route inspection

---

## Implementation Sequence

1. Create `src/lib/debug-error-capture.ts` (error capture utility)
2. Create `src/hooks/useStaffDebugMode.ts` (debug mode detection)
3. Create `src/components/staff/StaffDebugPanel.tsx` (main UI)
4. Modify `src/components/staff/StaffShell.tsx` (integrate panel)
