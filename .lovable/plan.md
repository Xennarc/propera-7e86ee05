

## Phase 4: Sensitive Permission Separation and Safety Rails

### What exists today
- Modules already have `isSensitive` and `isPlatformOnly` flags in `permission-modules.ts`
- `ModuleAccessCard` has tier selectors and advanced toggles but no confirmation dialogs or warning styling
- Billing, Integrations, Staff & Access, Admin/Security, and Danger Zone are already flagged as sensitive or platform-only
- No change impact summary exists — mutations fire immediately on toggle/select

### Plan

#### 1. Visual separation of sensitive modules (`ModuleAccessCard.tsx`)

- Add warning styling to cards where `isSensitive === true`: amber/yellow left border, warning icon overlay, subtle background tint
- For `isPlatformOnly` modules: red/destructive border styling
- Add a small warning caption below the module description for sensitive modules (e.g., "This module controls security-critical settings")

#### 2. Confirmation dialog for sensitive permission changes (`SensitivePermissionConfirmDialog.tsx` — new)

Create a reusable confirmation dialog component:
- Shows when enabling/changing a sensitive permission or tier
- Plain-English impact warning (e.g., "You are about to grant 'Remove staff members'. This allows the user to permanently remove team members from the resort.")
- Requires explicit "Confirm" click to proceed
- Uses `AlertDialog` from shadcn

#### 3. Wire confirmation into `ModuleAccessCard.tsx`

- Before calling `setOverride.mutate()` or tier change for sensitive modules, show the confirmation dialog
- Store pending change in local state, only execute after dialog confirmation
- Non-sensitive modules continue to apply immediately (no UX regression)

#### 4. Authority blocking (`ModuleAccessCard.tsx`)

- When `canGrant` is false, show a clear "Insufficient authority" message instead of just disabling
- If a Resort Admin tries to interact with a platform-only module (shouldn't be visible, but defense-in-depth): show a blocked state with explanation

#### 5. Change impact summary (`ChangeImpactSummary.tsx` — new)

Create a compact summary component shown at the bottom of the Access tab (above save/close):
- Tracks pending changes during the session using local state in `ModuleAccessDrawer`
- Displays a collapsible summary like:
  - "Activities: View Only → Manage"
  - "Staff: inherited → custom"
  - "Reset Passwords: enabled"
  - "Sensitive permission changes: 1"
- Since mutations currently fire immediately (no batch save), this will be an **audit-style live summary** of changes made in this session, not a pre-save preview
- Tracks changes by listening to mutation success callbacks

#### 6. Update module categories for clearer sensitive separation (`permission-modules.ts`)

- Move Billing and Integrations from `Staff & Security` category to a new `Admin & Configuration` category
- Mark Integrations as `isSensitive: true` (currently false)
- Reorder `MODULE_CATEGORIES` to: Guest Experience → Operations → Admin & Configuration → Staff & Security → Platform

### Files to create
- `src/components/access/SensitivePermissionConfirmDialog.tsx`
- `src/components/access/ChangeImpactSummary.tsx`

### Files to edit
- `src/config/permission-modules.ts` — add `Admin & Configuration` category, move Billing/Integrations, mark Integrations sensitive, add `warningText` field to sensitive modules
- `src/components/access/ModuleAccessCard.tsx` — warning styling for sensitive modules, wire confirmation dialog, authority blocking message
- `src/components/access/ModuleAccessDrawer.tsx` — track session changes for impact summary, render `ChangeImpactSummary`

### No DB changes needed

