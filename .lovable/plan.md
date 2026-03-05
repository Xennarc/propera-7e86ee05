

## Phase 1: Module-First Permission Grouping Foundation

### What exists today
- 68 atomic permissions in the `permissions` table across 12 categories (Identity & Access, Resort Settings, Guests & Stays, Pre-arrival, Activities, Dining, Guest Portal, Loyalty, Messaging, Reports, Billing, Integrations, Danger Zone)
- `UserAccessDrawer` renders permissions grouped by DB `category` — a flat list with no module abstraction
- Access page gate: `canManage` = superAdmin OR `access.users.edit`; view gate = `access.users.view` — too permissive for "Edit Access" drawer
- No server-side RPC gate on who can modify permissions of others

### Plan

#### 1. Create module permission mapping config (`src/config/permission-modules.ts`)

A pure TypeScript config — no DB changes. Maps the 68 existing permission keys into ~16 Propera modules:

| Module | Permission keys mapped |
|---|---|
| Guest Portal Management | `portal.*`, `settings.branding.edit`, `settings.public_links.manage` |
| Activities | `activities.*`, `sessions.*`, `bookings.activity.*` |
| Watersports | (alias subset of Activities — same keys, UI label only) |
| Excursions | (alias subset of Activities — same keys, UI label only) |
| Dining / In-Villa Dining | `restaurants.*`, `slots.*`, `bookings.restaurant.*` |
| Guests & Stays | `guests.*` |
| Pre-Arrival | `prearrival.*`, `settings.prearrival.manage` |
| Guest Requests | `requests.*` |
| Transport / Buggy | (no permissions yet → empty, placeholder) |
| Housekeeping | (no permissions yet → empty, placeholder) |
| Staff & Access | `access.users.*` (except `assign_superadmin`), `access.roles.*`, `access.permissions.*` |
| Analytics | `reports.*` |
| Resort Settings | `settings.resort.*`, `settings.pricing.*`, `settings.directory.manage` |
| Billing | `billing.*` |
| Integrations | `integrations.*` |
| Loyalty | `loyalty.*` |
| Messaging | `notifications.send` |
| Admin / Security | `access.users.assign_superadmin` |
| Danger Zone | `system.demo.convert`, `system.resort.delete` |

Each module entry has: `id`, `label`, `description`, `icon` (lucide component name), `permissionKeys[]`, `isSensitive`, `isPlatformOnly` (only visible to Super Admin), `category` (for grouping modules in UI).

Permissions that don't match any module go into an auto-generated "Other" bucket.

#### 2. Module helper functions (same file)

```typescript
getModuleForPermission(key: string): ModuleConfig | null
getModulesForPermissions(keys: string[]): ModuleConfig[]
getEffectiveModuleAccess(userPermissions: string[], moduleId: string): 'full' | 'partial' | 'none'
isInheritedOrCustomized(userPermissions, rolePermissions, moduleId): 'inherited' | 'customized'
containsSensitivePermissions(moduleId): boolean
canAdminGrantModule(adminPermissions: string[], moduleId: string): boolean
getVisibleModules(isSuperAdmin: boolean): ModuleConfig[]
```

#### 3. Restrict "Edit Access" to Resort Admin+ (`AccessManagementPage.tsx` + `UserAccessDrawer`)

- Change the "Edit Access" dropdown item visibility: only show when user is `superAdmin` OR has `access.permissions.manage`
- In `UserAccessDrawer`, add an early guard: if the acting user lacks `access.permissions.manage` and is not superAdmin, render a read-only view (no toggle buttons)
- Hide Danger Zone and Admin/Security modules from non-Super-Admins in the permissions tab

#### 4. Create `useModulePermissions` hook (`src/hooks/useModulePermissions.ts`)

Wraps `useEffectivePermissions` + the module config to provide:
- `modules`: grouped permission data for current user
- `getModuleAccess(moduleId)`: full/partial/none
- `visibleModules`: filtered by acting admin's authority level
- Consumed by the drawer in Phase 2 (but usable now for any component)

### Files to create
- `src/config/permission-modules.ts` — module mapping config + helpers

### Files to create  
- `src/hooks/useModulePermissions.ts` — hook wrapping module config with effective permissions

### Files to edit
- `src/pages/settings/AccessManagementPage.tsx` — restrict "Edit Access" dropdown to Resort Admin+ / `access.permissions.manage`
- `src/components/access/UserAccessDrawer.tsx` — hide Danger Zone / platform-only modules from non-Super-Admins; read-only mode for non-admins

### No DB changes needed
All permission data already exists. This is a pure frontend mapping + access restriction layer.

