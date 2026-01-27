
# Redesign Guest Portal Homepage

## Overview

Transform the guest portal homepage from the current card-based layout to a premium, image-rich mobile experience inspired by the reference design. The new layout features a hero card with resort imagery, bold colorful quick action tiles, and a featured activities discovery grid.

---

## Design Analysis (Reference vs Current)

| Element | Reference Design | Current Implementation | Action |
|---------|-----------------|----------------------|--------|
| Hero Card | Full-width image background with greeting, date, stay dates, check-out badge | Solid card with icon, greeting, date, and progress bar | **Redesign** with image background |
| Quick Actions | 4 solid-colored tiles (teal, amber, purple, cyan) with icons | 4 tiles with transparent backgrounds and ring icons | **Restyle** to bold solid colors |
| Travel Party | Minimal row with icon, text, chevron | Card with icon, text, badge, chevron | **Simplify** styling |
| Today Section | "No plans yet?" card with 2 horizontal CTAs | Vertical stack with compass icon | **Horizontal CTA layout** |
| Featured Activities | 2-column image grid with overlaid text | Not present | **Add new section** |
| Header | Resort logo + name + room in header bar | Matches (already good) | **Keep current** |

---

## Implementation Plan

### Phase 1: New Hero Card with Image Background

**File:** `src/pages/guest/GuestHome.tsx`

**Changes:**
1. Query resort's `login_hero_image_url` or use a scenic fallback
2. Replace the current greeting card with an image-backed hero
3. Overlay gradient with greeting, date, stay dates, and check-out indicator

**New Hero Structure:**
```tsx
<Card className="relative overflow-hidden rounded-3xl aspect-[2/1]">
  {/* Background Image */}
  <div 
    className="absolute inset-0 bg-cover bg-center"
    style={{ backgroundImage: `url(${heroImage})` }}
  />
  {/* Gradient Overlay */}
  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
  
  {/* Content */}
  <CardContent className="relative z-10 h-full flex flex-col justify-between p-5">
    <div>
      <h1 className="text-2xl font-bold text-white">{greeting}, {firstName}!</h1>
      <p className="text-white/80 text-sm">{format(today, 'EEEE, MMMM d, yyyy')}</p>
    </div>
    
    <div className="flex items-center justify-between">
      <span className="text-white/90 text-sm font-medium">
        {format(checkIn, 'MMM d')} – {format(checkOut, 'MMM d')}
      </span>
      <Badge className="bg-amber-400 text-black font-semibold rounded-lg px-3 py-1">
        {isCheckoutDay ? 'Check-out day' : `Day ${currentDay} of ${totalDays}`}
      </Badge>
    </div>
  </CardContent>
</Card>
```

### Phase 2: Bold Quick Actions Grid

**File:** `src/components/guest/GuestQuickActions.tsx`

**Changes:**
1. Replace translucent backgrounds with solid vibrant colors
2. Use white icons on colored backgrounds
3. Increase icon size for better visual impact
4. Remove descriptions for a cleaner look

**New Color Mapping:**
| Action | Background | Icon |
|--------|-----------|------|
| Activities | `bg-teal-500` (lagoon) | White IconActivities |
| Dining | `bg-amber-500` (sunset) | White IconRestaurants |
| Bookings | `bg-purple-500` (orchid) | White IconBookings |
| Request | `bg-sky-500` (cyan) | White Bell/MessageSquarePlus |

**Updated Tile Structure:**
```tsx
<div className={cn(
  "flex flex-col items-center gap-2 p-4 rounded-2xl",
  "bg-teal-500" // solid color per action
)}>
  <Icon className="h-7 w-7 text-white" />
  <span className="text-xs font-semibold text-white">{label}</span>
</div>
```

### Phase 3: Simplified Travel Party Row

**File:** `src/components/guest/TravelPartyCard.tsx`

**Changes:**
1. Make the card more compact
2. Use muted icon styling similar to reference
3. Simplify to single-line description

**Updated Structure:**
```tsx
<Card className="guest-card">
  <CardContent className="p-3">
    <Link className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
        <Users className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-foreground">Travel Party</h3>
        <p className="text-xs text-muted-foreground">
          {hasParty ? `${adultsCount} adults, ${childrenCount} children` : 'Manage your travel party'}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </Link>
  </CardContent>
</Card>
```

### Phase 4: Horizontal "No Plans Yet?" CTAs

**File:** `src/pages/guest/GuestHome.tsx`

**Changes:**
1. Change the empty state to show a card with horizontal button layout
2. Use amber/gold primary button and outline secondary
3. Match the reference's visual style

**Updated Empty State:**
```tsx
<Card className="guest-card">
  <CardContent className="p-5">
    <h3 className="text-lg font-bold mb-3">No plans yet?</h3>
    <div className="flex gap-2">
      <Link to="/guest/activities" className="flex-1">
        <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold">
          Explore Activities
        </Button>
      </Link>
      <Link to="/guest/restaurants" className="flex-1">
        <Button variant="outline" className="w-full font-semibold">
          View Restaurants
        </Button>
      </Link>
    </div>
  </CardContent>
</Card>
```

### Phase 5: Featured Activities Grid (New Section)

**File:** `src/pages/guest/GuestHome.tsx` + New Component

**New Component:** `src/components/guest/GuestFeaturedActivities.tsx`

**Purpose:** Display a 2-column grid of activity cards with image backgrounds and text overlays

**Data Source:** Query `activities` table for resort, filter by `is_active`, `guest_can_book`, limit to 4 with images

**Component Structure:**
```tsx
export function GuestFeaturedActivities({ resortId }: { resortId: string }) {
  const { data: activities } = useQuery({
    queryKey: ['guest-featured-activities', resortId],
    queryFn: async () => {
      const { data } = await supabase
        .from('activities')
        .select('id, name, category, image_url, short_description')
        .eq('resort_id', resortId)
        .eq('is_active', true)
        .eq('guest_can_book', true)
        .not('image_url', 'is', null)
        .limit(4);
      return data || [];
    },
  });

  if (!activities?.length) return null;

  return (
    <div>
      <GuestSectionHeader 
        title="Explore Activities" 
        icon={<Sparkles className="h-5 w-5 text-primary" />}
        actionLabel="View All"
        actionHref="/guest/activities"
      />
      <div className="grid grid-cols-2 gap-3">
        {activities.map((activity) => (
          <Link key={activity.id} to={`/guest/activity/${activity.id}`}>
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden group">
              <img 
                src={activity.image_url || FALLBACK_IMAGE}
                alt={activity.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h4 className="text-white font-bold text-sm line-clamp-1">{activity.name}</h4>
                <p className="text-white/80 text-xs line-clamp-1">{activity.short_description || activity.name}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

**Fallback Image:**
```typescript
const FALLBACK_ACTIVITY_IMAGES: Record<string, string> = {
  DIVE: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400',
  WATERSPORT: 'https://images.unsplash.com/photo-1530870110042-98b2cb110834?w=400',
  EXCURSION: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400',
  SPA: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=400',
  OTHER: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
};
```

---

## File Changes Summary

| File | Action | Changes |
|------|--------|---------|
| `src/pages/guest/GuestHome.tsx` | Modify | Hero card redesign, horizontal CTAs, add featured activities section |
| `src/components/guest/GuestQuickActions.tsx` | Modify | Solid color tiles, white icons, simplified labels |
| `src/components/guest/TravelPartyCard.tsx` | Modify | More compact styling |
| `src/components/guest/GuestFeaturedActivities.tsx` | **Create** | New 2x2 image grid component |

---

## Component Layout After Redesign

```text
GuestHome
├── Pre-arrival Nudge (conditional)
├── Feedback Prompt (conditional)
├── Image Hero Card (NEW)
│   ├── Background Image (resort hero or fallback)
│   ├── Gradient Overlay
│   ├── Greeting + Date
│   └── Stay Dates + Check-out Badge
├── Quick Actions Grid (RESTYLED)
│   └── 4 Bold Colored Tiles
├── Travel Party Card (SIMPLIFIED)
├── Smart Suggestions (existing)
├── Today Section
│   ├── Section Header
│   ├── Timeline (if bookings exist)
│   └── "No plans yet?" with horizontal CTAs (RESTYLED)
├── Featured Activities (NEW)
│   └── 2x2 Image Card Grid
└── Upcoming Bookings Preview (existing)
```

---

## Color Palette for Quick Actions

| Action | Tailwind Class | Hex Approx |
|--------|---------------|------------|
| Activities | `bg-teal-500` | #14B8A6 |
| Dining | `bg-amber-500` | #F59E0B |
| Bookings | `bg-purple-500` | #A855F7 |
| Request | `bg-sky-500` | #0EA5E9 |

These match the vibrant app-icon style in the reference while maintaining accessibility.

---

## Mobile UX Considerations

1. **Touch Targets:** All tiles maintain 48px minimum tap area
2. **Image Optimization:** Use `loading="lazy"` for featured activities grid
3. **Aspect Ratios:** Hero uses 2:1, activity cards use 4:3 for mobile
4. **Text Readability:** White text on dark gradient overlays (4.5:1 contrast)
5. **Performance:** Use CSS gradients instead of additional overlay images

---

## Data Dependencies

| Data | Source | Required Fields |
|------|--------|----------------|
| Resort Hero Image | `resorts.login_hero_image_url` | Already fetched in `useResortBranding` |
| Featured Activities | `activities` table | `id, name, category, image_url, short_description` |
| Stay Dates | `guest` context | `checkInDate, checkOutDate` |

---

## Fallback Strategy

1. **No Hero Image:** Use scenic beach/resort Unsplash fallback
2. **No Activity Images:** Use category-specific fallback images
3. **No Featured Activities:** Hide the section entirely (graceful degradation)

---

## Technical Notes

- Reuse existing `GuestSectionHeader` for section titles
- Use `format` from date-fns for consistent date formatting
- Follow existing `guest-card` class patterns for consistency
- Maintain all existing i18n translation keys
- Keep animations subtle using existing Framer Motion patterns

---

## Summary

This redesign transforms the guest homepage into a visually rich, app-like experience by:

1. **Hero Card:** Adding a photo background with stay context overlay
2. **Quick Actions:** Converting to bold, colorful app-icon style tiles
3. **Travel Party:** Streamlining to a cleaner, more minimal row
4. **Empty State:** Horizontal CTA layout for better scannability
5. **Featured Activities:** New discovery section with image cards

The changes maintain all existing functionality while significantly enhancing visual appeal and alignment with premium hospitality app standards.
