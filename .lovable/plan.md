
# Resort Branding: Portal-Wide Color Application

## Executive Summary

This implementation will extend resort branding colors (primary + accent) from the login page to the entire guest portal. Currently, branding only affects the login screen — this update will make the guest experience feel fully customized to each resort's brand identity.

---

## Current State Analysis

### What Works Now
- **Login page** (`ResortGuestLogin.tsx`): Applies `login_primary_color` to the submit button via inline styles
- **GuestLayout.tsx**: Fetches branding via `useResortBranding` hook but only uses the logo and resort name
- **CSS Variables**: Login page sets `--resort-primary` and `--resort-accent` but these are not consumed anywhere

### What's Missing
| Feature | Status |
|---------|--------|
| Primary color on buttons | Only on login button |
| Primary color on nav indicators | Uses hardcoded `--lime-400` |
| Primary color on cards/highlights | Uses hardcoded `--primary` |
| Accent color usage | Not used anywhere |
| Brand theme (Light/Dark/Auto) | Saved but not enforced |

---

## Solution Architecture

### Core Approach: CSS Custom Properties

Rather than modifying every component with inline styles, we'll set CSS custom properties at the `GuestLayout` root level. This cascades branding colors to all child components automatically.

```text
GuestLayout (sets --guest-primary, --guest-accent)
├── Header (uses --guest-primary for logo fallback bg)
├── NavItem (uses --guest-primary for active indicator)
├── GuestHome
│   ├── Cards (use --guest-primary for highlights)
│   └── Buttons (use --guest-primary)
├── Activities Browser
│   └── Action buttons (use --guest-primary)
└── All other guest pages...
```

---

## Implementation Plan

### 1. Create GuestBrandingProvider Component

**File: `src/components/guest/GuestBrandingProvider.tsx`** (NEW)

A wrapper component that:
1. Consumes branding from the existing `useResortBranding` hook
2. Converts hex colors to HSL for CSS variable compatibility
3. Injects CSS variables into a `<style>` tag or inline styles
4. Optionally enforces `brand_theme` on the guest portal

```text
Props: { children, resortId }
Output: Wraps children with CSS variables applied to a container div
```

Key features:
- Converts hex to HSL (e.g., `#0E7490` → `188 82% 31%`)
- Sets `--guest-primary` and `--guest-accent` CSS variables
- Falls back to default Propera colors when no branding is set
- Handles `brand_theme` by adding/removing dark class

### 2. Create Utility: Hex to HSL Converter

**File: `src/lib/color-utils.ts`** (NEW)

A small utility for converting hex colors to HSL values that work with CSS variables.

```typescript
// Example output
hexToHSL('#0E7490') // Returns "188 82% 31%"
```

### 3. Update GuestLayout to Apply Branding Variables

**File: `src/components/guest/GuestLayout.tsx`**

Changes:
1. Apply branding CSS variables to the root container via inline `style` prop
2. Use the new `hexToHSL` utility to convert colors
3. Optionally enforce `brand_theme` via the `next-themes` provider

Updated root container:
```tsx
<div 
  className="flex min-h-screen flex-col bg-background"
  style={{
    '--guest-primary': hexToHSL(branding.login_primary_color),
    '--guest-accent': hexToHSL(branding.login_accent_color),
  }}
>
```

### 4. Add Guest-Scoped CSS Variables to index.css

**File: `src/index.css`**

Add new CSS variable overrides that apply only within the guest portal:

```css
/* Guest Portal Branding Overrides */
.guest-branded {
  --primary: var(--guest-primary, var(--lime-400));
  --accent: var(--guest-accent, var(--blurple-500));
  --ring: var(--guest-primary, var(--lime-400));
}
```

This means any component using `bg-primary`, `text-primary`, `border-primary` will automatically use the resort's brand color.

### 5. Update Navigation Indicator Colors

**File: `src/components/guest/GuestLayout.tsx`** (NavItem component)

The active indicator currently uses hardcoded lime:
```tsx
// Before
<span className="... bg-primary shadow-[0_0_6px_hsl(var(--lime-400))]" />

// After - uses CSS variable which inherits from guest branding
<span className="... bg-primary shadow-[0_0_6px_hsl(var(--guest-primary))]" />
```

### 6. Update Guest Component Highlights

The following components use `bg-primary/10`, `text-primary`, etc. which will automatically inherit the branding once CSS variables are set:

| Component | Current | After Branding |
|-----------|---------|----------------|
| `GuestQuickActions.tsx` | Category-specific colors | No change needed (category colors stay) |
| `GuestSectionHeader.tsx` | `text-primary` | Auto-inherits branding |
| `GuestStayProgress.tsx` | `bg-primary`, gradient | Auto-inherits branding |
| `GuestTodayTimeline.tsx` | `bg-primary/10`, `text-primary` | Auto-inherits branding |
| `GuestBookingCard.tsx` | Category colors | No change (intentional) |
| `GuestHome.tsx` | `bg-primary/10`, buttons | Auto-inherits branding |
| `GuestActivitiesBrowser.tsx` | Buttons | Auto-inherits branding |
| `GuestRestaurantBrowser.tsx` | Buttons | Auto-inherits branding |

Most components will automatically inherit the new colors because they use Tailwind's `primary` color which maps to the CSS variable.

### 7. Update Button Glow Effect

**File: `src/index.css`**

The `.glow-lime` class is hardcoded to lime. Add a guest-aware version:

```css
.guest-branded .glow-primary {
  box-shadow: 0 0 12px hsl(var(--guest-primary) / 0.4);
}
```

### 8. Handle Brand Theme Enforcement

**File: `src/components/guest/GuestLayout.tsx`**

When `brand_theme` is set, override the theme for the guest portal:

```tsx
import { useTheme } from 'next-themes';

// Inside GuestLayout
const { setTheme, resolvedTheme } = useTheme();

useEffect(() => {
  if (branding.brand_theme === 'LIGHT') {
    setTheme('light');
  } else if (branding.brand_theme === 'DARK') {
    setTheme('dark');
  }
  // 'AUTO' = do nothing, let system preference win
}, [branding.brand_theme]);
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/color-utils.ts` | Hex to HSL conversion utility |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/guest/GuestLayout.tsx` | Apply CSS variables + enforce brand_theme |
| `src/index.css` | Add `.guest-branded` CSS variable overrides |

---

## CSS Variable Cascade

```text
:root (global defaults)
└── .guest-branded (portal container)
    └── --primary overridden to --guest-primary
    └── --accent overridden to --guest-accent
    └── All child components using bg-primary, text-primary, etc.
        automatically use the resort's brand color
```

---

## Color Conversion Details

The branding stores hex colors (e.g., `#0E7490`), but Tailwind CSS variables use HSL without the `hsl()` wrapper:

```css
--primary: 188 82% 31%; /* NOT hsl(188, 82%, 31%) */
```

The `hexToHSL` utility will output the correct format:

```typescript
function hexToHSL(hex: string): string {
  // Convert #0E7490 → "188 82% 31%"
  // This format works with Tailwind's hsl() wrapper
}
```

---

## Fallback Strategy

| Scenario | Behavior |
|----------|----------|
| No branding colors set | Uses default Propera theme (lime/blurple) |
| Invalid hex color | Falls back to default |
| Branding loading | Shows default until loaded |
| Brand theme AUTO | Follows system preference |

---

## Visual Impact

### Before (No Branding Applied)
- All resorts see the same lime/blurple Propera theme
- Login page has custom colors, but portal uses defaults

### After (Branding Applied)
- Each resort's portal uses their configured primary color for:
  - Navigation active indicators
  - Primary buttons
  - Card highlights and focus rings
  - Progress bars and charts
  - Link colors where primary is used
- Accent color available for secondary highlights

---

## Technical Considerations

1. **Performance**: CSS variable changes trigger a repaint but no layout shift
2. **Caching**: Branding is cached via React Query (30s stale time)
3. **SSR**: Not applicable (Vite/React is client-side)
4. **Contrast**: Resorts are responsible for choosing accessible colors

---

## Testing Checklist

- [ ] Branding colors apply to guest portal after login
- [ ] Navigation indicator uses resort primary color
- [ ] Buttons use resort primary color
- [ ] Progress bars use resort primary color
- [ ] Card highlights use resort primary color
- [ ] Default Propera colors work when no branding set
- [ ] Brand theme (LIGHT/DARK) is enforced correctly
- [ ] Changes reflect immediately after staff saves branding
- [ ] Dark mode still works correctly with custom colors
- [ ] Color contrast remains accessible

---

## Summary

This implementation creates a seamless branded experience for guests by:

1. **Setting CSS variables** at the GuestLayout level based on resort branding
2. **Overriding --primary** within `.guest-branded` scope to use resort colors
3. **Leveraging existing Tailwind classes** — most components already use `bg-primary`, `text-primary`, etc.
4. **Enforcing brand_theme** to control light/dark mode in the guest portal
5. **Minimal component changes** — the CSS cascade does most of the work

No business logic or data fetching is modified — purely visual branding application.
