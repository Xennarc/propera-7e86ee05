
# Add Home Page Hero Image Customization to Branding Settings

## Problem Summary
Currently, the guest portal home page reuses the `login_hero_image_url` field for its hero banner. This creates confusion since:
1. The same image appears on both login and home page
2. Admins cannot set different images for each experience
3. The branding settings label it as "Login Hero Background" which is misleading

## Solution Overview
Add a dedicated `home_hero_image_url` field and reorganize the branding settings to clearly separate **Login Experience** from **Guest Home Experience**.

---

## Database Changes

Add new column to the `resorts` table:

```sql
ALTER TABLE resorts
ADD COLUMN IF NOT EXISTS home_hero_image_url TEXT;
```

---

## UI Changes

### 1. Add New "Guest Home Experience" Section

Create a new accordion section in the branding settings with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| Home Hero Image | Image Upload | Background image for guest home page (separate from login) |
| Home Welcome Title | Text | Optional override for home page greeting (e.g., "Welcome back") |
| Home Subtitle | Text | Optional subtitle text below greeting |

### 2. Reorganize Sections

The accordion sections will be reordered for better flow:

1. **Brand Identity** - Logo, favicon, wordmark (unchanged)
2. **Color Palette** - Colors and presets (unchanged)
3. **Typography** - Fonts (unchanged)
4. **UI Components** - Button, card, radius, theme (unchanged)
5. **Guest Home Experience** - NEW: Home page hero image and content
6. **Login Experience** - Login page hero image and welcome content (renamed for clarity)

### 3. Section Visual

```text
┌─────────────────────────────────────────────────────────┐
│  ▼ Guest Home Experience                                │
│                                                         │
│    ┌────────────────────────────────────────────────┐  │
│    │  HOME HERO IMAGE                                │  │
│    │  (Wide aspect ratio preview)                    │  │
│    │  [Upload] [URL]                                 │  │
│    └────────────────────────────────────────────────┘  │
│                                                         │
│    Uses login hero if not set ℹ️                        │
│                                                         │
│    Home Welcome Override: [Custom greeting here...]     │
│    Home Subtitle: [Optional subtitle text...]           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### Files to Modify

| File | Changes |
|------|---------|
| **Database Migration** | Add `home_hero_image_url` column |
| `src/hooks/useResortBranding.ts` | Add `home_hero_image_url` to interface and query |
| `src/pages/settings/ResortBrandingPage.tsx` | Add new "Guest Home Experience" section with image uploader |
| `src/pages/guest/GuestHome.tsx` | Use `home_hero_image_url` with fallback to `login_hero_image_url` |
| `src/components/branding/EnhancedBrandingPreview.tsx` | Add home page preview mode |

### Form Data Changes

```typescript
interface FormData {
  // ... existing fields ...
  
  // NEW: Guest Home Experience
  home_hero_image_url: string;
}
```

### Hero Image Fallback Logic

```typescript
// In GuestHome.tsx
const heroImage = resort?.home_hero_image_url 
  || resort?.login_hero_image_url 
  || 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80';
```

This ensures:
- If home hero is set, use it
- Otherwise fall back to login hero
- Finally fall back to default Unsplash image

### Reset Section Logic

Add reset handler for the new section:

```typescript
case 'homeExperience':
  setFormData(prev => ({
    ...prev,
    home_hero_image_url: '',
  }));
  break;
```

---

## Preview Enhancement

Update the `EnhancedBrandingPreview` component to show both:
- **Login Preview** - Uses `login_hero_image_url`
- **Home Preview** - Uses `home_hero_image_url` (or fallback)

Add a toggle or tabs in the preview panel:
```text
[Login] [Home] [Portal]
```

---

## Testing Checklist

1. **Upload home hero image** - Verify it saves and appears in preview
2. **Check fallback** - Delete home hero, verify login hero is used
3. **Guest portal verification** - Log in as guest, verify correct hero displays
4. **Mobile responsive** - Test image on mobile viewport
5. **Reset section** - Verify reset clears only home experience fields

---

## Benefits

1. **Clear separation** - Login vs Home page imagery are distinct
2. **Backward compatible** - Existing setups work unchanged (fallback)
3. **Better UX** - Admins understand exactly what each image controls
4. **Future-proof** - Easy to add more home page customization fields later
