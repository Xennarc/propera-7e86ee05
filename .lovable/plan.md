

# Seed Demo Bookings for Guest Portal "My Bookings"

## Problem Analysis

The demo guest portal's "My Bookings" page is empty because:

1. **Wrong Guest Priority**: The current seeding distributes bookings round-robin across all in-house guests, but the demo portal specifically logs in as the guest in **room 201** (Emma Miller)
2. **No Origin Tracking**: Existing bookings have `origin: null` (manually created), so the auto-heal logic doesn't recognize them as "seed" data
3. **Limited Variety**: Current seeding only creates 3 activities and 2 reservations, with no variety across categories

## Solution Overview

Update the demo seeding logic to:
1. **Prioritize room 201** - ensure the demo portal guest always has bookings
2. **Increase variety** - seed diverse activities (SPA, DIVE, WATERSPORT, EXCURSION) and multiple restaurants
3. **Showcase different statuses** - include CONFIRMED, PENDING, and past bookings
4. **Match activities to realistic times** - use activity-specific time slots (Sunrise Yoga in morning, Night Fishing at sunset)

## Data to Seed for Demo Guest (Room 201)

### Activity Bookings (5 total)
| Activity | Category | Status | When | Purpose |
|----------|----------|--------|------|---------|
| Sunrise Yoga | SPA | CONFIRMED | Today, 06:00 | Morning activity highlight |
| House Reef Snorkel | WATERSPORT | CONFIRMED | Tomorrow, 10:30 | Upcoming adventure |
| Sunset Dolphin Cruise | EXCURSION | CONFIRMED | Day +2, 17:00 | Premium excursion |
| Deep Tissue Massage | SPA | CONFIRMED | Day +3, 14:00 | Relaxation booking |
| Night Fishing | EXCURSION | PENDING | Day +4, 17:30 | Shows approval workflow |

### Restaurant Reservations (3 total)
| Restaurant | Status | When | Purpose |
|------------|--------|------|---------|
| Lagoon Restaurant | CONFIRMED | Today, 19:00 | Tonight's dinner |
| Sunset Grill | CONFIRMED | Tomorrow, 20:30 | Future reservation |
| The Teppanyaki | CONFIRMED | Day +3, 19:00 | Specialty dining |

## Technical Changes

### File 1: `supabase/functions/demo-reset/index.ts`

**Update Pass 5 - Focus on Room 201 Guest:**

```typescript
// Current: Distributes across all in-house guests
const guest = inHouseGuests[i % inHouseGuests.length];

// New: Prioritize room 201 (demo portal guest)
const demoPortalGuest = inHouseGuests.find(g => g.room_number === '201') || inHouseGuests[0];

// Create all bookings for this single guest
```

**Increase Booking Variety:**

1. Change threshold from 3 activities to 5
2. Change threshold from 2 reservations to 3
3. Add category-aware session selection (pull from different categories)
4. Include one PENDING booking to showcase approval flow

**New Seeding Logic:**
```typescript
// Get sessions grouped by activity category for variety
const { data: allSessions } = await supabase
  .from("activity_sessions")
  .select(`
    id, activity_id, date, start_time,
    activities(name, category, default_price_per_person)
  `)
  .eq("resort_id", demoResortId)
  .eq("status", "SCHEDULED")
  .gte("date", todayStr)
  .lte("date", next7Days)
  .order("date", { ascending: true });

// Pick diverse activities (one per category if possible)
const categoryPicks = new Map<string, any>();
for (const session of allSessions) {
  const cat = session.activities?.category;
  if (!categoryPicks.has(cat)) {
    categoryPicks.set(cat, session);
  }
}

// Create 5 bookings with variety
```

### File 2: `supabase/functions/provision-demo/index.ts`

**Update Initial Demo Seeding (if applicable):**

Apply same logic during initial demo provisioning to ensure consistency. The `refreshDemoData` function should also seed demo bookings for room 201.

## Implementation Steps

1. **Update demo-reset threshold check**: Change from `seedBookingsCount < 3` to `seedBookingsCount < 5` for activities and `< 3` for reservations

2. **Add room 201 prioritization**: Find the demo portal guest first, fall back to any in-house guest

3. **Implement category-diverse selection**: Query sessions with activity category, pick one from each category

4. **Add variety in booking statuses**: Create 4 CONFIRMED + 1 PENDING for activity bookings

5. **Add variety in restaurants**: Seed reservations across different restaurants (Lagoon, Sunset Grill, Teppanyaki)

6. **Populate staff dashboard**: Since seeded bookings have `origin: 'seed'`, they'll also appear on staff Activity and Dining pages

## Files Modified

| File | Changes |
|------|---------|
| `supabase/functions/demo-reset/index.ts` | Update Pass 5 with room 201 priority, increased variety, category-diverse sessions |
| `supabase/functions/provision-demo/index.ts` | Update `refreshDemoData` to seed initial bookings consistently |

## Expected Result

After implementation:
- **Guest Portal "My Bookings"**: Shows 5 activities + 3 dining reservations across multiple days
- **Staff Activity Page**: Shows upcoming bookings with guest names and room numbers
- **Staff Dining Page**: Shows table reservations for demo guests
- **Demo Reset**: Automatically replenishes to 5+3 bookings if count drops

## No Breaking Changes

- Uses existing `origin: 'seed'` tagging for tracking
- Existing manual bookings (origin: null) are unaffected
- Auto-heal only triggers when seed count drops below threshold

