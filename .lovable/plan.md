
# Enhance Activity Configuration for Guest-Facing Information

## Summary
Make all guest-visible activity information configurable from the staff side, including the "Good to know" section content, cancellation policies, booking cutoff times, and rich content fields. The booking cutoff enforcement already works correctly in the backend—we need to expose the configuration in the staff UI.

## Current State Analysis

### Database Fields Already Available (Not Exposed in Staff UI)
The `activities` table has these columns that guests see but staff cannot edit:

| Field | Guest Usage | Currently Editable |
|-------|-------------|-------------------|
| `short_description` | Activity catalogue cards | No |
| `full_description` | Activity detail page | No |
| `difficulty_level` | Badges on detail page | No |
| `max_age` | Age restrictions | No |
| `is_swimming_required` | Swimming notice | No |
| `suitable_for_non_swimmers` | Accessibility | No |
| `highlights` (JSON) | Key features list | No |
| `includes` | "What's included" section | No |
| `health_and_safety_notes` | Safety info card | No |
| `cancellation_policy_text` | Policy section | No |
| `faq` (JSON) | FAQ accordion | No |
| `guest_cutoff_hours` | Booking closes X hours before | Stored but not shown in form |
| `guest_cancel_cutoff_hours` | Cancel deadline | Stored but not shown in form |

### Booking Cutoff Enforcement
The backend validation in `booking-validation.ts` already:
1. Checks `guest_cutoff_hours` against resort timezone
2. Returns `CUTOFF_PAST` error if booking attempt is too late
3. Works correctly for guest portal bookings

The issue is just UI: staff can't easily configure these values.

---

## Implementation Plan

### Phase 1: Reorganize ActivityDialog with Tabs
Transform the single scrolling form into a tabbed interface for better organization.

**Tabs Structure:**
1. **Basic Info** - Name, category, icon, image, descriptions
2. **Pricing & Capacity** - Price, duration, capacity limits, age restrictions
3. **Guest Booking Rules** - All the "Good to know" configurable settings
4. **Content & Safety** - Includes, highlights, health notes, cancellation policy, FAQ

### Phase 2: Add Missing Fields to Form

#### Tab 1 - Basic Info (existing + new fields)
- Name (existing)
- Category (existing)
- Icon (existing)
- Hero Image (existing)
- **Short Description** (NEW) - shown in catalogue cards
- **Full Description** (NEW) - shown on detail page

#### Tab 2 - Pricing & Capacity (reorganized)
- Price per Person (existing)
- Duration (existing)
- Max Capacity (existing)
- Min Capacity (existing)
- **Age Range** (NEW)
  - Min Age (existing)
  - Max Age (NEW)
- **Difficulty Level** (NEW) - EASY / MODERATE / ADVANCED dropdown
- **Swimming Requirements** (NEW)
  - Swimming Required toggle
  - Suitable for Non-swimmers toggle

#### Tab 3 - Guest Booking Rules (the "Good to Know" section)
All fields that feed into the guest "Good to know" panel:

- Guests Can Book toggle (existing)
- **Max Guests Per Booking** (existing but hidden - make visible with clear label)
- **Booking Cutoff Hours** (NEW input with helper text)
  - Label: "Online booking closes X hours before start"
  - Default: 2 hours
- Requires Approval toggle (existing)
- Guests Can Cancel toggle (existing)
- **Cancellation Cutoff Hours** (NEW input with helper text)
  - Label: "Guests can cancel up to X hours before"
  - Default: 4 hours
  - Only shown when "Guests Can Cancel" is ON
- Active toggle (existing)

#### Tab 4 - Content & Safety (NEW tab)
Rich content fields for the guest detail page:

- **Highlights** (NEW)
  - Dynamic list input (add/remove items)
  - Shows as bullet points on guest detail page
- **What's Included** (NEW)
  - Multi-line text area
- **Health & Safety Notes** (NEW)
  - Multi-line text area with amber warning styling in preview
- **Cancellation Policy Text** (NEW)
  - Custom policy wording (overrides default generated text)
- **FAQ** (NEW - future enhancement)
  - Question/Answer pair list
  - Can be deferred to v2

---

## Technical Changes

### File: `src/pages/activities/ActivityDialog.tsx`

1. **Import Tabs component**
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
```

2. **Expand formData state** to include all missing fields:
```tsx
const [formData, setFormData] = useState({
  // Existing fields...
  
  // NEW fields
  short_description: '',
  full_description: '',
  difficulty_level: null as string | null,
  max_age: '',
  is_swimming_required: false,
  suitable_for_non_swimmers: false,
  highlights: [] as string[],
  includes: '',
  health_and_safety_notes: '',
  cancellation_policy_text: '',
});
```

3. **Update useEffect** to populate new fields from activity data

4. **Update activityData** object in handleSubmit to include new fields

5. **Restructure JSX** into tabbed sections

### File: `src/types/database.ts` (verify types)
Ensure Activity interface includes all fields (mostly already there).

---

## UI/UX Details

### Booking Rules Section Helper Text
Each field should have clear explanatory text:

```
┌─────────────────────────────────────────────────────┐
│ Guest Booking Rules                                 │
├─────────────────────────────────────────────────────┤
│ ┌─ Booking Cutoff ─────────────────────────────────┐│
│ │ Hours before activity starts:  [  2  ] hours    ││
│ │ ℹ️ Guests cannot book within 2h of start time    ││
│ └──────────────────────────────────────────────────┘│
│                                                     │
│ ┌─ Max Guests Per Booking ─────────────────────────┐│
│ │ Maximum:  [  4  ] guests                         ││
│ │ ℹ️ Shown in "Good to know" section               ││
│ └──────────────────────────────────────────────────┘│
│                                                     │
│ ┌─ Cancellation Settings ──────────────────────────┐│
│ │ [✓] Guests Can Cancel                            ││
│ │ Cancel deadline:  [  4  ] hours before start     ││
│ │ ℹ️ Guests see "Cancel online up to 4h before"    ││
│ └──────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

### Highlights Editor Component
Simple list editor with add/remove:
```
Highlights (shown as feature list to guests)
┌────────────────────────────────────────────┐
│ Professional equipment provided        [×] │
│ Suitable for all skill levels          [×] │
│ Photo package available                [×] │
│ [+ Add highlight]                          │
└────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/activities/ActivityDialog.tsx` | Major restructure: tabs, new fields, expanded form state |
| `src/types/database.ts` | Verify/add any missing Activity fields |

## Files to Create (Optional)

| File | Purpose |
|------|---------|
| `src/components/ui/highlight-list-input.tsx` | Reusable list editor for highlights |

---

## Guest Portal Display Validation

After implementation, the guest pages should display:

### GuestActivityBookingPage "Good to know" section
Will now show **actual configured values**:
- Maximum X guests per booking (from `max_pax_per_booking`)
- Online booking closes Xh before start time (from `guest_cutoff_hours`)
- You can cancel online up to Xh before (from `guest_cancel_cutoff_hours`)

### GuestActivityDetailPage
Will show content from new fields:
- Short description in header
- Full description card
- Difficulty badge
- Highlights list
- "What's included" section
- Health & Safety notes (if configured)
- Cancellation Policy text (if configured)
- Swimming requirement notice (if enabled)

---

## No Database Changes Required

All required columns already exist in the `activities` table. This is purely a frontend enhancement to expose existing database capabilities in the staff UI.

---

## Testing Checklist

1. Create a new activity with all fields populated
2. Verify all content appears on guest detail page
3. Edit booking cutoff hours and verify:
   - Guest sees correct "booking closes Xh before" text
   - Guest is blocked from booking within cutoff window
4. Edit cancellation hours and verify guest sees correct text
5. Toggle "Guests Can Cancel" off and verify cancellation option is hidden
6. Add highlights and verify they appear on guest detail page
7. Test with existing activities (ensure backward compatibility)
