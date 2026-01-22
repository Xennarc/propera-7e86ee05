
# Fix Demo Request Seeding & Add Icon Picker for Request Catalog

## ✅ COMPLETED

### Issue 1: Sample Request Notes Mismatch - FIXED
Updated both `provision-demo` and `demo-reset` edge functions with a `getSampleNote()` helper that generates context-aware notes based on department and item title:

| Department | Title Contains | Generated Note |
|------------|----------------|----------------|
| MINIBAR | "water" | "2 bottles of still water please" |
| MINIBAR | "wine/champagne" | "Could we have a bottle chilled for tonight?" |
| MINIBAR | "refill" | "Full minibar restock please" |
| HOUSEKEEPING | "towel" | "Extra bath towels for 4 guests please" |
| HOUSEKEEPING | "turndown" | "Turndown service at 7pm please" |
| ENGINEERING | "ac" | "The AC seems to be making a strange noise" |
| ENGINEERING | "light" | "The bathroom light is flickering" |
| ENGINEERING | "wifi" | "WiFi connection keeps dropping" |

### Issue 2: Missing Icon Picker in Staff Portal - FIXED
Created a complete icon picker system for request catalog items:

**New Files:**
- `src/lib/request-icons.tsx` - 30+ hospitality-specific icons organized by category (Housekeeping, Minibar, Maintenance, Amenities, Concierge)
- `src/components/ui/request-icon-picker.tsx` - Popover-based icon grid with category grouping

**Updated Files:**
- `src/components/settings/requests/RequestCatalogSection.tsx`:
  - Added `icon_key` to form state
  - Added Icon column to catalog table
  - Added `RequestIconPicker` to create dialog
  - Icon passed to create mutation

## Files Modified

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/request-icons.tsx` | Created | Define request-specific icon options |
| `src/components/ui/request-icon-picker.tsx` | Created | Icon picker component for request catalog |
| `src/components/settings/requests/RequestCatalogSection.tsx` | Modified | Add icon picker to create dialog + icon column |
| `supabase/functions/provision-demo/index.ts` | Modified | Context-aware sample notes |
| `supabase/functions/demo-reset/index.ts` | Modified | Context-aware sample notes |

## Icon Categories Available

- **Housekeeping**: Clean, Towels, Linens, Turndown, Cleaning, Trash
- **Minibar**: Drinks, Coffee, Water, Snacks, Food
- **Maintenance**: Repair, Temperature, Lighting, AC/Fan, Internet, TV, Plumbing
- **Amenities**: Package, Laundry, Kit, Pillows, Blankets, Slippers, Smoking
- **Concierge**: Phone, Keys, Message, Help
