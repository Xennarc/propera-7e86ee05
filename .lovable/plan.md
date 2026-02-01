
# Rename "nav.buggy" to a More Intuitive Label

## Problem
The Guest Portal bottom navigation displays the raw translation key `nav.buggy` because:
1. The `GuestBottomNav` component references `labelKey: 'nav.buggy'` (line 49)
2. The translation file `src/i18n/locales/en.json` does not contain a `buggy` entry in the `nav` section

## Solution
Add the missing translation key with an intuitive label. Based on the user's suggestion of "Ride", I recommend using **"Ride"** which:
- Is short (fits mobile nav constraints)
- Is universally understood (no resort-specific jargon like "Buggy")
- Conveys the action (requesting a ride/pickup)

---

## Implementation

### Step 1: Add Translation Key
Add `"ride"` to the `nav` section in `src/i18n/locales/en.json`:

```json
"nav": {
  "home": "Home",
  "activities": "Activities",
  "dining": "Dining",
  "bookings": "Bookings",
  "requests": "Requests",
  "profile": "Profile",
  "logout": "Logout",
  "notifications": "Notifications",
  "loyalty": "Rewards",
  "ride": "Ride"
}
```

### Step 2: Update Nav Item Definition
Change the label key in `src/components/guest/GuestBottomNav.tsx`:

```typescript
// Before (line 47-53)
const transportNavItem: NavItemDef = { 
  icon: Car, 
  labelKey: 'nav.buggy', 
  href: '/guest/buggy', 
  key: 'guest-buggy',
  featureFlag: 'enable_transport_guest_booking',
};

// After
const transportNavItem: NavItemDef = { 
  icon: Car, 
  labelKey: 'nav.ride', 
  href: '/guest/buggy', 
  key: 'guest-buggy',
  featureFlag: 'enable_transport_guest_booking',
};
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/i18n/locales/en.json` | Add `"ride": "Ride"` to nav section |
| `src/components/guest/GuestBottomNav.tsx` | Change `labelKey` from `'nav.buggy'` to `'nav.ride'` |

---

## Result
The bottom navigation will display **"Ride"** instead of the raw key `nav.buggy`.
