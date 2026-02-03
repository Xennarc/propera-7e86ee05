
# Driver Assignment Fix: Comprehensive Plan

## Problem Statement
When accessing the Transport module's Resources panel to assign driver roles, the user selection dropdown shows no staff members to select from. This is a critical functionality gap that prevents proper transport operations.

## Root Cause Analysis

After thorough investigation, I've identified **three interconnected issues**:

### Issue 1: RLS Policy Complexity with Nested Joins
The `useEligibleDrivers` hook queries `resort_memberships` with an INNER JOIN to `profiles`:
```typescript
.select(`user_id, resort_role, profiles!inner(id, full_name)`)
```

The problem: When RLS is evaluated on the `profiles` table during this join, the policy `Staff can view profiles in same resort` performs its own join back to `resort_memberships`. This creates a complex nested RLS evaluation that may not resolve correctly in all scenarios, especially for users who are not RESORT_ADMIN or SUPER_ADMIN.

**Evidence**: The `user_select_own_memberships` policy only allows viewing other memberships if you're SUPER_ADMIN or RESORT_ADMIN:
```sql
(user_id = auth.uid()) OR is_super_admin(auth.uid()) OR has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role])
```

A MANAGER trying to see all staff memberships would fail this check for rows where `user_id != auth.uid()`.

### Issue 2: Missing UI Access Control
The Add Driver button in `ResourcesPanel.tsx` has **no permission gating**. It's always visible, but the underlying query returns empty for users without proper RLS permissions.

### Issue 3: Permission Definition Gap
The `canManageResources` permission in `usePermissions.ts` (line 149) only allows SUPER_ADMIN and RESORT_ADMIN:
```typescript
canManageResources: superAdmin || currentResortRole === 'RESORT_ADMIN',
```

MANAGER role is explicitly excluded, despite the requirement that "Manager or higher" should access this feature.

---

## Solution Design

### Part 1: Fix RLS Policy for Resort Memberships (Database)

Add an RLS policy that allows staff with transport write permissions to view all memberships in their resort:

```sql
-- Allow transport staff to view memberships for driver assignment
CREATE POLICY "Transport staff can view memberships for driver assignment"
ON public.resort_memberships
FOR SELECT
TO authenticated
USING (
  public.staff_can_write_transport(auth.uid(), resort_id)
);
```

This leverages the existing `staff_can_write_transport` function which already allows TRANSPORT, MANAGER, and RESORT_ADMIN roles.

### Part 2: Create Transport Resource Management Permission

Add a new permission specifically for transport resource management:

```sql
INSERT INTO permissions (key, label, category) VALUES
('transport.drivers.manage', 'Manage Buggy Drivers', 'Transport'),
('transport.buggies.manage', 'Manage Buggies', 'Transport'),
('transport.stops.manage', 'Manage Transport Stops', 'Transport'),
('transport.view', 'View Transport Module', 'Transport');
```

### Part 3: Add UI Permission Gating

Update `ResourcesPanel.tsx` to conditionally show the Add Driver button based on permissions:

```typescript
// Only show Add Driver button for users who can manage transport resources
const canManageDrivers = isSuperAdmin || 
  currentResortRole === 'MANAGER' || 
  currentResortRole === 'RESORT_ADMIN';
```

### Part 4: Update usePermissions Hook

Add transport-specific permissions to the `usePermissions` hook:

```typescript
canManageTransportResources: superAdmin || 
  currentResortRole === 'RESORT_ADMIN' || 
  currentResortRole === 'MANAGER',
```

---

## Implementation Steps

### Step 1: Database Migration
Create RLS policy update to allow transport staff to view resort memberships:
- Add new SELECT policy on `resort_memberships` using `staff_can_write_transport`
- This is safe and non-breaking as it only ADDS permissions, doesn't remove any

### Step 2: Update usePermissions.ts
Add `canManageTransportResources` permission that includes MANAGER role.

### Step 3: Update ResourcesPanel.tsx
- Import `usePermissions` hook
- Gate the Add Driver button visibility with `canManageTransportResources`
- Show a helpful message when user doesn't have permission

### Step 4: Update AddDriverDialog.tsx
- Pass permission state as prop
- Handle edge case where dialog opens but user lacks permission

### Step 5: Update DriversSetupStep.tsx
- Apply same permission gating pattern
- Ensure setup wizard respects permissions

### Step 6: Update TransportPage.tsx
- Add explicit check for resource management in Resources panel access
- Show appropriate UI feedback for permission-limited users

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/usePermissions.ts` | Add `canManageTransportResources` permission |
| `src/components/transport/dispatch/ResourcesPanel.tsx` | Add permission check for Add Driver button |
| `src/components/transport/dispatch/AddDriverDialog.tsx` | Add permission awareness |
| `src/components/transport/setup/DriversSetupStep.tsx` | Add permission check |
| `src/pages/staff/TransportPage.tsx` | Pass permission state to ResourcesPanel |

**Database Migration Required**:
- Add RLS policy on `resort_memberships` for transport staff

---

## Technical Details

### Updated usePermissions.ts
```typescript
// Add to PermissionResult interface
canManageTransportResources: boolean;

// Add to return object
canManageTransportResources: superAdmin || 
  currentResortRole === 'RESORT_ADMIN' || 
  currentResortRole === 'MANAGER',
```

### Updated ResourcesPanel.tsx
```typescript
interface ResourcesPanelProps {
  buggies: BuggyRow[];
  drivers: DriverRow[];
  isLoading: boolean;
  resortId?: string;
  canManageDrivers?: boolean; // New prop
}

// In the component
{canManageDrivers && (
  <Button onClick={() => setShowAddDriver(true)}>
    <Plus className="h-4 w-4" />
  </Button>
)}
```

### RLS Policy Migration
```sql
-- Migration: Add transport staff view policy for resort_memberships
CREATE POLICY "transport_staff_view_memberships"
ON public.resort_memberships
FOR SELECT
TO authenticated
USING (
  public.staff_can_write_transport(auth.uid(), resort_id)
);
```

---

## Security Considerations

1. **No privilege escalation**: The new RLS policy only allows viewing memberships, not modifying them
2. **Respects existing role hierarchy**: Uses the already-audited `staff_can_write_transport` function
3. **Server-side enforcement**: All permissions are enforced via RLS and database functions, not just UI
4. **UI gating is defense-in-depth**: UI restrictions prevent accidental attempts, but database enforces actual security

---

## Testing Requirements

After implementation:
1. Log in as MANAGER role user
2. Navigate to /staff/transport
3. Open Resources panel (or mobile Resources tab)
4. Click "Add Driver" - dropdown should show eligible staff members
5. Successfully register a driver
6. Verify FRONT_OFFICE role CANNOT add drivers (should not see button)
7. Verify RESORT_ADMIN can still add drivers (existing functionality)

---

## Rollback Plan

If issues arise:
1. Remove the new RLS policy (single SQL statement)
2. Revert `usePermissions.ts` changes
3. Revert component changes
