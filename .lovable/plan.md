
# Staff Portal Admin UI Refinement - Premium, Safe, and Clear

## Executive Summary

This plan transforms the Staff Portal Settings & Admin pages into a calm, organized, and confidence-inspiring experience. The goal is to make admins feel **powerful but safe** — able to find settings quickly, understand their impact, and execute changes without fear of accidental damage.

---

## Current State Analysis

### Settings Hub (`SettingsPage.tsx`)
- **Issue**: Flat grid of 13+ cards with no grouping — overwhelming for non-technical users
- **Issue**: No visual distinction between routine settings and dangerous operations
- **Issue**: Same card style for everything — no hierarchy

### Individual Settings Pages (Prearrival, Branding, Requests, Staff, etc.)
- **Issue**: Long scrolling forms without clear section boundaries
- **Issue**: Destructive actions (delete, remove) styled same as routine buttons
- **Issue**: No confirmation patterns for high-impact changes
- **Issue**: Mobile views are cramped, requiring horizontal scrolling on some tables

### Access & Permissions (UserManagementPage, ResortStaffPage, etc.)
- **Issue**: Small cards for user management — hard to scan at volume
- **Issue**: Role changes lack proper warning for escalation
- **Issue**: Delete membership buttons are prominent and easy to misclick

---

## Design Principles for Admin UI

| Principle | Implementation |
|-----------|----------------|
| **Group by domain** | Settings organized into: Resort, Staff, Configuration, System |
| **Read before edit** | Show current state clearly before allowing changes |
| **Separate danger zones** | Destructive actions in visually distinct sections |
| **Confirm thoughtfully** | Proportional confirmation based on impact |
| **Mobile = accordions** | Convert multi-section pages to collapsible accordions on small screens |

---

## Implementation Plan

### Phase 1: Settings Hub Reorganization

**File: `src/pages/settings/SettingsPage.tsx`**

Transform the flat grid into **grouped sections** with headers and descriptions:

```
┌─────────────────────────────────────────────────────────────────┐
│  Settings                                                       │
│  Configure your resort operations                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  GUEST EXPERIENCE                                               │
│  Configure how guests interact with your resort                 │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ │
│  │ Pre-Arrival      │ │ Guest Portal     │ │ Guest Portal     │ │
│  │ Settings         │ │ Branding         │ │ Links            │ │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘ │
│                                                                 │
│  OPERATIONS                                                     │
│  Manage day-to-day operational settings                         │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ │
│  │ Guest Requests   │ │ Resort Directory │ │ Pricing & Taxes  │ │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘ │
│                                                                 │
│  STAFF & ACCESS                                                 │
│  Manage your team                                               │
│  ┌──────────────────┐ ┌──────────────────┐                      │
│  │ Resort Staff     │ │ Platform Users   │                      │
│  │                  │ │ (Super Admin)    │                      │
│  └──────────────────┘ └──────────────────┘                      │
│                                                                 │
│  SYSTEM (Super Admin only)                                      │
│  Platform-wide configuration                                    │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ │
│  │ Resorts          │ │ Subscription     │ │ Booking Health   │ │
│  │                  │ │ Tiers            │ │                  │ │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Changes:**
1. Add `SettingsSection` component to group cards by domain
2. Add section headers with icons and descriptions
3. Reduce card density — remove redundant "Manage X" buttons, make entire card clickable
4. Add subtle background wash to different sections for visual grouping
5. Super Admin sections get a distinctive border/badge

### Phase 2: New Shared Components

**File: `src/components/admin/SettingsSection.tsx`** (NEW)

Reusable section component for grouping settings:

```tsx
interface SettingsSectionProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: 'admin' | 'super-admin';
  children: ReactNode;
  collapsible?: boolean; // For mobile accordion behavior
}
```

Features:
- Mobile: Renders as `Collapsible` accordion
- Desktop: Static open section with header
- Badges for role-restricted sections

**File: `src/components/admin/SettingsCard.tsx`** (NEW)

Simplified settings navigation card:

```tsx
interface SettingsCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  feature?: TierFeature;
  disabled?: boolean;
  badge?: React.ReactNode;
}
```

Features:
- Entire card is clickable (not nested button)
- Disabled state with tooltip explanation
- Tier badge integration
- Hover animation (subtle lift)

**File: `src/components/admin/DangerZone.tsx`** (NEW)

Dedicated component for destructive actions:

```tsx
interface DangerZoneProps {
  title?: string; // Default: "Danger Zone"
  description?: string;
  children: ReactNode;
}
```

Features:
- Red/destructive border accent
- Warning icon
- Collapsed by default on mobile
- Requires explicit expansion to access destructive buttons

### Phase 3: Form Page Improvements

**File: `src/pages/settings/PrearrivalSettingsPage.tsx`**

Improvements:
1. Add sticky save button at bottom on mobile (use `MobileActionBar`)
2. Wrap form sections in `Accordion` on mobile (< sm breakpoint)
3. Increase spacing between cards (`space-y-6` → `space-y-8`)
4. Add section dividers with labels

**File: `src/pages/settings/ResortBrandingPage.tsx`**

Improvements:
1. Already has good tab structure — enhance mobile tab layout
2. Add "Reset to Defaults" to a dedicated danger zone at bottom
3. Improve color picker touch targets

**File: `src/pages/settings/RequestsSettingsPage.tsx`**

Improvements:
1. Already uses tabs — ensure touch targets are 44px+
2. Tab labels should show on mobile (currently hidden with `hidden sm:inline`)

### Phase 4: Staff Management UI Refinements

**File: `src/pages/settings/ResortStaffPage.tsx`**

Changes:
1. Convert card grid to a cleaner list layout on desktop
2. Add role-based grouping option (Group by Role toggle)
3. Increase action button spacing to prevent misclicks
4. Delete confirmation should require typing staff name
5. Add visual distinction for "yourself" row (subtle highlight)

Before (Current):
```
┌──────────────────────────────────────┐
│ [Avatar] John Doe       [View][Edit] │
│          @johndoe       [Key][Delete]│
│          Resort Admin                │
└──────────────────────────────────────┘
```

After (Improved):
```
┌──────────────────────────────────────────────────────────────┐
│ [Avatar] John Doe                              Resort Admin  │
│          @johndoe • Front Office                             │
│          ─────────────────────────────────────────────────── │
│                        [View Profile]  [Edit Access]  [...] │
└──────────────────────────────────────────────────────────────┘
```

**File: `src/pages/settings/UserManagementPage.tsx`**

Changes:
1. Add warning banner for Super Admin role assignment
2. Super Admin changes require confirmation dialog
3. Add "Last login" metadata for user insights
4. Improve search to include username

### Phase 5: Resorts Management Refinements

**File: `src/pages/settings/ResortsPage.tsx`**

Changes:
1. Add status filter chips (Active/Inactive/Demo)
2. Demo resorts should have a distinct visual style (dashed border, muted background)
3. Delete resort should require typing resort code to confirm
4. Move "Create Demo" to a less prominent position (dropdown or secondary row)

### Phase 6: Mobile Accordion Pattern

For pages with multiple form sections, implement accordion behavior on mobile:

**Files affected:**
- `PrearrivalSettingsPage.tsx`
- `ResortBrandingPage.tsx` (already has tabs, may not need)
- `ResortStaffPage.tsx` (user cards → list with expand)

Pattern:
```tsx
// Mobile: Accordion
<Accordion type="single" collapsible className="sm:hidden">
  <AccordionItem value="section-1">
    <AccordionTrigger>Portal Settings</AccordionTrigger>
    <AccordionContent>
      {/* Form fields */}
    </AccordionContent>
  </AccordionItem>
</Accordion>

// Desktop: Regular cards
<div className="hidden sm:block space-y-6">
  <Card>...</Card>
  <Card>...</Card>
</div>
```

### Phase 7: Confirmation Dialog Improvements

**File: `src/components/ui/confirmation-dialog.tsx`**

Already exists with variants. Enhance with:
1. Add `requireTyping` prop for high-impact actions
2. Add `countdown` prop (3-second delay before confirm is enabled)
3. Improve icon/color associations

**New variant: `critical`**
```tsx
variant: 'critical', // Red background on confirm button, requires typing
```

Usage for:
- Delete resort
- Remove Super Admin
- Delete staff member
- Purge data

---

## Files to Modify

### Core Settings Hub
| File | Change Type |
|------|-------------|
| `src/pages/settings/SettingsPage.tsx` | Major refactor — grouped sections |

### New Components
| File | Purpose |
|------|---------|
| `src/components/admin/SettingsSection.tsx` | Section grouping with collapsible mobile |
| `src/components/admin/SettingsCard.tsx` | Simplified navigation card |
| `src/components/admin/DangerZone.tsx` | Container for destructive actions |
| `src/components/admin/index.ts` | Export barrel |

### Settings Pages
| File | Change Type |
|------|-------------|
| `src/pages/settings/PrearrivalSettingsPage.tsx` | Mobile accordion, sticky save |
| `src/pages/settings/ResortBrandingPage.tsx` | Reset button to danger zone |
| `src/pages/settings/RequestsSettingsPage.tsx` | Mobile tab label improvements |
| `src/pages/settings/ResortStaffPage.tsx` | List layout, better actions |
| `src/pages/settings/UserManagementPage.tsx` | Super Admin warnings |
| `src/pages/settings/ResortsPage.tsx` | Status filters, safer delete |

### UI Components
| File | Change Type |
|------|-------------|
| `src/components/ui/confirmation-dialog.tsx` | Add `requireTyping` prop |

---

## Visual Design Specifications

### Section Groupings
```css
.settings-section {
  @apply space-y-4 pb-8;
}

.settings-section-header {
  @apply flex items-center gap-3 mb-4;
}

.settings-section-title {
  @apply text-lg font-semibold text-foreground;
}

.settings-section-description {
  @apply text-sm text-muted-foreground;
}
```

### Danger Zone Styling
```css
.danger-zone {
  @apply border-l-4 border-destructive/50 bg-destructive/5 rounded-lg p-4 mt-8;
}

.danger-zone-title {
  @apply flex items-center gap-2 text-destructive font-semibold mb-2;
}
```

### Admin Badge Variations
```css
.admin-badge {
  @apply text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded;
}

.admin-badge--super-admin {
  @apply bg-destructive/10 text-destructive border border-destructive/20;
}

.admin-badge--admin {
  @apply bg-primary/10 text-primary border border-primary/20;
}
```

---

## Mobile Optimization Summary

| Pattern | When to Use |
|---------|-------------|
| **Accordion sections** | Forms with 3+ cards/sections |
| **Tabs** | Already used in Branding, Requests — keep but optimize |
| **Sticky action bar** | Forms with single primary save action |
| **Bottom sheet for edit** | Staff member edit, role change dialogs |
| **Full-width cards** | User list, resort list on mobile |

---

## Safety & Confirmation Levels

| Action | Confirmation Level |
|--------|-------------------|
| Save settings | None (reversible) |
| Remove staff from resort | Simple confirm dialog |
| Change own role | Warning + confirm |
| Delete staff account | Confirm + type name |
| Grant Super Admin | Dedicated dialog with warning |
| Revoke Super Admin | Confirm + type name |
| Delete resort | Critical dialog + type code |

---

## Accessibility Considerations

| Requirement | Implementation |
|-------------|----------------|
| Section headers | Semantic `h2` for section titles, `h3` for card titles |
| Focus management | Return focus after dialog close |
| Screen reader | Announce role changes, destructive action warnings |
| Touch targets | All buttons 44px+ minimum |
| Keyboard navigation | Tab order through sections, Escape to close |

---

## Implementation Phases

### Phase 1: Foundation (Create new components)
1. Create `SettingsSection` component
2. Create `SettingsCard` component  
3. Create `DangerZone` component
4. Create export barrel

### Phase 2: Settings Hub Transformation
5. Refactor `SettingsPage.tsx` with grouped sections
6. Implement mobile accordion behavior

### Phase 3: Staff Management Polish
7. Improve `ResortStaffPage.tsx` layout
8. Add warnings to `UserManagementPage.tsx`
9. Enhance confirmation dialogs

### Phase 4: Form Pages Mobile Optimization
10. Add accordions to `PrearrivalSettingsPage.tsx`
11. Improve mobile tabs in `RequestsSettingsPage.tsx`
12. Add sticky save buttons where needed

### Phase 5: Safety Enhancements
13. Add `requireTyping` to confirmation dialog
14. Implement critical confirmations for resort delete
15. Add danger zones to relevant pages

---

## Summary

This refinement transforms the admin experience from a flat, overwhelming list of options into a structured, confident interface where:

1. **Settings are discoverable** — grouped by domain with clear descriptions
2. **Mobile is usable** — accordions, sticky actions, no cramped tables
3. **Destructive actions are safe** — visually separated, properly confirmed
4. **Hierarchy is clear** — Super Admin sections are distinct from resort settings
5. **Non-technical users feel confident** — plain language, helpful descriptions, reversible where possible

The changes are purely visual and interaction-layer — no business logic, permissions, or data persistence will be modified.
