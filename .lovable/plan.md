

## Phase 2: Module-First Access Management UI Shell

### Approach
Replace the current `UserAccessDrawer` content with a new module-first layout while keeping the old permission logic (hooks, mutations, data) intact underneath. The drawer becomes a polished, scannable admin experience.

### Architecture

**New components to create:**

1. **`src/components/access/ModuleAccessDrawer.tsx`** — New top-level drawer component that replaces `UserAccessDrawer` as the primary UI. Internally still uses the same hooks (`useUserRoles`, `useUserOverrides`, `usePermissionsCatalog`, `useModulePermissions`, `useUserAccessAudit`).

2. **`src/components/access/AccessIdentityHeader.tsx`** — Identity summary: avatar/initials, full name, username, role badge, resort name, access source chips (Inherited / Custom overrides / Mixed), count of customized modules.

3. **`src/components/access/AccessModeSelector.tsx`** — Two-mode toggle: "Use role defaults" (read-only summary) vs "Customize module access" (editable). Uses a simple radio group or segmented control.

4. **`src/components/access/ModuleAccessList.tsx`** — The core module grid. Renders `ModuleCategoryGroup[]` from `useModulePermissions`. Each category is a collapsible section. Each module row shows: icon, name, description, access pill (Full / Partial / None), inheritance badge (Inherited / Custom / Restricted), and a chevron for future expand/collapse.

5. **`src/components/access/ModuleAccessCard.tsx`** — Single module row/card: icon + label + description + access pill + inheritance state + expand placeholder.

6. **`src/components/access/ModuleAccessFilters.tsx`** — Search bar + quick filter chips (All, Enabled, Restricted, Customized, Sensitive). Uses existing `SearchInput` component.

### Data flow
- `ModuleAccessDrawer` receives the same props as current `UserAccessDrawer` (user, resortId, readOnly)
- Fetches `useUserRoles`, `useUserOverrides` for the target user
- Passes target user's effective permissions + override keys to `useModulePermissions(targetPermissions, overrideKeys)`
- Derives access mode: if overrides exist → "Customize", else → "Use role defaults"
- Filters modules by search query and active filter chip
- Audit tab preserved as-is from current drawer

### UI structure inside the Sheet
```text
┌─────────────────────────────────────┐
│ [Avatar] Full Name                  │
│ @username · Resort Admin · Resort X │
│ [Inherited] [3 customized modules]  │
├─────────────────────────────────────┤
│ ○ Use role defaults  ○ Customize    │
├─────────────────────────────────────┤
│ [Search modules...]                 │
│ [All] [Enabled] [Restricted] [Custom│
├─────────────────────────────────────┤
│ ▾ Guest Experience                  │
│   🌐 Guest Portal    [Full] Inherit │
│   👥 Guests & Stays  [Full] Inherit │
│   📋 Pre-Arrival     [Part] Custom  │
│   💬 Guest Requests  [None] Restric │
│ ▾ Operations                        │
│   🏊 Activities      [Full] Inherit │
│   🍽 Dining          [Full] Inherit │
│   ...                               │
│ ▾ Staff & Security                  │
│   ...                               │
│ ▾ Platform (Super Admin only)       │
│   ...                               │
├─────────────────────────────────────┤
│ [Audit Log] tab at bottom           │
└─────────────────────────────────────┘
```

### Tabs restructure
Replace the current 3-tab layout (Roles / Permissions / Audit) with:
- **Access** (default) — identity header + mode selector + module list (the new primary view)
- **Audit** — preserved as-is

The Roles tab content moves into the identity header area (current role shown as badge) and the mode selector (role defaults vs customize).

### Files to create
- `src/components/access/ModuleAccessDrawer.tsx`
- `src/components/access/AccessIdentityHeader.tsx`
- `src/components/access/AccessModeSelector.tsx`
- `src/components/access/ModuleAccessList.tsx`
- `src/components/access/ModuleAccessCard.tsx`
- `src/components/access/ModuleAccessFilters.tsx`

### Files to edit
- `src/pages/settings/AccessManagementPage.tsx` — swap `UserAccessDrawer` import to `ModuleAccessDrawer`
- `src/components/access/UserAccessDrawer.tsx` — keep file intact (not deleted), no longer primary

### Icon resolution
The `ModuleConfig.icon` field stores string names (e.g., `'Globe'`). Create a small icon resolver map in `ModuleAccessCard` that maps string → lucide component for the ~20 icons used.

### Access pills (reuse Badge)
- **Full** → `variant="success"` 
- **Partial** → `variant="warning"`
- **None** → `variant="secondary"`

### Inheritance badges
- **Inherited** → subtle/outline badge
- **Custom** → info badge
- **Restricted** → destructive-lite badge

### No DB changes needed
Pure frontend UI layer on top of existing data hooks.

