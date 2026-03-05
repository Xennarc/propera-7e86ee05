

## Phase 3: Module Access Controls and Expandable Overrides

### Current state
- `ModuleAccessCard` is a static row showing access pill + inheritance badge + a non-functional chevron
- `ModuleAccessDrawer` passes `readOnly` but has no mutation wiring
- Existing mutation hooks (`useSetPermissionOverride`, `useRemovePermissionOverride`) work via RPCs and are fully functional in the legacy `UserAccessDrawer`
- Each module's `permissionKeys[]` maps to DB `permissions` rows that have `key`, `label`, `description`

### Architecture

#### 1. Add access level tiers to module config (`permission-modules.ts`)

Add an `accessLevels` definition per module that maps tier names to permission key subsets:

```typescript
export interface ModuleAccessLevel {
  id: 'none' | 'view' | 'operate' | 'admin';
  label: string;
  description: string;  // plain-English preview
  permissionKeys: string[];  // keys granted at this level (cumulative)
}
```

Each module gets an `accessLevels` array. Example for Activities:
- **No Access** → `[]`
- **View Only** → `['activities.view', 'sessions.view', 'bookings.activity.view']`
- **Operate** → above + `['activities.create', 'activities.edit', 'sessions.create', 'sessions.edit', 'bookings.activity.create', 'bookings.activity.edit']`
- **Admin** → all keys including `*.delete`, `*.cancel`

Add a helper `getEffectiveAccessLevel(userPerms, moduleId)` that returns which tier best matches the user's current permissions.

#### 2. Add human-readable per-permission labels (`permission-modules.ts`)

Add a `permissionLabels` map per module for the advanced section:

```typescript
permissionLabels: {
  'activities.view': 'View activities',
  'activities.create': 'Create and edit activities',
  // ...
}
```

This avoids a DB round-trip just to show labels in the expanded section.

#### 3. Rewrite `ModuleAccessCard` as expandable

Transform from a static row to a collapsible card:
- **Collapsed** (default): icon, name, description, access level selector (Select dropdown: No Access / View / Operate / Admin), inheritance badge, override count chip ("2 overrides"), expand chevron
- **Expanded**: Shows the advanced granular permission list inside the card. Each permission is a row with: label, description, and a 3-state toggle (Inherited / Grant / Deny) using the existing `useSetPermissionOverride` / `useRemovePermissionOverride` mutations
- When `readOnly` or `!canGrant`, the selector and toggles are disabled

#### 4. Wire mutations into `ModuleAccessDrawer`

- Pass `userId` and `resortId` down to `ModuleAccessCard` via props or context
- When the admin selects a module-level tier:
  - Compute the diff between current overrides and the target tier's permission set
  - Call `set_permission_override` for each key that needs granting/revoking
  - Call `remove_permission_override` for keys that should return to role default
- When an individual permission is toggled in advanced mode, call the single override mutation
- Invalidate queries on success (already handled by the mutation hooks)

#### 5. Show customization state

- If zero overrides in the module → badge: "Inherited"
- If overrides exist → badge: "Custom" + count chip: "3 overrides"
- If overrides make access more restrictive than role default → badge includes "Restricted" variant
- If overrides elevate beyond role default → badge: "Elevated"

Determine this by comparing target user's role-only permissions (from `useRolePermissions` of their assigned role) against effective permissions. New helper: `getModuleCustomizationState(rolePerms, effectivePerms, overrideKeys, moduleId)` returns `'inherited' | 'customized' | 'restricted' | 'elevated'`.

### Files to create
- None (all changes are to existing files)

### Files to edit

1. **`src/config/permission-modules.ts`**
   - Add `accessLevels` and `permissionLabels` to `ModuleConfig` interface
   - Define access level tiers for each module
   - Add `getEffectiveAccessLevel()` and `getModuleCustomizationState()` helpers

2. **`src/components/access/ModuleAccessCard.tsx`**
   - Rewrite as a `Collapsible` with expanded advanced section
   - Add access level `Select` dropdown (No Access / View / Operate / Admin)
   - Add per-permission toggle rows in expanded state
   - Accept `userId`, `resortId`, `rolePermissions`, `userOverrides` props
   - Wire `useSetPermissionOverride` and `useRemovePermissionOverride`
   - Show override count chip

3. **`src/components/access/ModuleAccessList.tsx`**
   - Pass through new props (userId, resortId, rolePermissions, userOverrides) to each card

4. **`src/components/access/ModuleAccessDrawer.tsx`**
   - Fetch role permissions for the target user's primary role via `useRolePermissions`
   - Pass rolePermissions and userOverrides down to `ModuleAccessList`
   - Invalidate `target-effective-permissions` query key on override changes

5. **`src/hooks/useModulePermissions.ts`**
   - Update `ModuleAccessState` to include `customizationState` and `overrideCount`

### No DB changes needed
All mutations use existing RPCs (`set_permission_override`, `remove_permission_override`).

