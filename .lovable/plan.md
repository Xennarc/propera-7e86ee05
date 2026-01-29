
# Fix Pre-arrival Portal Translations and Verify Settings Configuration

## Problem Summary
The guest portal is showing raw translation keys (e.g., `prearrival.welcomeTitle`, `prearrival.planActivities`) instead of proper English text because the `prearrival` section is missing from the English locale file (`en.json`), even though it exists in Chinese (`zh.json`).

## Root Cause
The English translation file (`src/i18n/locales/en.json`) is missing the entire `prearrival` translation section that the Chinese file has. When a translation key is missing, i18next shows the raw key unless a fallback is provided inline.

---

## Solution

### Fix 1: Add Missing English Translations

**File**: `src/i18n/locales/en.json`

Add the complete `prearrival` section to match the Chinese translations and cover all keys used in the code:

```json
"prearrival": {
  "title": "Pre-Arrival",
  "welcomeTitle": "Welcome, {{name}}!",
  "welcomeSubtitle": "Let's prepare for your upcoming stay",
  "getReady": "Get ready for your upcoming stay",
  "countdown": "Your Stay",
  "daysUntil": "{{days}} days until check-in",
  "arrivingToday": "Arriving today!",
  "arrivingTomorrow": "Arriving tomorrow!",
  "checkIn": "Check-in",
  "checkOut": "Check-out",
  "stayDuration": "{{nights}} night stay",
  "checklist": "Pre-arrival checklist",
  "complete": "Complete",
  "incomplete": "Incomplete",
  "arrivalDetails": "Arrival Details",
  "arrivalDetailsDesc": "Share your flight info and arrival time",
  "preferences": "Preferences",
  "preferencesDesc": "Dietary needs and special requirements",
  "specialOccasions": "Special Occasions",
  "specialOccasionsDesc": "Celebrating something special?",
  "preBookActivities": "Pre-book Activities",
  "preBookActivitiesDesc": "Plan your adventures ahead",
  "preBookDining": "Reserve Dining",
  "preBookDiningDesc": "Book your tables in advance",
  "planActivities": "Plan Activities",
  "planDining": "Plan Dining",
  "browseActivities": "Browse Activities",
  "browseDining": "Browse Dining",
  "noActivitiesOnDate": "No activities available on this date",
  "tipTitle": "Insider Tip",
  "tipDescription": "Book popular activities early—they fill up fast during peak season!",
  "welcome": "Welcome",
  "welcomeMessage": "We're excited to have you. Complete these steps to help us prepare a perfect stay.",
  "wizard": {
    "title": "Pre-Arrival Form",
    "step1Title": "Arrival Details",
    "step2Title": "Preferences",
    "step3Title": "Special Occasions",
    "step4Title": "Review",
    "arrivalDate": "Arrival Date",
    "arrivalTime": "Arrival Time",
    "flightNumber": "Flight Number",
    "transferPreference": "Transfer Preference",
    "seaplane": "Seaplane",
    "speedboat": "Speedboat",
    "domesticFlight": "Domestic Flight",
    "other": "Other",
    "dietaryPreferences": "Dietary Preferences",
    "vegetarian": "Vegetarian",
    "vegan": "Vegan",
    "glutenFree": "Gluten-Free",
    "halalKosher": "Halal/Kosher",
    "allergies": "Allergies",
    "allergiesPlaceholder": "Please list any allergies",
    "roomPreferences": "Room Preferences",
    "bedType": "Bed Type Preference",
    "kingBed": "King Bed",
    "twinBeds": "Twin Beds",
    "waterComfort": "Water Activity Comfort Level",
    "beginner": "Beginner - Never tried before",
    "intermediate": "Intermediate - Some experience",
    "advanced": "Advanced - Very confident",
    "honeymoon": "Honeymoon",
    "anniversary": "Anniversary",
    "birthday": "Birthday",
    "specialRequest": "Special Requests",
    "specialRequestPlaceholder": "Let us know how we can make your stay special",
    "review": "Review Your Information",
    "reviewDescription": "Please confirm your pre-arrival details",
    "submit": "Submit",
    "submitting": "Submitting...",
    "success": "Thank you! Our team will prepare for your arrival."
  }
}
```

---

## Existing Settings Pages (Already Functional)

### Pre-Arrival Settings
- **Location**: Settings → Guest Experience → Pre-Arrival Settings
- **Route**: `/staff/settings/prearrival`
- **Features**:
  - Enable/disable pre-arrival portal
  - Configure days before check-in to open portal
  - Toggle activity, dining, and spa bookings
  - Show/hide arrival details, preferences, and special occasions
  - Add custom resort-specific questions
  - Set welcome message for guests
  - Internal guidance notes for staff

### Resort Branding Settings
- **Location**: Settings → Guest Experience → Guest Portal Branding  
- **Route**: `/staff/settings/branding`
- **Features**:
  - Color presets (Ocean Teal, Tropical Sunset, Lagoon Blue, etc.)
  - Custom primary and accent colors with hex picker
  - Theme selection (Light, Dark, Auto)
  - Logo upload
  - Hero image upload
  - Brand wordmark
  - Login page title, subtitle, and instructions

---

## Files to Modify

| File | Change |
|------|--------|
| `src/i18n/locales/en.json` | Add complete `prearrival` translation section |

---

## Testing Checklist

1. **Guest Portal Pre-Arrival Page**:
   - Log in as a pre-arrival guest (e.g., Sam Smith, Room 222)
   - Verify all text displays correctly:
     - "Welcome, Sam!" (not `prearrival.welcomeTitle`)
     - "Plan Activities" (not `prearrival.planActivities`)
     - "Plan Dining" (not `prearrival.planDining`)
     - "Insider Tip" card shows proper text
   
2. **Language Switching**:
   - Switch to Chinese and back to English
   - Verify translations load correctly for both languages

3. **Staff Settings Access**:
   - Navigate to Settings → Guest Experience → Pre-Arrival Settings
   - Verify all configuration options work
   - Navigate to Settings → Guest Experience → Guest Portal Branding
   - Verify color presets, custom colors, and theme options work

---

## Technical Notes

- The i18next library falls back to showing the key when a translation is missing
- Some keys already have inline fallbacks (e.g., `t('prearrival.browseActivities', 'Browse Activities')`) which is why those show correct text
- The Chinese translations are already complete and can serve as reference
- No database changes required—this is purely a frontend locale fix
