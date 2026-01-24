
# Add Defensive Rendering Guards to Guest Portal Components

## Problem

React error #300 ("Objects are not valid as a React child") occurs when an object, Date instance, or array is rendered directly in JSX instead of a string or number. This can happen when:
- Database returns unexpected data shapes
- Date objects are not formatted before rendering
- JSONB arrays are rendered directly
- Null/undefined values propagate through to JSX

---

## Solution: Multi-Layer Defense Strategy

The fix applies **three layers of defense**:

1. **Data Normalization Layer**: Ensure all values entering components are primitives
2. **Render-Time Guards**: Add `String()` coercion and fallbacks at render points
3. **Safe Formatting Utilities**: Use existing `safe-date-format.ts` utilities consistently

---

## Implementation Plan

### 1. Create Safe Rendering Utility

**File:** `src/lib/safe-render.ts`

A small utility module for safely rendering values in JSX:

```typescript
/**
 * Safely convert any value to a renderable string.
 * Prevents React error #300 by ensuring objects/arrays are stringified.
 */
export function safeRenderValue(
  value: unknown,
  fallback: string = ''
): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(String).join(', ');
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return String(value);
}

/**
 * Safe string coercion with fallback.
 */
export function safeString(
  value: unknown,
  fallback: string = ''
): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
}

/**
 * Safe number extraction with fallback.
 */
export function safeNumber(
  value: unknown,
  fallback: number = 0
): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}
```

---

### 2. Harden GuestAuthContext Session Creation

**File:** `src/contexts/GuestAuthContext.tsx`

Add explicit type coercion when creating the session object from RPC response:

**Lines 249-261 - Session creation:**
```typescript
const session: GuestSession = {
  guestId: String(guestData.guest_id ?? ''),
  fullName: String(guestData.full_name ?? 'Guest'),
  roomNumber: String(guestData.room_number ?? ''),
  checkInDate: String(guestData.check_in_date ?? ''),
  checkOutDate: String(guestData.check_out_date ?? ''),
  resortId: String(guestData.resort_id ?? ''),
  resortName: resortName ?? undefined,
  resortLogoUrl: resortLogoUrl ?? undefined,
  resortTimezone: resortTimezone ?? 'UTC',
  sessionId,
  sessionToken,
};
```

**Lines 122 - Session restoration:**
Add validation after JSON.parse to ensure all fields are strings.

---

### 3. Harden GuestLayout Component

**File:** `src/components/guest/GuestLayout.tsx`

**Lines 188-205 - Header rendering:**
```typescript
<h1 className="text-sm sm:text-base font-bold text-foreground truncate group-hover:text-primary transition-colors">
  {String(branding.name || guest?.resortName || 'Guest Portal')}
</h1>
<p className="text-[11px] sm:text-xs text-muted-foreground font-medium">
  Room {String(guest?.roomNumber || '')}
</p>
```

---

### 4. Harden GuestHome Component

**File:** `src/pages/guest/GuestHome.tsx`

**Line 136 - firstName derivation:**
```typescript
const firstName = String(guest?.fullName ?? 'Guest').split(' ')[0] || 'Guest';
```

**Lines 315-316 - Greeting render:**
```typescript
<h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
  {String(greeting.text)}, {firstName}!
</h1>
```

**Lines 318-321 - Schedule count:**
```typescript
<p className="text-sm text-muted-foreground">
  {todaySchedule.length > 0 
    ? t('home.eventsToday', { count: Number(todaySchedule.length) })
    : String(t('home.whatToDo'))}
</p>
```

---

### 5. Harden GuestStayProgress Component

**File:** `src/components/guest/GuestStayProgress.tsx`

**Lines 18-19 - Date parsing:**
Replace `parseISO` with `safeParseDateISO` and add fallbacks:

```typescript
import { safeParseDateISO, safeFormatDate } from '@/lib/safe-date-format';

// ...

const checkIn = safeParseDateISO(checkInDate);
const checkOut = safeParseDateISO(checkOutDate);

// If dates are invalid, show fallback UI
if (!checkIn || !checkOut) {
  return (
    <div className={cn("text-sm text-muted-foreground", className)}>
      Stay dates unavailable
    </div>
  );
}
```

**Lines 36, 66, 78, 107 - Date formatting:**
```typescript
{safeFormatDate(checkInDate, 'MMM d', 'N/A')} – {safeFormatDate(checkOutDate, 'MMM d', 'N/A')}
```

---

### 6. Harden PrearrivalCountdown Component

**File:** `src/components/guest/prearrival/PrearrivalCountdown.tsx`

**Lines 24-27 - Date handling:**
```typescript
import { safeParseDateISO, safeFormatDate } from '@/lib/safe-date-format';

const checkIn = safeParseDateISO(checkInDate);
const checkOut = safeParseDateISO(checkOutDate);

// Fallback if dates are invalid
if (!checkIn || !checkOut) {
  return null;
}

const daysUntil = differenceInDays(checkIn, today);
const stayNights = differenceInDays(checkOut, checkIn);
```

**Lines 66, 78 - Date display:**
```typescript
<p className="font-semibold text-foreground">
  {safeFormatDate(checkInDate, 'EEE, MMM d', 'TBD')}
</p>
```

---

### 7. Harden GuestBookingCard Component

**File:** `src/components/guest/GuestBookingCard.tsx`

**Line 57 - Total guests calculation:**
```typescript
const totalGuests = Number(booking.num_adults || 0) + Number(booking.num_children || 0);
```

**Line 104 - Title rendering:**
```typescript
<p className="text-sm font-semibold text-foreground truncate">
  {String(booking.title || 'Booking')}
</p>
```

**Lines 173-177 - Date formatting with safe fallback:**
```typescript
import { safeFormatDate } from '@/lib/safe-date-format';

{showDate && (
  <span className="flex items-center gap-1">
    <Clock className="h-3.5 w-3.5" />
    {safeFormatDate(booking.date, 'EEE, MMM d', 'Date unavailable')}
  </span>
)}
```

---

### 8. Harden GuestPrearrivalHome Component

**File:** `src/pages/guest/GuestPrearrivalHome.tsx`

**Line 69 - firstName derivation:**
```typescript
const firstName = String(guest?.fullName ?? 'Guest').split(' ')[0] || 'Guest';
```

---

### 9. Harden GuestTodayTimeline Component

**File:** `src/components/guest/GuestTodayTimeline.tsx`

**Lines 81-82 - Item rendering:**
```typescript
<span className="font-mono">{String(item.time || '').slice(0, 5)}</span>
<span className="max-w-[100px] truncate">{String(item.title || 'Event')}</span>
```

---

### 10. Harden TravelPartyCard Component

**File:** `src/components/guest/TravelPartyCard.tsx`

**Lines 40-50 - Count rendering:**
```typescript
<p className="text-sm text-muted-foreground">
  {Number(adultsCount) || 0} adult{adultsCount !== 1 ? 's' : ''}
  {childrenCount > 0 && `, ${Number(childrenCount) || 0} child${childrenCount !== 1 ? 'ren' : ''}`}
  {roomsCount > 1 && ` · ${Number(roomsCount) || 0} rooms`}
</p>
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/safe-render.ts` | Utility functions for safe value rendering |

## Files to Modify

| File | Change |
|------|--------|
| `src/contexts/GuestAuthContext.tsx` | Add String() coercion to session fields |
| `src/components/guest/GuestLayout.tsx` | Safe render branding and room |
| `src/pages/guest/GuestHome.tsx` | Safe render greeting and counts |
| `src/components/guest/GuestStayProgress.tsx` | Use safe date utilities |
| `src/components/guest/prearrival/PrearrivalCountdown.tsx` | Use safe date utilities |
| `src/components/guest/GuestBookingCard.tsx` | Safe render title, guests, dates |
| `src/pages/guest/GuestPrearrivalHome.tsx` | Safe firstName derivation |
| `src/components/guest/GuestTodayTimeline.tsx` | Safe render item properties |
| `src/components/guest/TravelPartyCard.tsx` | Safe number coercion |

---

## Key Patterns Applied

| Pattern | Example | Purpose |
|---------|---------|---------|
| String coercion | `String(value ?? '')` | Prevent object rendering |
| Number coercion | `Number(value) \|\| 0` | Safe numeric display |
| Safe date formatting | `safeFormatDate(date, format, fallback)` | Prevent Date object rendering |
| Null check + fallback | `value ?? 'default'` | Handle missing data |
| Array safety | `Array.isArray(x) ? x.join(', ') : ''` | Prevent array rendering |

---

## Testing Checklist

1. Clear localStorage (`propera_guest_session`)
2. Navigate to `/resort/DEMO/guest/login`
3. Login with valid credentials
4. Verify home page loads without React error #300
5. Navigate through all guest portal tabs (Activities, Requests, Bookings)
6. Verify pre-arrival flow works for guests with future check-in dates
7. Check browser console for any remaining "Objects are not valid" errors
