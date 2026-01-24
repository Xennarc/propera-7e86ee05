

# Structured Guest Preferences Feature

## Summary

Add a **structured guest preferences system** as a purely additive feature. This creates a new database table, staff-specific hook, and UI card without modifying or migrating existing freeform notes.

---

## Data Architecture

### New Database Table: `guest_preferences`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, default gen_random_uuid() | Unique identifier |
| `resort_id` | uuid | FK → resorts, NOT NULL | Multi-tenant scoping |
| `guest_id` | uuid | FK → guests, NOT NULL | Guest this preference belongs to |
| `category` | text | NOT NULL | Category: 'room', 'dining', 'activity', 'general' |
| `value` | text | NOT NULL | The preference value (e.g., "High Floor", "Vegetarian") |
| `priority` | integer | DEFAULT 1 | Importance level (1=low, 3=high) |
| `source` | text | DEFAULT 'staff' | Origin: 'staff', 'prearrival', 'system' |
| `created_by_user_id` | uuid | FK → profiles | Staff who added this preference |
| `created_at` | timestamptz | DEFAULT now() | Creation timestamp |
| `updated_at` | timestamptz | DEFAULT now() | Last update timestamp |

**Indexes:**
- Composite index on `(resort_id, guest_id)` for efficient lookups
- Index on `category` for filtering

**Constraints:**
- Unique on `(guest_id, category, value)` to prevent duplicates
- Immutable `resort_id` trigger (following existing pattern)

---

## Security (RLS Policies)

Using existing security functions for consistency:

| Policy | Operation | Check |
|--------|-----------|-------|
| `staff_select_preferences` | SELECT | `staff_has_resort_access(auth.uid(), resort_id)` |
| `staff_insert_preferences` | INSERT | `has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[])` |
| `staff_update_preferences` | UPDATE | Same as INSERT with `WITH CHECK` |
| `staff_delete_preferences` | DELETE | Same as INSERT |

**No guest policies** - guests cannot view or modify preferences yet (future scope).

---

## Implementation Plan

### 1. Database Migration

**File:** New migration file

```sql
-- Create guest_preferences table
CREATE TABLE public.guest_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('room', 'dining', 'activity', 'general')),
  value text NOT NULL,
  priority integer NOT NULL DEFAULT 1 CHECK (priority BETWEEN 1 AND 3),
  source text NOT NULL DEFAULT 'staff' CHECK (source IN ('staff', 'prearrival', 'system')),
  created_by_user_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate preferences
ALTER TABLE public.guest_preferences 
  ADD CONSTRAINT unique_guest_preference UNIQUE (guest_id, category, value);

-- Indexes
CREATE INDEX idx_guest_preferences_guest ON public.guest_preferences(resort_id, guest_id);
CREATE INDEX idx_guest_preferences_category ON public.guest_preferences(category);

-- Enable RLS
ALTER TABLE public.guest_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_preferences FORCE ROW LEVEL SECURITY;

-- Immutable resort_id trigger
CREATE TRIGGER prevent_resort_id_change_guest_preferences
  BEFORE UPDATE ON public.guest_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_resort_id_change();

-- Updated_at trigger
CREATE TRIGGER update_guest_preferences_updated_at
  BEFORE UPDATE ON public.guest_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
CREATE POLICY "staff_select_preferences" ON public.guest_preferences
  FOR SELECT
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_insert_preferences" ON public.guest_preferences
  FOR INSERT
  WITH CHECK (public.has_resort_role(auth.uid(), resort_id, 
    ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[]));

CREATE POLICY "staff_update_preferences" ON public.guest_preferences
  FOR UPDATE
  USING (public.has_resort_role(auth.uid(), resort_id, 
    ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[]))
  WITH CHECK (public.has_resort_role(auth.uid(), resort_id, 
    ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[]));

CREATE POLICY "staff_delete_preferences" ON public.guest_preferences
  FOR DELETE
  USING (public.has_resort_role(auth.uid(), resort_id, 
    ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[]));
```

---

### 2. New Hook: `useStaffGuestPreferences`

**File:** `src/hooks/useStaffGuestPreferences.ts`

A staff-specific hook for managing guest preferences:

**Features:**
- Fetch preferences grouped by category
- Add new preference (with duplicate check)
- Remove preference
- Update priority

**Interface:**
```typescript
export interface StaffGuestPreference {
  id: string;
  category: 'room' | 'dining' | 'activity' | 'general';
  value: string;
  priority: 1 | 2 | 3;
  source: 'staff' | 'prearrival' | 'system';
  createdAt: string;
}

export interface StaffPreferencesGrouped {
  room: StaffGuestPreference[];
  dining: StaffGuestPreference[];
  activity: StaffGuestPreference[];
  general: StaffGuestPreference[];
}
```

**Return API:**
```typescript
{
  preferences: StaffPreferencesGrouped;
  hasPreferences: boolean;
  isLoading: boolean;
  addPreference: (category, value, priority?) => Promise<void>;
  removePreference: (id) => Promise<void>;
  isAdding: boolean;
  isRemoving: boolean;
}
```

---

### 3. New Component: `StaffGuestPreferencesCard`

**File:** `src/components/staff/StaffGuestPreferencesCard.tsx`

A card component for viewing and managing structured preferences.

**Empty State:**
```text
┌────────────────────────────────────────────────────────────┐
│ 🎯 Preferences                                              │
├────────────────────────────────────────────────────────────┤
│                                                            │
│         No structured preferences recorded                 │
│         Add preferences for faster service                 │
│                                                            │
│              [ Add Preference ]                            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**With Preferences:**
```text
┌────────────────────────────────────────────────────────────┐
│ 🎯 Preferences                            [ + Add ]        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Room                                                      │
│  [High Floor ×] [Extra Pillows ×] [Quiet Room ×]          │
│                                                            │
│  Dining                                                    │
│  [Vegetarian ×] [No Shellfish ×]                          │
│                                                            │
│  Activity                                                  │
│  [Prefers Morning ×]                                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**UI Components:**
- Category headers with icon badges
- Pill-style tags with `×` remove button
- Inline add preference popover (category dropdown + text input)
- Priority indicator (optional subtle visual)

---

### 4. Query Key Addition

**File:** `src/lib/query-keys.ts`

Add preferences keys:

```typescript
// Add to queryKeys object under new section
preferences: {
  staffPreferences: (resortId: string, guestId: string) => 
    ['staff-guest-preferences', resortId, guestId],
},
```

---

### 5. Integration with GuestDetailPage

**File:** `src/pages/guests/GuestDetailPage.tsx`

Add the new card **after Travel Party, before Stay Panel** (around line 370):

```typescript
// Import
import { StaffGuestPreferencesCard } from '@/components/staff/StaffGuestPreferencesCard';

// Render (after StaffTravelPartyCard)
<StaffGuestPreferencesCard
  guestId={guest.id}
  resortId={guest.resort_id}
/>
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useStaffGuestPreferences.ts` | Staff hook for preference CRUD |
| `src/components/staff/StaffGuestPreferencesCard.tsx` | UI card component |

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/query-keys.ts` | Add `preferences.staffPreferences()` |
| `src/pages/guests/GuestDetailPage.tsx` | Import and render card |

---

## What This Does NOT Touch

- `guest.notes` field - remains unchanged and functional
- `guest.notes_internal` field - remains unchanged
- `LoyaltyEditDialog` - no modification to notes editing
- Existing pre-arrival data - no migration attempted
- Any booking logic - completely independent

---

## Predefined Preference Suggestions (UX Enhancement)

The add preference UI will include common suggestions:

**Room:**
- High Floor, Low Floor, Near Elevator, Quiet Room, Extra Pillows, Hypoallergenic Bedding, Extra Towels

**Dining:**
- Vegetarian, Vegan, Gluten-Free, Halal, Kosher, No Shellfish, No Nuts, Window Seat, Private Table

**Activity:**
- Prefers Morning, Prefers Afternoon, Prefers Private, Group Activities OK, No Strenuous Activities

**General:**
- Early Check-in, Late Check-out, Celebration, Honeymoon, Anniversary

---

## Technical Notes

### Relationship to GuestPreference Interface

The existing `GuestPreference` interface in `useGuestDetailContext.ts` (lines 37-44) defines:
```typescript
export interface GuestPreference {
  id: string;
  category: 'room' | 'dining' | 'activity' | 'general';
  key: string;
  value: string;
  source: 'prearrival' | 'staff' | 'system';
  createdAt: string;
}
```

The new database table will be compatible with this interface. In Phase 2, the composition layer can map DB rows to this interface and populate `preferences: GuestPreference[]`.

### Permission Alignment

This feature aligns with `guests.notes.edit` permission semantically, but since we're only allowing specific roles via RLS, no new permission entry is strictly required. The RLS policies handle authorization at the database level.

---

## Testing Checklist

1. Visit GuestDetailPage for a guest with no preferences
   - Card shows empty state with "Add Preference" CTA
2. Click "Add Preference" and add a room preference
   - Preference appears as pill tag
3. Remove a preference by clicking `×`
   - Preference is deleted
4. Add multiple preferences across categories
   - Grouped correctly by category
5. Verify resort isolation
   - Staff from Resort A cannot see preferences from Resort B
6. Verify existing notes unchanged
   - `notes_internal` field still editable via LoyaltyEditDialog

