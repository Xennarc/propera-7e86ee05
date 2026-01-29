
## Goal
Fix the “Add Resort” button in the Super Admin Resort Management center (`/superadmin/resorts`) so it opens the resort creation flow, and make the creation + onboarding signals consistent with the newer features—without replacing existing functionality (additive only).

---

## What’s happening (root cause)
### Confirmed issue in code
In `src/pages/superadmin/ResortsManagementPage.tsx`, the “Add Resort” button is rendered without an `onClick` handler:

- Current code (approx. lines 200–203):
  - `<Button>`
  - “Add Resort”
  - `</Button>`

So clicking it literally triggers no action—no dialog, no navigation, no state update—hence “does nothing”.

This is separate from the older `src/pages/settings/ResortsPage.tsx` (Admin-only settings area). The Super Admin portal uses `ResortsManagementPage.tsx`, not `ResortsPage.tsx`.

---

## Implementation plan (minimal fix + additive improvements)

### Phase 1 — Fix the button so it actually opens the existing wizard (minimal, safe)
1. **Wire the Super Admin “Add Resort” button to open the existing `CreateResortDialog`.**
   - Update `src/pages/superadmin/ResortsManagementPage.tsx`:
     - Add state: `const [createDialogOpen, setCreateDialogOpen] = useState(false);`
     - Add `onClick={() => setCreateDialogOpen(true)}` on the “Add Resort” button.
     - Render `<CreateResortDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onSuccess={...} />`
     - `onSuccess` should:
       - call the existing `handleRefresh()` (invalidate queries + refetchResorts)
       - close the dialog (either in dialog’s internal flow or explicitly with `setCreateDialogOpen(false)`)

2. **Ensure the dialog is accessible in this page context.**
   - Import: `import { CreateResortDialog } from '@/components/resort/CreateResortDialog';`
   - Validate there are no route/layout constraints preventing modals (SuperAdminLayout uses standard page structure; dialogs should work).

3. **Add “Create Demo” alongside “Add Resort” (optional but small additive enhancement).**
   - This matches the existing admin Resorts settings page pattern and helps fast testing.
   - If a demo creation flow already exists for Super Admin routes (e.g., a demo dialog component), we reuse it; otherwise, defer to a later iteration.

---

### Phase 2 — Improve Super Admin resort creation UX (additive only, builds on current wizard)
The `CreateResortWizard` already exists and is a good baseline. We’ll extend it in a way that does not remove or break existing flows.

1. **Add a Super Admin-only “Plan & Mode” step (or embed into Review step)**
   - Add fields:
     - `subscription_tier` (ESSENTIAL / PROFESSIONAL / ELITE)
     - `is_demo` toggle + optional `demo_expires_at`
     - `status` default (ACTIVE)
   - This is especially relevant for Super Admins, and consistent with the Resort Management table filters.

2. **Expose “Quick Start defaults” toggles in the wizard**
   - Examples (all optional):
     - “Enable Pre-Arrival with sensible defaults”
     - “Create example Activity + Session”
     - “Create example Restaurant + Slots”
   - If there are existing backend functions for provisioning these defaults, use them.
   - If not, we can add them later; for now, keep it additive and do not block resort creation.

3. **Post-create success state improvements**
   - After resort + admin are created:
     - Present prominent actions:
       - “Open Onboarding”
       - “Open Branding”
       - “Open Pre-Arrival”
       - “Switch to resort (Staff Console)”
     - This leverages existing routes already used elsewhere.

---

### Phase 3 — Improve “Incomplete setup” signals in Super Admin Resort Management (align with newer onboarding)
Right now, `ResortsManagementPage.tsx` computes “setup” progress using only live-count checks:
- activities, sessions, restaurants, slots, prearrival enabled

But the onboarding system now includes additional flags:
- branding
- prearrival
- portal sharing step
…and the resorts table has onboarding flags used by `ResortOnboardingPage.tsx`:
- `onboarding_basics_done`, `onboarding_activities_done`, `onboarding_restaurants_done`, `onboarding_staff_done`, `onboarding_branding_done`, `onboarding_prearrival_done`, `onboarding_portal_done`

1. **Update resort metrics computation to include new onboarding checks.**
   - Preferred: read the onboarding flags from `resorts` for each resort and use those for setup percent (fast and consistent).
   - Keep the existing live-count checks as supporting signals, but the main progress should align with onboarding steps.

2. **Revise setup progress bar calculation**
   - Move from 5-step percent to 7-step percent (matching `ResortOnboardingPage`).
   - Update “Incomplete Setup” stat count accordingly.

3. **Add quick actions for incomplete resorts**
   - From each resort row actions menu or settings drawer:
     - “Open Onboarding”
     - “Open Branding”
     - “Open Pre-Arrival”
   - This is additive and helps Super Admins drive completion quickly.

---

## Files to inspect/change
### Must change
- `src/pages/superadmin/ResortsManagementPage.tsx`
  - Add `onClick` to the Add Resort button
  - Add dialog open state + render `CreateResortDialog`

### Likely change (additive UX upgrades)
- `src/components/resort/CreateResortWizard.tsx`
- `src/components/resort/steps/ReviewStep.tsx`
- Potentially add a new step file:
  - `src/components/resort/steps/PlanAndModeStep.tsx` (only if we decide to add a dedicated step)

### Metrics alignment (onboarding improvements)
- `src/pages/superadmin/ResortsManagementPage.tsx` (metrics query)
- Possibly shared helper for setup progress computation (optional; only if needed)

---

## Troubleshooting / validation checklist (what we’ll verify after changes)
1. Navigate to `/superadmin/resorts`
2. Click “Add Resort”
3. Confirm the create resort dialog opens
4. Complete wizard flow and create a resort
5. Confirm:
   - The resorts table refreshes and shows the new resort
   - “Incomplete setup” metrics update
   - No console errors (especially hook order / dialog portal issues)

---

## Risk & rollout notes
- The core fix is minimal and low risk: it only attaches an action to an existing button and uses an existing dialog/wizard.
- Enhancements are additive: we will not remove the existing wizard or alter existing routes; we only extend the wizard for Super Admin needs and improve setup progress calculation alignment.
