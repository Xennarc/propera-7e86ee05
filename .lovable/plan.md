
# Enhanced Staff Debug Panel - Query Timing & UI Improvements

## Overview

Enhance the existing `StaffDebugPanel` with advanced query diagnostics including:
- Real-time tracking of pending/fetching queries
- Query execution timing measurements
- Slow query detection and highlighting
- Improved scrollable UI with better visual hierarchy
- Resizable/collapsible panel for easier use

---

## Features to Add

| Feature | Description |
|---------|-------------|
| **Pending Queries** | Live list of currently fetching queries with elapsed time |
| **Query Timing** | Track and display execution times for recent queries |
| **Slow Query Detection** | Highlight queries taking longer than threshold (e.g., 500ms) |
| **Query Details** | Expandable view showing query keys and status |
| **Improved Scrolling** | Better scroll behavior with sticky headers |
| **Panel Controls** | Minimize, resize, and position options |

---

## Architecture

```text
+------------------------------------------+
|  debug-error-capture.ts (existing)       |
+------------------------------------------+
                  |
+------------------------------------------+
|  debug-query-tracker.ts (NEW)            |
|  - Query start/end timing                |
|  - Pending queries list                  |
|  - Slow query detection                  |
+------------------------------------------+
                  |
+------------------------------------------+
|  StaffDebugPanel.tsx (enhanced)          |
|  - New "Active Queries" section          |
|  - New "Query Performance" section       |
|  - Improved UI/UX                        |
+------------------------------------------+
```

---

## Files to Create

| File | Description |
|------|-------------|
| `src/lib/debug-query-tracker.ts` | Query timing and tracking utility |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/staff/StaffDebugPanel.tsx` | Add new sections and UI improvements |

---

## Technical Implementation

### 1. Query Tracker Utility (`debug-query-tracker.ts`)

A module that hooks into React Query's cache to track:

```typescript
interface TrackedQuery {
  queryKey: string[];
  keyString: string;         // Human-readable key
  startTime: number;         // When fetch started
  endTime?: number;          // When fetch completed
  duration?: number;         // Duration in ms
  status: 'pending' | 'success' | 'error';
  isSlow: boolean;           // > 500ms threshold
}

// Export functions:
export function initQueryTracker(queryClient: QueryClient): () => void;
export function getPendingQueries(): TrackedQuery[];
export function getRecentQueries(): TrackedQuery[];
export function getSlowQueries(): TrackedQuery[];
export function clearQueryHistory(): void;
```

**Implementation approach:**
- Subscribe to `queryClient.getQueryCache().subscribe()` events
- Track `added`, `updated` events with `isFetching` state changes
- Store timing data in memory (last 20 queries)
- Calculate duration when query transitions from fetching to success/error

### 2. Enhanced StaffDebugPanel UI

**New Sections:**

**Section: Active Queries (Live)**
```
[Loader icon] Active Queries (3)
-----------------------------------
| guests-list        | 1.2s ↻     |
| dining-slots       | 0.4s ↻     |
| resort-config      | 2.1s ⚠️    |  <- slow query warning
-----------------------------------
```

**Section: Query Performance**
```
[Timer icon] Query Performance
-----------------------------------
| avg response time  | 324ms      |
| slow queries (>500ms) | 2       |
| total fetched      | 47         |
-----------------------------------
Recent queries (last 10):
| guests-list        | 245ms  ✓   |
| dining-slots       | 612ms  ⚠️  |
| resort-config      | 189ms  ✓   |
-----------------------------------
[Clear History] button
```

**UI Improvements:**
- Sticky header that remains visible while scrolling
- Better visual separation between sections
- Compact/expanded view toggle
- Pulse animation for active fetches
- Color-coded timing (green < 300ms, amber 300-500ms, red > 500ms)
- Improved badge styling
- Smoother scroll with proper max-height

### 3. UI Layout Changes

```
+------------------------------------------+
| [Bug] Staff Debug Console    [_] [X]     | <- sticky header
+------------------------------------------+
| [ScrollArea - max-h calculated properly] |
|                                          |
| > Auth Context                           |
| > Resort Context                         |
| > Permissions                            |
| > Active Queries (3) 🔄                  | <- NEW
| > Query Performance                      | <- NEW  
| > Query Cache                            |
| > Error Log (0)                          |
| > Page Diagnostics                       |
|                                          |
+------------------------------------------+
| Remove ?debug=1 to hide                  | <- sticky footer
+------------------------------------------+
```

---

## Implementation Details

### Query Key Formatting

Transform complex query keys into readable strings:
```typescript
// ['guests', 'list', 'resort-uuid-here'] 
// becomes: "guests.list.resort..."

function formatQueryKey(queryKey: unknown[]): string {
  return queryKey
    .map(part => {
      if (typeof part === 'string') {
        // Truncate UUIDs
        if (part.length > 20 && part.includes('-')) {
          return part.slice(0, 8) + '...';
        }
        return part;
      }
      return JSON.stringify(part);
    })
    .join('.');
}
```

### Timing Color Thresholds

| Duration | Color | Status |
|----------|-------|--------|
| < 300ms | Green | Fast |
| 300-500ms | Amber | Normal |
| > 500ms | Red | Slow |

### Live Updates

Use `useEffect` with interval to refresh pending queries every 100ms for smooth elapsed time updates:

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    setPendingQueries(getPendingQueries());
  }, 100); // Fast refresh for live timing
  return () => clearInterval(interval);
}, []);
```

---

## Visual Enhancements

1. **Pending Query Animation**
   - Subtle pulse on the "Active Queries" section when queries are running
   - Spinner icon next to each pending query

2. **Timing Display**
   - Live elapsed time counter for pending queries
   - Duration badge with color coding for completed queries

3. **Scroll Improvements**
   - ScrollArea with proper `h-[calc(80vh-96px)]` calculation
   - Smooth scrolling behavior
   - Sections remain fully visible when expanded

4. **Compact Mode** (optional toggle)
   - Show only summary counts
   - Expand to see details

---

## Testing Checklist

After implementation:
1. Navigate to `/staff/guests?debug=1`
2. Verify "Active Queries" section shows live fetching queries
3. Watch elapsed time counting up during slow queries
4. Check "Query Performance" shows recent query timings
5. Confirm slow queries (>500ms) are highlighted in red
6. Test scroll behavior - panel should scroll smoothly
7. Verify "Invalidate All" triggers visible re-fetch in active queries
8. Check minimize/close buttons work correctly
