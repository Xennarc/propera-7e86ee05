
# Travel Party Support for Guest Detail Page

## Summary

Add a **staff-facing Travel Party card** to the Guest Detail page as a fully optional, additive feature. This leverages the existing database schema and RLS policies while creating new staff-specific hooks and UI components.

## Existing Infrastructure (No Changes Needed)

| Component | Status |
|-----------|--------|
| **Database Tables** | ✅ `travel_parties`, `travel_party_members`, `travel_party_room_links` already exist |
| **RLS Policies** | ✅ Staff access via `staff_has_resort_access()` and `staff_can_write_resort()` already configured |
| **Schema** | ✅ `resort_id` scoping already enforced |
| **Guest-facing hook** | ✅ `useTravelParty` exists (not reused - uses guest auth) |

## Architecture Overview

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                      GuestDetailPage.tsx                                  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Existing Cards (unchanged)                                         │   │
│  │ • Guest Information                                                │   │
│  │ • GuestStayPanel                                                   │   │
│  │ • PreArrivalSubmissionCard                                         │   │
│  │ • PrearrivalProfileCard                                            │   │
│  │ • Loyalty & Internal Notes                                         │   │
│  │ • GuestPinManager                                                  │   │
│  │ • GuestQrLoginManager                                              │   │
│  │ • Activity Bookings                                                │   │
│  │ • Restaurant Reservations                                          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ NEW: StaffTravelPartyCard                                          │   │
│  │ • Positioned after Guest Information card                          │   │
│  │ • Conditionally rendered (fully optional)                          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. New Hook: `useStaffTravelParty`

**File:** `src/hooks/useStaffTravelParty.ts`

A staff-specific hook that queries travel party data directly from the database (not through guest RPC functions).

**Features:**
- Fetches travel party by `lead_guest_id` and `resort_id`
- Returns party members with role badges (adult/child)
- Provides mutation for creating a new travel party
- Includes `hasParty` boolean for conditional rendering

**Query Pattern:**
```typescript
// Fetch travel party where this guest is the lead
supabase
  .from('travel_parties')
  .select(`
    *,
    members:travel_party_members(*)
  `)
  .eq('lead_guest_id', guestId)
  .eq('resort_id', resortId)
  .maybeSingle()
```

**Interface:**
```typescript
interface StaffTravelParty {
  id: string;
  name: string | null;
  leadGuestId: string;
  members: StaffTravelPartyMember[];
}

interface StaffTravelPartyMember {
  id: string;
  displayName: string;
  memberType: 'adult' | 'child';
  birthYear: number | null;
  roomNumber: string | null;
  relationshipLabel: string | null;
  isLead: boolean;
  linkedGuestId: string | null;
}
```

### 2. New Component: `StaffTravelPartyCard`

**File:** `src/components/staff/StaffTravelPartyCard.tsx`

A card component for staff to view/create travel parties.

**Empty State:**
- Shows "No travel party linked"
- CTA button: "Create Travel Party"
- Clicking creates a party with the current guest as lead

**With Party State:**
- Party name (editable) or "Travel Party" default
- Member count badge
- Member list grouped by room
- Role badges: Adult (default), Child (blue), Lead (gold)
- Optional: Add member button (future)

**UI Mockup:**
```text
┌────────────────────────────────────────────────────────────┐
│ 👥 Travel Party                           [2 people]       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Room 101                                                  │
│  ┌────────────────────────────────────────────────────┐   │
│  │ 👤 John Smith                     [Lead] [Adult]   │   │
│  │ 👤 Sarah Smith                    [Spouse] [Adult] │   │
│  │ 👤 Emma Smith (2020)              [Child]          │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Empty State Mockup:**
```text
┌────────────────────────────────────────────────────────────┐
│ 👥 Travel Party                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│         No travel party linked                             │
│         Group bookings and linked rooms                    │
│                                                            │
│              [ Create Travel Party ]                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 3. Query Key Addition

**File:** `src/lib/query-keys.ts`

Add travel party keys to the centralized query key factory:

```typescript
// Add to queryKeys object
travelParty: {
  staffParty: (resortId: string, guestId: string) => 
    ['staff-travel-party', resortId, guestId],
},
```

### 4. Integration with GuestDetailPage

**File:** `src/pages/guests/GuestDetailPage.tsx`

Add the new card **after the Guest Information card** (around line 361):

```typescript
// Import
import { StaffTravelPartyCard } from '@/components/staff/StaffTravelPartyCard';

// Render (after Guest Information card, before GuestStayPanel)
<StaffTravelPartyCard
  guestId={guest.id}
  guestName={guest.full_name}
  resortId={guest.resort_id}
/>
```

### 5. Update Composition Layer (Optional)

**File:** `src/hooks/useGuestDetailContext.ts`

Optionally integrate the travel party data into the composition layer for future use:

- Import `useStaffTravelParty`
- Map members to `partyMembers: GuestPartyMember[]` 
- Compute `hasKidsInParty` from actual party data if available

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useStaffTravelParty.ts` | Staff-specific travel party data hook |
| `src/components/staff/StaffTravelPartyCard.tsx` | Staff-facing travel party card component |

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/query-keys.ts` | Add `travelParty.staffParty()` key factory |
| `src/pages/guests/GuestDetailPage.tsx` | Import and render `StaffTravelPartyCard` |

---

## What This Does NOT Change

- ✅ No changes to existing `useTravelParty` hook (guest-facing)
- ✅ No changes to existing `TravelPartyCard` component (guest-facing)
- ✅ No changes to booking logic or room assignments
- ✅ No database migrations required (tables already exist)
- ✅ No RLS policy changes (staff access already configured)
- ✅ No automatic party inference - manual creation only
- ✅ Fully optional card - page works identically without it

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| Resort isolation | Queries filter by `resort_id`; RLS enforces `staff_has_resort_access()` |
| Write permissions | Create party mutation requires staff auth; RLS enforces `staff_can_write_resort()` |
| No guest access | This hook uses `useAuth` (staff), not `useGuestAuth` |

---

## Future Enhancements (Out of Scope)

These features can be added later without breaking this implementation:

1. **Add Member** - Button to add party members (reuse `AddPartyMemberDialog`)
2. **Link Room** - Button to link another room to the party
3. **Edit Party Name** - Inline editing of party name
4. **Remove Member** - Staff can remove non-lead members
5. **Booking Integration** - Show party members in booking attendee selection

---

## Testing Checklist

1. Visit GuestDetailPage for a guest with no travel party
   - Card shows "No travel party linked" with CTA
2. Click "Create Travel Party"
   - Party is created with guest as lead member
   - Card updates to show member list
3. Visit GuestDetailPage for a guest with existing party
   - Card shows party members with role badges
4. Verify resort isolation
   - Staff from Resort A cannot see parties from Resort B
