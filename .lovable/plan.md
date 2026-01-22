
# Fix Demo Request Seeding & Add Icon Picker for Request Catalog

## Issues Identified

### Issue 1: Sample Request Notes Mismatch
The seeding functions (`provision-demo` and `demo-reset`) use hardcoded notes that don't match the actual request types:
- **Minibar**: "Could we get 2 bottles please?" - Too generic, should match the item title
- **Housekeeping**: "Thank you!" - Not descriptive of the request
- **Engineering**: "The bathroom light was flickering" - Only valid for lighting issues

### Issue 2: Missing Icon Picker in Staff Portal
When admins create new catalog items, the `icon_key` is always set to `null`. There's no UI to select an icon, even though the database supports it and icons are already defined for seeded items.

## Solution Overview

### Part 1: Context-Aware Sample Request Notes
Update both seeding functions to use notes that match the catalog item being requested:

| Item Type | Current Note | Improved Note |
|-----------|--------------|---------------|
| Minibar Refill | "Could we get 2 bottles please?" | "Could we get 2 bottles of sparkling water please?" |
| Water Bottles | "Could we get 2 bottles please?" | "2 bottles of still water please" |
| Dental Kit | "Thank you!" | "Thank you!" (keep - fits as a polite request) |
| AC Issue | "The bathroom light was flickering" | "The AC seems to be making a strange noise" |
| Lighting Issue | "The bathroom light was flickering" | "The bathroom light is flickering" |

Create a helper function that maps item codes/titles to appropriate sample notes.

### Part 2: Add Icon Picker to Request Catalog Admin

Create a new `RequestIconPicker` component tailored for service requests with hospitality-relevant icons:

**Icon Categories:**
- **Housekeeping**: Sparkles, Brush, Droplets, Bath, Bed, Moon
- **Minibar**: Wine, Coffee, Droplets, Cookie
- **Maintenance**: Wrench, Thermometer, Lightbulb, Droplet
- **Amenities**: Package, Shirt, Scissors, Cloud, Layers
- **Other**: MessageCircle, HelpCircle

## Technical Changes

### File 1: Create Request Icon Configuration
**New file:** `src/lib/request-icons.tsx`

```typescript
// Define hospitality-specific icons for service requests
export interface RequestIconOption {
  key: string;
  label: string;
  icon: LucideIcon;
  category: string;
}

export const requestIconOptions: RequestIconOption[] = [
  // Housekeeping
  { key: 'sparkles', label: 'Sparkles', icon: Sparkles, category: 'Housekeeping' },
  { key: 'bath', label: 'Bath/Towels', icon: Bath, category: 'Housekeeping' },
  { key: 'bed', label: 'Bed/Linens', icon: Bed, category: 'Housekeeping' },
  { key: 'moon', label: 'Turndown', icon: Moon, category: 'Housekeeping' },
  // Minibar
  { key: 'wine', label: 'Wine/Drinks', icon: Wine, category: 'Minibar' },
  { key: 'coffee', label: 'Coffee', icon: Coffee, category: 'Minibar' },
  { key: 'droplet', label: 'Water', icon: Droplet, category: 'Minibar' },
  { key: 'cookie', label: 'Snacks', icon: Cookie, category: 'Minibar' },
  // Maintenance
  { key: 'wrench', label: 'Repair', icon: Wrench, category: 'Maintenance' },
  { key: 'thermometer', label: 'Temperature', icon: Thermometer, category: 'Maintenance' },
  { key: 'lightbulb', label: 'Lighting', icon: Lightbulb, category: 'Maintenance' },
  // Amenities
  { key: 'package', label: 'Package', icon: Package, category: 'Amenities' },
  { key: 'shirt', label: 'Clothing', icon: Shirt, category: 'Amenities' },
  { key: 'scissors', label: 'Razor/Kit', icon: Scissors, category: 'Amenities' },
  { key: 'cloud', label: 'Pillows', icon: Cloud, category: 'Amenities' },
  { key: 'layers', label: 'Blankets', icon: Layers, category: 'Amenities' },
  { key: 'footprints', label: 'Slippers', icon: Footprints, category: 'Amenities' },
  // Other
  { key: 'message-circle', label: 'Message', icon: MessageCircle, category: 'Other' },
  { key: 'help-circle', label: 'Help', icon: HelpCircle, category: 'Other' },
];

export function getRequestIcon(key: string | null): LucideIcon;
export function getRequestIconsByCategory(): Record<string, RequestIconOption[]>;
```

### File 2: Create Request Icon Picker Component
**New file:** `src/components/ui/request-icon-picker.tsx`

Similar structure to `ActivityIconPicker` but using request-specific icons:
- Popover-based icon grid
- Categorized by request type (Housekeeping, Minibar, etc.)
- "Use category default" option for null selection

### File 3: Update Request Catalog Section
**Modify:** `src/components/settings/requests/RequestCatalogSection.tsx`

1. Add `icon_key` to formData state
2. Import and add `RequestIconPicker` to the create/edit dialog
3. Pass `icon_key` to the create mutation

### File 4: Update Provision Demo Seeding
**Modify:** `supabase/functions/provision-demo/index.ts`

Update `seedSampleServiceRequests` function:
- Use item-specific notes based on catalog item code/title
- Match notes to the actual request being made

### File 5: Update Demo Reset Seeding
**Modify:** `supabase/functions/demo-reset/index.ts`

Apply the same item-specific notes logic to the auto-heal seeding pass.

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/request-icons.tsx` | Create | Define request-specific icon options |
| `src/components/ui/request-icon-picker.tsx` | Create | Icon picker component for request catalog |
| `src/components/settings/requests/RequestCatalogSection.tsx` | Modify | Add icon picker to create/edit dialog |
| `supabase/functions/provision-demo/index.ts` | Modify | Use context-aware sample notes |
| `supabase/functions/demo-reset/index.ts` | Modify | Use context-aware sample notes |

## No Breaking Changes
- Existing catalog items with `icon_key` values continue to work
- New items default to null (category fallback) if no icon selected
- Sample request seeding is improved but functionally identical
