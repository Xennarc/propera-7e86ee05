
# Guest Realtime QA Checklist Debug Badge

## Overview
Add a lightweight, non-intrusive debug badge component that displays unified realtime diagnostics when `?debugRealtime=1` is present in the URL. This will help QA and superadmins verify the unified subscription is working without diving into browser console logs.

## Current Architecture
- `useUnifiedGuestRealtime` hook manages a single consolidated channel
- `GuestRealtimeContext` exposes `unifiedActive`, `guestId`, `resortId`
- Debug logging is already gated behind `?debugRealtime=1` query param
- Existing debug panels (GuestDebugConsole, ScopeDebugBanner) use similar patterns

## Implementation Approach

### 1. Extend GuestRealtimeContext to expose diagnostics

Update `src/contexts/GuestRealtimeContext.tsx` to include:
- `channelName`: The name of the active channel
- `lastEvent`: `{ table: string; timestamp: Date } | null` - Most recent event received
- `eventCounts`: `Record<string, number>` - Count of events per table in this session

### 2. Extend useUnifiedGuestRealtime hook to track diagnostics

Update `src/hooks/sync/useUnifiedGuestRealtime.ts` to:
- Track event counts in a ref: `eventCountsRef.current[table]++`
- Track last event timestamp and table in a ref
- Expose these via return value: `{ isActive, channelName, lastEvent, eventCounts }`

### 3. Create GuestRealtimeDebugBadge component

Create `src/components/guest/GuestRealtimeDebugBadge.tsx`:
- Only renders when URL has `?debugRealtime=1`
- Displays a small, collapsible badge fixed near top-right (below header)
- Shows:
  - Unified enabled: ✓ / ✗
  - Channel name (truncated)
  - Last event: table + time (e.g., "notifications @ 14:32:05")
  - Event counts table (e.g., notifications: 3, buggy_requests: 1)
- Styled consistently with existing debug panels (semi-transparent, monospace fonts)
- Includes expand/collapse toggle to minimize screen clutter

### 4. Add debug badge to Guest Home page

Update `src/pages/guest/GuestHome.tsx`:
- Import and render `<GuestRealtimeDebugBadge />` at top of the component
- No conditional logic needed - the component self-gates based on query param

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/sync/useUnifiedGuestRealtime.ts` | Update | Add event tracking refs, expose diagnostics in return |
| `src/contexts/GuestRealtimeContext.tsx` | Update | Extend context value with diagnostics from hook |
| `src/components/guest/GuestRealtimeDebugBadge.tsx` | Create | New debug badge component |
| `src/pages/guest/GuestHome.tsx` | Update | Add debug badge import and render |

## Technical Details

### Event Tracking in Hook
```typescript
// New refs in useUnifiedGuestRealtime
const eventCountsRef = useRef<Record<string, number>>({});
const lastEventRef = useRef<{ table: string; timestamp: Date } | null>(null);

// In handleEvent, after processing:
eventCountsRef.current[table] = (eventCountsRef.current[table] || 0) + 1;
lastEventRef.current = { table, timestamp: new Date() };

// Return extended values
return {
  isActive: enabled && !!guestId && !!resortId,
  channelName: `guest-unified-${resortId}-${guestId}`,
  lastEvent: lastEventRef.current,
  eventCounts: eventCountsRef.current,
};
```

### Context Extension
```typescript
interface GuestRealtimeContextValue {
  unifiedActive: boolean;
  guestId: string | null;
  resortId: string | null;
  // New diagnostics
  channelName: string | null;
  lastEvent: { table: string; timestamp: Date } | null;
  eventCounts: Record<string, number>;
}
```

### Debug Badge UI Pattern
```
┌──────────────────────────────────────────┐
│ 🔄 Realtime Debug                    [−] │
├──────────────────────────────────────────┤
│ Unified: ✓ Active                        │
│ Channel: guest-unified-abc12..def34      │
│ Last: notifications @ 14:32:05           │
├──────────────────────────────────────────┤
│ Events this session:                     │
│   notifications ······· 3                │
│   buggy_requests ······ 1                │
│   activity_bookings ··· 2                │
└──────────────────────────────────────────┘
```

## Safety Guarantees
- Component only renders when `?debugRealtime=1` is in URL
- No production impact when flag is absent
- Uses refs for tracking to avoid re-render loops
- Follows existing debug panel patterns (z-index, positioning, styling)
- Zero changes to production user experience
