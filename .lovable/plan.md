
# Enhanced Branding Settings - Highly Customizable Guest Portal UI

## Overview
Transform the existing branding settings into a comprehensive, enterprise-grade customization system while maintaining an intuitive, approachable interface for resort administrators. The goal is to offer more control over the guest portal experience without overwhelming non-technical users.

---

## Current State Analysis

The existing `ResortBrandingPage.tsx` already provides:
- 8 color presets with primary/accent selection
- Custom hex color inputs with color pickers
- Theme mode (Light/Dark/Auto)
- Logo and hero image uploads
- Login page content (title, subtitle, instructions)
- Brand wordmark/tagline
- Live preview with portal and login views

**Gaps Identified:**
1. No secondary/tertiary color customization
2. No button style options (rounded, pill, squared)
3. No card style configuration (shadow depth, border radius)
4. No header style options (position, background style)
5. No navigation customization (icon style, layout)
6. No font family selection
7. No favicon upload
8. No success/warning color overrides
9. No "Reset Section" granular controls
10. Limited preview device frames

---

## Proposed Enhancements

### 1. Reorganized Tab Structure (Better Information Architecture)

Replace current 3-tab layout with a more intuitive 5-section collapsible panel design:

| Section | Contents |
|---------|----------|
| **Brand Identity** | Logo, favicon, wordmark, resort name display |
| **Color Palette** | Presets, primary, accent, success/warning overrides, background tint |
| **Typography** | Font family presets, heading weight |
| **UI Components** | Button style, card style, navigation style, corner radius scale |
| **Login Experience** | Hero image, welcome title/subtitle, instructions, form style |

### 2. Enhanced Color System

**Add new color options:**
- **Background Tint**: Subtle overlay color for page backgrounds
- **Success Color**: Override for confirmation states
- **Warning Color**: Override for alert states

**Improved Color Presets:**
```typescript
const ENHANCED_COLOR_PRESETS = [
  { 
    name: 'Ocean Teal', 
    primary: '#0E7490', 
    accent: '#D8C7A6', 
    background: '#F8FAFB',
    description: 'Classic professional' 
  },
  { 
    name: 'Tropical Paradise', 
    primary: '#10B981', 
    accent: '#FDE68A', 
    background: '#F0FDF4',
    description: 'Fresh, vibrant island feel' 
  },
  { 
    name: 'Sunset Luxury', 
    primary: '#DC2626', 
    accent: '#FEF3C7', 
    background: '#FFF7ED',
    description: 'Warm, upscale resort' 
  },
  { 
    name: 'Nordic Spa', 
    primary: '#6366F1', 
    accent: '#E0E7FF', 
    background: '#F5F3FF',
    description: 'Calm, minimalist wellness' 
  },
  { 
    name: 'Midnight Premium', 
    primary: '#A855F7', 
    accent: '#1E1B4B', 
    background: '#0F0F23',
    description: 'Dark mode luxury' 
  },
  { 
    name: 'Desert Oasis', 
    primary: '#B45309', 
    accent: '#FEFCE8', 
    background: '#FFFBEB',
    description: 'Warm, earthy tones' 
  },
  // ... more presets
];
```

### 3. Typography Presets

**Font family options** (Google Fonts, no custom upload needed):
```typescript
const FONT_PRESETS = [
  { name: 'Default', family: 'Plus Jakarta Sans', description: 'Modern professional' },
  { name: 'Elegant', family: 'Playfair Display', description: 'Classic luxury' },
  { name: 'Clean', family: 'Inter', description: 'Minimal tech' },
  { name: 'Friendly', family: 'Nunito', description: 'Approachable rounded' },
  { name: 'Bold', family: 'Montserrat', description: 'Strong contemporary' },
];
```

### 4. UI Component Styles

**Button Styles:**
```typescript
const BUTTON_STYLES = [
  { value: 'rounded', label: 'Rounded', preview: 'rounded-lg', description: 'Modern default' },
  { value: 'pill', label: 'Pill', preview: 'rounded-full', description: 'Soft, approachable' },
  { value: 'squared', label: 'Square', preview: 'rounded-sm', description: 'Sharp, minimal' },
];
```

**Card Styles:**
```typescript
const CARD_STYLES = [
  { value: 'elevated', label: 'Elevated', description: 'Subtle shadows' },
  { value: 'outlined', label: 'Outlined', description: 'Clean borders' },
  { value: 'flat', label: 'Flat', description: 'Minimal, no depth' },
];
```

**Corner Radius Scale:**
- Slider from 0 (sharp) to 24px (very rounded)

### 5. Enhanced Live Preview

**New Preview Features:**
- Device frame selector: Phone, Tablet, Desktop mockups
- Animation toggle to preview transitions
- Side-by-side light/dark comparison
- "View as guest" button that opens actual portal in new tab with temp preview params

### 6. Collapsible Section Layout

Replace tabs with collapsible accordions for better mobile experience and contextual editing:

```tsx
<Accordion type="multiple" defaultValue={['identity', 'colors']}>
  <AccordionItem value="identity">
    <AccordionTrigger>
      <div className="flex items-center gap-2">
        <Fingerprint className="h-4 w-4" />
        Brand Identity
      </div>
    </AccordionTrigger>
    <AccordionContent>
      {/* Logo, Favicon, Wordmark */}
    </AccordionContent>
  </AccordionItem>
  
  <AccordionItem value="colors">
    <AccordionTrigger>
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4" />
        Color Palette
      </div>
    </AccordionTrigger>
    <AccordionContent>
      {/* Color presets, custom colors */}
    </AccordionContent>
  </AccordionItem>
  
  {/* ... more sections */}
</Accordion>
```

### 7. Quick Actions & Guidance

**Add contextual help:**
- Info tooltips for each setting
- "Best practices" tips inline
- Preview indicators showing where each setting appears

**Add quick actions:**
- "Apply preset & save" one-click
- "Copy branding from another resort" (Super Admin only)
- "Export branding configuration" (JSON)
- "Reset this section" per-section controls

---

## Database Schema Changes

Add new columns to the `resorts` table:

```sql
ALTER TABLE resorts
ADD COLUMN brand_button_style TEXT DEFAULT 'rounded' CHECK (brand_button_style IN ('rounded', 'pill', 'squared')),
ADD COLUMN brand_card_style TEXT DEFAULT 'elevated' CHECK (brand_card_style IN ('elevated', 'outlined', 'flat')),
ADD COLUMN brand_corner_radius INTEGER DEFAULT 12,
ADD COLUMN brand_font_family TEXT DEFAULT 'Plus Jakarta Sans',
ADD COLUMN brand_background_tint TEXT,
ADD COLUMN brand_success_color TEXT,
ADD COLUMN brand_warning_color TEXT,
ADD COLUMN favicon_url TEXT;
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/settings/ResortBrandingPage.tsx` | **Major Refactor** | New accordion layout, enhanced sections |
| `src/components/branding/BrandingPreview.tsx` | **Enhance** | Device frames, light/dark comparison |
| `src/components/branding/ColorPresetCard.tsx` | **Create** | Reusable preset card with better visuals |
| `src/components/branding/FontPresetSelector.tsx` | **Create** | Font family picker with preview |
| `src/components/branding/ButtonStyleSelector.tsx` | **Create** | Visual button style picker |
| `src/components/branding/CardStyleSelector.tsx` | **Create** | Visual card style picker |
| `src/components/branding/RadiusSlider.tsx` | **Create** | Corner radius control with live preview |
| `src/components/branding/BrandingSectionHeader.tsx` | **Create** | Consistent section headers with reset |
| `src/hooks/useResortBranding.ts` | **Extend** | Add new branding fields |
| `src/components/guest/GuestLayout.tsx` | **Extend** | Apply new CSS variables for styles |
| `src/index.css` | **Extend** | Add CSS variables for button/card/radius |

---

## UI Mockup: Enhanced Branding Page Layout

```text
┌─────────────────────────────────────────────────────────────────┐
│  ← Settings    Branding                        [Preview] [Save] │
├────────────────────────────────────┬────────────────────────────┤
│                                    │                            │
│  ▼ Brand Identity                  │     ┌──────────────────┐   │
│    ┌──────────┐                    │     │   iPhone 14      │   │
│    │   LOGO   │  Upload Logo       │     │  ╭────────────╮  │   │
│    └──────────┘                    │     │  │ Resort     │  │   │
│    □ Favicon                       │     │  ├────────────┤  │   │
│    Wordmark: [Island Escape    ]   │     │  │            │  │   │
│                                    │     │  │  Welcome!  │  │   │
│  ▼ Color Palette                   │     │  │            │  │   │
│    ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐│     │  │  [Login]   │  │   │
│    │Ocean│ │Tropi│ │Sunse│ │Nordi││     │  │            │  │   │
│    │Teal │ │cal  │ │t    │ │c    ││     │  ╰────────────╯  │   │
│    └──●──┘ └─────┘ └─────┘ └─────┘│     └──────────────────┘   │
│                                    │                            │
│    Primary: [#0E7490] 🎨           │     [Phone] [Tablet] [Web] │
│    Accent:  [#D8C7A6] 🎨           │     [Portal] [Login]       │
│                                    │                            │
│  ► Typography                      │     ────────────────────   │
│                                    │     ◉ Primary  ◉ Accent    │
│  ► UI Components                   │     Theme: Light           │
│                                    │                            │
│  ► Login Experience                │                            │
│                                    │                            │
├────────────────────────────────────┴────────────────────────────┤
│  [Discard Changes]           [Reset to Defaults]    [💾 Save]   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Approach

### Phase 1: Database & Foundation
1. Add new columns to `resorts` table via migration
2. Extend `useResortBranding` hook to include new fields
3. Add CSS variables for new style options in `index.css`

### Phase 2: New Components
1. Create `ColorPresetCard` with improved visual design
2. Create `FontPresetSelector` with live font preview
3. Create `ButtonStyleSelector` and `CardStyleSelector`
4. Create `RadiusSlider` with visual preview

### Phase 3: Page Refactor
1. Refactor `ResortBrandingPage` to use accordion layout
2. Organize settings into logical sections
3. Add per-section reset controls

### Phase 4: Preview Enhancement
1. Add device frame selector to `BrandingPreview`
2. Add light/dark comparison toggle
3. Improve preview responsiveness

### Phase 5: Guest Portal Integration
1. Update `GuestLayout` to read new branding fields
2. Apply dynamic CSS variables for button/card/radius styles
3. Integrate font loading from Google Fonts CDN

---

## Testing Checklist

1. **Color Presets**: Apply each preset, verify all colors change in preview
2. **Custom Colors**: Use color picker, verify hex validation works
3. **Typography**: Select different fonts, verify preview updates
4. **Button Styles**: Toggle between rounded/pill/squared, verify in preview
5. **Card Styles**: Toggle between elevated/outlined/flat, verify in preview
6. **Corner Radius**: Adjust slider, verify preview updates in real-time
7. **Save & Load**: Save settings, refresh, verify all settings persist
8. **Guest Portal**: View as guest, verify all branding applies correctly
9. **Mobile Responsive**: Test settings page on mobile viewport
10. **Reset Controls**: Test per-section reset, verify correct defaults restore

---

## Accessibility Considerations

- All color inputs include contrast checking feedback
- Font previews include size/weight accessibility notes
- Keyboard navigation through all accordion sections
- Screen reader labels for visual-only selectors
- Minimum contrast warnings when selecting colors

