
# Dedicated Guest Requests Dashboard & Simplified Guest Portal

## Overview

This implementation creates a **dedicated, real-time optimized dashboard** for staff to handle guest requests, while **simplifying** the guest portal to show a single request button by default (with optional category expansion based on resort configuration).

---

## Current State vs. Target State

| Aspect | Current | Target |
|--------|---------|--------|
| Staff Dashboard | Basic inbox at `/staff/guest-requests` | Dedicated full-screen dashboard with lane-based workflow |
| Real-time | 30s stale time + Supabase Realtime | Aggressive polling + enhanced Realtime subscriptions |
| Guest Portal Entry | 8-category grid shown by default | Single "Make a Request" button → category picker (optional) |
| Complex Requests | Basic priority/status | Priority escalation, SLA timers, bulk actions, keyboard shortcuts |

---

## Architecture

```text
┌──────────────────────────────────────────────────────────────────────┐
│                        Guest Portal                                   │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  GuestQuickActions                                               │ │
│  │  ┌─────────────────────────────────────────────────────────────┐│ │
│  │  │ "Request Something" button → opens RequestQuickSheet        ││ │
│  │  │    OR                                                        ││ │
│  │  │ Category grid (if resort has configured request_types)       ││ │
│  │  └─────────────────────────────────────────────────────────────┘│ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ Supabase Realtime
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                  Staff Requests Dashboard                             │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ RequestsDashboardPage (/staff/requests-dashboard)               │  │
│  │  ├─ Kanban/Lane View (NEW → IN_PROGRESS → COMPLETED)           │  │
│  │  ├─ Real-time counter badges with pulse animations              │  │
│  │  ├─ SLA timer indicators (color-coded urgency)                  │  │
│  │  ├─ Quick action buttons (Acknowledge → Start → Complete)       │  │
│  │  ├─ Bulk selection mode for batch operations                    │  │
│  │  ├─ Sound notifications for new requests                        │  │
│  │  └─ Keyboard shortcuts (A=Acknowledge, S=Start, C=Complete)     │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Simplified Guest Portal Request Entry

### Goal
By default, show a **single "Make a Request" button** that opens a streamlined sheet. If the resort has configured specific request categories in settings, show the category grid instead.

### Changes

#### 1.1 New Component: `RequestQuickSheet`
A simplified sheet for quick requests without category pre-selection:
- Single text input for request title/description
- ASAP toggle (default on)
- Optional notes field
- Auto-routes to a default department (e.g., FRONT_OFFICE or configurable)

#### 1.2 Update `GuestQuickActions`
- Check resort's request catalog configuration
- If catalog has items → show "Requests" button linking to `/guest/requests` (current behavior)
- If catalog is empty OR a feature flag `simple_requests` is enabled → show "Make a Request" button that opens `RequestQuickSheet` directly

#### 1.3 Update `GuestRequestsPage`
- Add detection for "simple mode" vs "catalog mode"
- In simple mode: show a prominent single-button interface
- In catalog mode: show the current category grid

---

## Part 2: Dedicated Staff Requests Dashboard

### Goal
Create a **dedicated, highly optimized dashboard** specifically designed for high-volume request handling with real-time updates, visual priority indicators, and workflow acceleration features.

### New Page: `/staff/requests-dashboard`

#### 2.1 Layout Structure
```text
┌─────────────────────────────────────────────────────────────────────┐
│ Header: "Requests Command Center"    [🔔 Sound On] [⌨️ Shortcuts]    │
├─────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐         │
│ │ NEW (12)        │ │ IN PROGRESS (5) │ │ COMPLETED (48)  │  [More] │
│ │ ▪ Pulse badge   │ │                 │ │                 │         │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘         │
├─────────────────────────────────────────────────────────────────────┤
│ Filter Bar: [Department ▼] [Priority ▼] [Assignee ▼] [🔍 Search]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─ NEW REQUESTS ─────────────────────────────────────────────────┐ │
│  │                                                                  │ │
│  │  ┌─────────────────────────────────────────────────────────────┐│ │
│  │  │ 🔴 URGENT  Room 401 - Extra Towels (2)           3m ago     ││ │
│  │  │            Guest: John Smith                                 ││ │
│  │  │            [👁 Acknowledge] [👤 Assign]                      ││ │
│  │  └─────────────────────────────────────────────────────────────┘│ │
│  │                                                                  │ │
│  │  ┌─────────────────────────────────────────────────────────────┐│ │
│  │  │ 🟡 HIGH    Room 218 - Minibar Refill              8m ago    ││ │
│  │  │            Guest: Maria Garcia   [SLA: 22m remaining]       ││ │
│  │  │            [👁 Acknowledge] [👤 Assign]                      ││ │
│  │  └─────────────────────────────────────────────────────────────┘│ │
│  │                                                                  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌─ IN PROGRESS ──────────────────────────────────────────────────┐ │
│  │                                                                  │ │
│  │  ┌─────────────────────────────────────────────────────────────┐│ │
│  │  │ 🟢 NORMAL  Room 105 - Iron & Board               Started    ││ │
│  │  │            Assigned to: Ana (Housekeeping)         12m ago  ││ │
│  │  │            [✅ Complete]                                     ││ │
│  │  └─────────────────────────────────────────────────────────────┘│ │
│  │                                                                  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 2.2 Real-Time Optimization

**Enhanced Subscription Strategy:**
```typescript
// Aggressive polling with Realtime as backup
useQuery({
  queryKey: ['requests-dashboard', resortId],
  refetchInterval: 5000, // Poll every 5 seconds when tab is active
  refetchIntervalInBackground: false,
  staleTime: 2000, // Consider stale after 2 seconds
});

// Supabase Realtime subscription for instant updates
useEffect(() => {
  const channel = supabase
    .channel(`requests-realtime-${resortId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'service_requests',
      filter: `resort_id=eq.${resortId}`,
    }, (payload) => {
      // Immediate optimistic update to query cache
      queryClient.setQueryData(['requests-dashboard', resortId], ...);
      // Trigger refetch for full sync
      queryClient.invalidateQueries(['requests-dashboard', resortId]);
    })
    .subscribe();
}, []);
```

**Visual Real-Time Indicators:**
- Pulse animation on NEW request count badge
- "Last synced X seconds ago" indicator
- Flash animation when new request arrives
- Sound notification (configurable) for new urgent requests

#### 2.3 Priority & SLA Features

**Visual Priority System:**
| Priority | Color | Badge | SLA Target |
|----------|-------|-------|------------|
| URGENT | Red | 🔴 Pulsing | 15 min |
| HIGH | Orange | 🟡 | 30 min |
| NORMAL | Blue | 🔵 | 60 min |
| LOW | Gray | ⚪ | 120 min |

**SLA Timer Display:**
- Color-coded countdown timer on each card
- Changes from green → yellow → red as deadline approaches
- Overdue requests highlighted with red border + "OVERDUE" badge

#### 2.4 Workflow Acceleration

**Quick Actions:**
- Single-click Acknowledge from card
- Single-click Start (auto-assigns to current user)
- Single-click Complete with optional notes modal
- Swipe gestures on mobile for quick status changes

**Bulk Operations:**
- Checkbox selection mode
- "Acknowledge All" for selected
- "Assign All to Me" for selected
- "Mark Complete" for selected (with single notes input)

**Keyboard Shortcuts:**
- `A` - Acknowledge selected/focused request
- `S` - Start selected request
- `C` - Complete selected request
- `↑/↓` - Navigate between requests
- `Enter` - Open detail drawer
- `Esc` - Deselect / close drawer

#### 2.5 Advanced Features

**Department Grouping Mode:**
Toggle between:
1. **Timeline View** - All requests in priority/time order
2. **Department Lanes** - Kanban-style columns per department
3. **Assignee View** - Grouped by assigned staff member

**Sound Notifications:**
- Toggle in header
- Different sounds for priority levels
- Desktop notification permission request

---

## Part 3: Enhanced Data Hooks

### 3.1 New Hook: `useRequestsDashboard`
Optimized hook for dashboard with aggressive caching strategy:

```typescript
export function useRequestsDashboard(resortId: string) {
  // Combines:
  // - useStaffServiceRequests with enhanced real-time
  // - Computed aggregations (counts by status, priority)
  // - SLA calculations
  // - Optimistic updates for mutations
  
  return {
    requests,
    counts: { new, acknowledged, inProgress, completed },
    urgentCount,
    overdueCount,
    lastSyncedAt,
    refetch,
    mutations: { acknowledge, start, complete, assignToMe },
  };
}
```

### 3.2 New Hook: `useRequestNotifications`
Handles sound/visual notifications for new requests:

```typescript
export function useRequestNotifications(enabled: boolean) {
  // Plays sound on new urgent requests
  // Triggers browser notification if permitted
  // Manages notification preferences in localStorage
}
```

---

## Part 4: Component Structure

### New Files to Create

```text
src/
├── pages/staff/
│   └── RequestsDashboardPage.tsx          # Main dashboard page
├── components/staff/requests-dashboard/
│   ├── DashboardHeader.tsx                # Title + sound/shortcut toggles
│   ├── StatusLaneTabs.tsx                 # NEW/IN_PROGRESS/COMPLETED tabs
│   ├── RequestDashboardCard.tsx           # Enhanced card with SLA timer
│   ├── RequestBulkActions.tsx             # Bulk selection actions bar
│   ├── RequestSLABadge.tsx                # SLA countdown badge
│   ├── DepartmentLanes.tsx                # Kanban-style department view
│   └── KeyboardShortcutsModal.tsx         # Help modal for shortcuts
├── components/guest/
│   └── RequestQuickSheet.tsx              # Simplified single-request sheet
├── hooks/
│   ├── useRequestsDashboard.ts            # Dashboard data hook
│   ├── useRequestNotifications.ts         # Sound/notification hook
│   └── useRequestSLA.ts                   # SLA calculation hook
└── lib/
    └── request-sla-config.ts              # SLA defaults and calculations
```

### Modified Files

```text
src/
├── App.tsx                                # Add new route
├── components/guest/GuestQuickActions.tsx # Conditional simple/catalog mode
├── pages/guest/GuestRequestsPage.tsx      # Add simple mode detection
├── components/staff/StaffShell.tsx        # Add nav item for dashboard
└── hooks/useStaffServiceRequests.ts       # Enhanced real-time options
```

---

## Part 5: Routing

**New Route:**
```tsx
<Route path="requests-dashboard" element={<RequestsDashboardPage />} />
```

**Navigation:**
- Add "Request Dashboard" link in staff sidebar (under Guest Experience)
- Keep existing "Guest Requests" inbox as secondary view

---

## Part 6: Database Considerations

### SLA Configuration (Future Enhancement)
If SLA customization is needed per resort:

```sql
-- Add to resort_retention_policies or new table
ALTER TABLE resort_retention_policies
ADD COLUMN sla_urgent_minutes INTEGER DEFAULT 15,
ADD COLUMN sla_high_minutes INTEGER DEFAULT 30,
ADD COLUMN sla_normal_minutes INTEGER DEFAULT 60,
ADD COLUMN sla_low_minutes INTEGER DEFAULT 120;
```

For this initial implementation, SLA values will be hardcoded in `request-sla-config.ts` with sensible defaults.

---

## Technical Considerations

### Real-Time Performance
- Use React Query's `staleTime: 2000` for aggressive freshness
- Combine with Supabase Realtime for instant updates
- Debounce invalidations to prevent refetch storms
- Use `subscribeOnce` pattern for initial data burst

### Mobile Optimization
- Dashboard is desktop-first but responsive
- On mobile: single-column scrollable list
- Swipe gestures for quick actions
- Sticky bottom action bar for bulk operations

### Accessibility
- All keyboard shortcuts have button equivalents
- ARIA live regions for real-time count updates
- Focus management for keyboard navigation
- Screen reader announcements for new requests

---

## Implementation Phases

### Phase 1: Core Dashboard (This Implementation)
- New `RequestsDashboardPage` with lane-based layout
- Enhanced real-time subscriptions
- Priority color-coding and SLA timers
- Basic keyboard shortcuts

### Phase 2: Guest Portal Simplification
- `RequestQuickSheet` component
- Conditional rendering in `GuestQuickActions`
- Feature flag or catalog-based detection

### Phase 3: Advanced Features (Future)
- Sound notifications
- Bulk operations
- Department Kanban view
- Custom SLA configuration per resort

---

## Summary

This implementation creates a **dedicated, high-performance requests dashboard** optimized for staff handling guest requests with:

1. **Instant real-time updates** via aggressive polling + Supabase Realtime
2. **Visual priority system** with SLA countdown timers
3. **Workflow acceleration** through quick actions and keyboard shortcuts
4. **Simplified guest experience** with optional single-button request entry
5. **Scalable architecture** ready for future enhancements like bulk actions and sound notifications

The dashboard will be the primary interface for request management, while the existing inbox remains available for quick reference.
