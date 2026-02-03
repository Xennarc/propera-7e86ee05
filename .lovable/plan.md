
# Comprehensive Fix: Transport Module Issues

## Issues Summary

| Issue | Root Cause | Impact |
|-------|-----------|--------|
| "Staff dispatch actions disabled" banner | Missing `enable_requests_staff_dispatch` feature flag in database | Cannot create trips or manage requests |
| Drivers show as 0 available | UI filters for `status === 'available'` but DB uses `status === 'online'` | AssignTripDialog shows "No drivers online" |
| Drivers appear as "Unknown Driver" | Profile `full_name` is empty in database | No way to identify which staff account a driver belongs to |
| Plus icon to add driver shows empty | RPC working, but UI might not show names due to empty profile names | Cannot easily add drivers |

---

## Solution Overview

### Part 1: Database Migration - Add Missing Feature Flag

Create the `enable_requests_staff_dispatch` flag that controls staff dispatch actions:

```sql
-- Insert the missing feature flag (global default: enabled)
INSERT INTO feature_flags (key, label, description, category, scope, tier, is_enabled)
VALUES (
  'enable_requests_staff_dispatch',
  'Staff Dispatch Actions',
  'Allow staff to create trips, assign drivers, and manage dispatch queue',
  'core',
  'global',
  'essential',
  true
)
ON CONFLICT (key, COALESCE(resort_id, '00000000-0000-0000-0000-000000000000'))
DO NOTHING;
```

### Part 2: Fix Driver Status Filtering in UI

**File: `src/components/transport/dispatch/ResourcesPanel.tsx`**

1. Change the driver status filter from `'available'` to `'online'`:
   ```typescript
   // Line 45: Change from
   const availableDrivers = drivers.filter(d => d.status === 'available');
   // To
   const availableDrivers = drivers.filter(d => d.status === 'online');
   ```

2. Update the `driverStatusConfig` to use correct enum values:
   ```typescript
   const driverStatusConfig: Record<string, { label: string; className: string }> = {
     online: { label: 'Online', className: 'bg-green-500' },      // Was 'available'
     on_trip: { label: 'On Trip', className: 'bg-blue-500' },
     break: { label: 'On Break', className: 'bg-amber-500' },
     offline: { label: 'Offline', className: 'bg-muted-foreground' },
   };
   ```

**File: `src/components/transport/dispatch/QuickReassign.tsx`**

Update driver filtering to use `'online'`:
```typescript
// Line 41: Change from
const availableDrivers = drivers.filter(d => d.status === 'available' || d.user_id === currentDriverId);
// To
const availableDrivers = drivers.filter(d => d.status === 'online' || d.user_id === currentDriverId);
```

### Part 3: Improve Driver Name Display

**File: `src/components/transport/dispatch/ResourcesPanel.tsx`**

Update the DriverCard to show user email as fallback when no name is available:

```typescript
// In DriverCard component
<span className="font-medium text-sm block">
  {driver.full_name || `Driver (${driver.user_id.slice(0, 8)}...)`}
</span>
```

**File: `src/hooks/transport/useBuggyDrivers.ts`**

Fetch email from profiles as additional fallback:
```typescript
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, full_name')  // Note: profiles table doesn't have email column
  .in('id', userIds);
```

Since the profiles table doesn't have an email column, we'll improve the display by showing a truncated user ID as fallback.

### Part 4: Improve AddDriverDialog Display

**File: `src/components/transport/dispatch/AddDriverDialog.tsx`**

The dialog correctly shows `driver.full_name` from the RPC. The issue is that the profile names in the database are empty. We should show a fallback:

```typescript
<span>{driver.full_name || `Staff Member (ID: ${driver.user_id.slice(0, 8)}...)`}</span>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| **Database Migration** | Add `enable_requests_staff_dispatch` feature flag |
| `src/components/transport/dispatch/ResourcesPanel.tsx` | Fix status filter (`'available'` → `'online'`), update driverStatusConfig, improve fallback display |
| `src/components/transport/dispatch/QuickReassign.tsx` | Fix status filter (`'available'` → `'online'`) |
| `src/components/transport/dispatch/AddDriverDialog.tsx` | Add fallback display for empty names |
| `src/components/transport/AssignTripDialog.tsx` | Add fallback display for empty driver names (already uses `'online'` correctly) |

---

## Technical Details

### Driver Status Enum Reference
The database uses `driver_status` enum with values:
- `offline` - Driver is not working
- `online` - Driver is available for assignment
- `on_trip` - Driver is currently executing a trip
- `break` - Driver is on break

### Feature Flag Behavior
When `enable_requests_staff_dispatch` is:
- **Enabled (true)**: Staff can select requests, create trips, and manage dispatch
- **Disabled (false)**: Shows "Staff dispatch actions disabled" banner, hides selection controls

---

## Data Cleanup Note

The "Unknown Driver" issue is partially a **data issue** - the profiles for driver users have empty `full_name` fields. Staff members should update their profiles with their names. However, the code changes above will provide better fallback displays until that happens.

---

## Testing Plan

After implementing:

1. **Verify Feature Flag**
   - Navigate to Transport page
   - Confirm "Staff dispatch actions disabled" banner is gone
   - Verify selection checkboxes appear for requests

2. **Verify Driver Availability**
   - Open Resources panel
   - Confirm online drivers show as "X drivers available" (not 0)
   - Verify driver status badges show "Online" with green indicator

3. **Test Trip Assignment Flow**
   - Select a request and create a trip
   - Click "Assign Buggy & Driver"
   - Verify dropdown shows online drivers
   - Complete assignment and verify trip moves to "Assigned" status

4. **Verify Driver Names**
   - Check that drivers with empty profile names show a reasonable fallback
   - Confirm the display is clear enough to identify which driver is which
