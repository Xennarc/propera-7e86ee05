

# Continue Building Request Handling Dashboard

## Current State Analysis

The requests dashboard has a solid foundation with:
- Lane-based workflow (New → In Progress → Completed)
- Real-time updates via Supabase subscriptions + 5s polling
- SLA countdown badges with color-coded urgency
- Priority sorting and search
- Keyboard shortcuts (1/2/3 for lanes, R to refresh)
- Optimistic UI updates for mutations

## Missing Features to Implement

Based on the original plan and comparison with the existing inbox page (`StaffRequestsInboxPage`), these features need to be added:

### 1. Request Detail Drawer Integration
**Current Gap:** The dashboard cards have an `onOpenDetail` prop but it's not connected to anything.

**Solution:** Integrate the existing `RequestDetailDrawer` component to show full request details, timeline, notes, and advanced actions.

### 2. Filter Sheet Implementation  
**Current Gap:** The filter sheet opens but shows "Filter options coming soon..."

**Solution:** Implement a proper filter sheet using the existing `FilterSheet` component from `@/components/ui/filter-sheet`, reusing the filter options from `RequestFiltersBar`:
- Department filter
- Priority filter  
- Assigned to filter
- Multi-item toggle

### 3. Department Data Fetch
**Current Gap:** Filters need department data to populate the dropdown.

**Solution:** Add department query to the dashboard page.

### 4. Sound Notifications for New Requests (Future Phase)
**Planned for later:** `useRequestNotifications` hook for audio/desktop notifications on urgent requests.

### 5. Bulk Selection Actions (Future Phase)
**Planned for later:** Multi-select mode with batch acknowledge/start/complete.

---

## Implementation Details

### Phase 1: Detail Drawer Integration

**File:** `src/pages/staff/RequestsDashboardPage.tsx`

Changes:
1. Import `RequestDetailDrawer` from `@/components/staff/RequestDetailDrawer`
2. Add state for `selectedRequest` and `drawerOpen`
3. Connect `onOpenDetail` prop in `RequestDashboardCard` to open the drawer
4. Pass the full request object to the drawer

```typescript
// New state
const [selectedRequest, setSelectedRequest] = useState<StaffServiceRequest | null>(null);
const [drawerOpen, setDrawerOpen] = useState(false);

// Handler
const handleOpenDetail = (request: RequestWithSLA) => {
  setSelectedRequest(request as unknown as StaffServiceRequest);
  setDrawerOpen(true);
};
```

### Phase 2: Filter Sheet Implementation

**File:** `src/pages/staff/RequestsDashboardPage.tsx`

Changes:
1. Add department query using Supabase
2. Replace placeholder Sheet content with proper filter UI
3. Add filter state management (department, priority, assigned)
4. Wire filters to `useRequestsDashboard` hook

**New State:**
```typescript
const [departmentFilter, setDepartmentFilter] = useState<string>('__all__');
const [priorityFilter, setPriorityFilter] = useState<StaffRequestPriority | 'all'>('all');
const [assignedFilter, setAssignedFilter] = useState<string>('__all__');
const [multiItemFilter, setMultiItemFilter] = useState(false);
const [filterSheetOpen, setFilterSheetOpen] = useState(false);
```

**Department Query:**
```typescript
const { data: departments = [] } = useQuery({
  queryKey: ['resort-departments', resortId],
  queryFn: async () => {
    const { data } = await supabase
      .from('departments')
      .select('key, name')
      .eq('resort_id', resortId)
      .eq('is_active', true);
    return data || [];
  },
  enabled: !!resortId,
});
```

**Filter Sheet UI:**
- Use existing `FilterSheet`, `FilterSection`, `FilterTrigger` components
- Checkboxes for department selection
- Priority radio options
- Assigned to options (All / Me / Unassigned)
- Multi-item toggle

### Phase 3: Permissions Integration

**Current Gap:** No permission checks for actions.

**Solution:** Import and use `useStaffRequestPermissions` to conditionally show actions:

```typescript
const { canAssign, canManage, canChangePriority } = useStaffRequestPermissions();
```

### Phase 4: Enhanced Card Actions

**File:** `src/components/staff/requests-dashboard/RequestDashboardCard.tsx`

Changes:
1. Add reassign capability for acknowledged/in-progress requests
2. Improve mobile touch targets
3. Add notes indication badge

---

## File Changes Summary

| File | Changes |
|------|---------|
| `src/pages/staff/RequestsDashboardPage.tsx` | Add detail drawer, filter sheet, department query, permissions |
| `src/components/staff/requests-dashboard/RequestDashboardCard.tsx` | Add notes indicator, improve action layout |
| `src/components/staff/requests-dashboard/DashboardFilterSheet.tsx` | **NEW** - Extracted filter sheet component for mobile |

---

## Component Structure After Changes

```text
RequestsDashboardPage
├── DashboardHeader (title, sync status, shortcuts button)
├── Urgent Alert Banner (animated, shows when urgent count > 0)
├── StatusLaneTabs (New / In Progress / Completed)
├── Search + Filter Bar
│   ├── Search Input
│   └── FilterTrigger → opens DashboardFilterSheet
├── Request Cards List
│   └── RequestDashboardCard
│       ├── Priority Badge + SLA Badge
│       ├── Title + Timestamp
│       ├── Guest Info + Room
│       ├── Action Buttons (context-aware)
│       └── Details Button → opens RequestDetailDrawer
├── DashboardFilterSheet (mobile bottom drawer)
│   ├── Department Section
│   ├── Priority Section
│   ├── Assigned To Section
│   └── Options Section (multi-item toggle)
├── RequestDetailDrawer (existing component)
└── KeyboardShortcutsModal
```

---

## Keyboard Shortcuts (Already Implemented)

| Key | Action |
|-----|--------|
| `1` | Switch to New lane |
| `2` | Switch to In Progress lane |
| `3` | Switch to Completed lane |
| `R` | Refresh data |
| `?` | Show shortcuts modal |
| `Escape` | Deselect / close drawer |

---

## Real-Time Sync Flow (Already Working)

```text
Guest Request Created
        │
        ▼
service_requests INSERT
        │
        ▼
Supabase Realtime Trigger
        │
        ▼
useRequestsDashboard subscription
        │
        ▼
queryClient.invalidateQueries(['requests-dashboard', resortId])
        │
        ▼
UI updates within ~2-5 seconds
```

---

## Testing Checklist

| Feature | Test Case | Expected |
|---------|-----------|----------|
| Detail Drawer | Click "Details" on card | Drawer opens with full request info |
| Filter Sheet | Tap filter icon on mobile | Bottom sheet slides up |
| Department Filter | Select specific department | Only that department's requests show |
| Priority Filter | Select "Urgent" | Only urgent requests show |
| Assigned Filter | Select "Assigned to Me" | Only my assigned requests show |
| Filter Clear | Click "Clear all" | All filters reset |
| Permissions | Non-manager user | Cannot see reassign option |

---

## Future Enhancements (Not in This Phase)

1. **Sound Notifications**
   - `useRequestNotifications` hook
   - Different tones for URGENT vs HIGH priority
   - Persist preference in localStorage

2. **Bulk Actions**
   - Checkbox selection mode
   - "Acknowledge All" / "Start All" / "Complete All"
   - Sticky bottom action bar

3. **Department Kanban View**
   - Toggle between timeline and department columns
   - Drag-and-drop between lanes

4. **Custom SLA Configuration**
   - Per-resort SLA targets
   - Database column additions

---

## Summary

This phase focuses on completing the core dashboard functionality by:

1. **Connecting the detail drawer** for full request management
2. **Implementing proper filters** with mobile-optimized filter sheet
3. **Adding permissions** to control action visibility
4. **Improving card UX** with better information display

After this phase, the dashboard will be fully functional for day-to-day request management, with future phases adding advanced features like bulk actions and sound notifications.

