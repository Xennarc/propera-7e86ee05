

## Admin Navigation Cleanup

### Current State (Sidebar Admin Section)
The sidebar has 5 items under Admin:
1. **Resort Staff** (`/staff/settings/resort-staff`) — 675-line page with staff list, invitations, profile editing
2. **Pre-Arrival Settings** (`/staff/settings/prearrival`) — duplicated in Settings page
3. **Branding** (`/staff/settings/branding`) — duplicated in Settings page
4. **Settings** (`/staff/settings`) — hub page with cards linking to all settings
5. **Access Control** (`/staff/settings/access`) — 562-line page with staff list, invitations, RBAC drawer

### Redundancies Found
1. **Resort Staff ≈ Access Control**: Both pages show staff members, pending invitations, invitation history, invite/create account actions. Access Control is the newer, more modern version with RBAC permission drawer. Resort Staff has profile editing. These should be merged.
2. **Pre-Arrival Settings & Branding**: Already linked from the Settings hub page. Having them in the sidebar is redundant — they're sub-settings, not top-level admin actions.

### Plan

#### 1. Simplify sidebar Admin to 2 items
```
Admin
  ├── Access Control  (Shield icon) — merged staff + access management
  └── Settings        (SlidersHorizontal icon) — hub for all config
```

Remove from sidebar: Resort Staff, Pre-Arrival Settings, Branding. All remain accessible via the Settings hub page cards.

#### 2. Merge Resort Staff features into Access Control (`AccessManagementPage.tsx`)
The Access Control page already has: staff list, pending invites, invite history, RBAC drawer. Missing from Resort Staff:
- **Profile edit** (name, username editing) — add an "Edit Profile" option to the staff card dropdown
- **Profile view dialog** — add a "View Profile" option
- **Remove member** action — add to dropdown

Import `StaffProfileEditDialog` and `StaffProfileViewDialog` into AccessManagementPage and wire them into the existing dropdown menu.

#### 3. Ensure Settings page has complete coverage
Current Settings hub groups and items — verify all feature settings are covered:

| Setting | In Settings Hub? | Has Page? | Status |
|---|---|---|---|
| Pre-Arrival | Yes | Yes | OK |
| Branding | Yes | Yes | OK |
| Guest Portal Links | Yes | Yes | OK |
| Modules | Yes | Yes | OK |
| Guest Requests | Yes | Yes | OK |
| Resort Directory | Yes | Yes | OK |
| Pricing & Taxes | Yes | Yes | OK |
| Resources | Yes | Yes | OK |
| Booking Health | Yes | Yes | OK |
| Resort Staff | Yes | Yes → will redirect to Access Control | Needs update |
| Guest Import | Yes | Yes | OK |
| Transport Settings | No | Yes (`/staff/transport/settings`) | **Missing from hub** |
| Loyalty Program | No | Yes (`/staff/loyalty/program`) | Already in Loyalty nav group |

**Transport Settings** should be added to the Settings hub under Operations.

#### 4. Update Settings hub "Resort Staff" card to link to Access Control
Change the Staff & Access section's "Resort Staff" card href from `/staff/settings/resort-staff` to `/staff/settings/access` and rename to "Access Control".

#### 5. Keep ResortStaffPage route but add redirect
Add a redirect from `/staff/settings/resort-staff` to `/staff/settings/access` so existing bookmarks work. Or keep the route but it becomes secondary.

### Files to Edit
- **`src/components/staff/StaffSidebar.tsx`** — Remove Pre-Arrival Settings, Branding, Resort Staff from adminGroup items. Keep only Access Control + Settings.
- **`src/pages/settings/AccessManagementPage.tsx`** — Add profile edit/view dialogs and remove member action from staff card dropdown (features from ResortStaffPage).
- **`src/pages/settings/SettingsPage.tsx`** — Update "Resort Staff" card to point to Access Control. Add Transport Settings card under Operations.
- **`src/App.tsx`** — Add redirect from `/staff/settings/resort-staff` to `/staff/settings/access`.

