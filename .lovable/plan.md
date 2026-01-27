
# Keep Propera System Colors as Guest Portal Default

## Summary

Currently, when a resort hasn't set custom branding colors, the guest portal uses hardcoded defaults (`#0E7490` teal and `#D8C7A6` sand) that don't match Propera's actual design system. This update will ensure the guest portal uses Propera's signature **Astro Lime** and **Blurple** colors by default, only switching to resort-specific colors when they've been explicitly configured.

---

## Current Problem

| Setting | Current Default | Should Be |
|---------|-----------------|-----------|
| `login_primary_color` | `#0E7490` (teal) | Propera Lime `#C3FF2E` |
| `login_accent_color` | `#D8C7A6` (sand) | Propera Blurple `#5865F2` |

The CSS fallbacks in `index.css` are already correct:
```css
--primary: var(--guest-primary, var(--lime-400));
--accent: var(--guest-accent, var(--blurple-500));
```

But the `getBrandingWithDefaults()` function overrides these by always providing non-null values that get converted to CSS variables.

---

## Solution

### Approach: Let CSS Handle Defaults

Instead of providing fallback hex colors in TypeScript, we'll:

1. Update `DEFAULT_BRANDING` to use `null` for colors (meaning "no custom branding")
2. Modify `getBrandingWithDefaults()` to **not** provide default colors when none are set
3. The CSS `var()` fallbacks will then kick in automatically, using Propera's lime/blurple

This ensures the guest portal uses Propera's system colors until a resort **actively chooses** to customize.

---

## Implementation Details

### File: `src/hooks/useResortBranding.ts`

**Change 1**: Update `DEFAULT_BRANDING` to use `null` for colors

```typescript
// Before
export const DEFAULT_BRANDING: Partial<ResortBranding> = {
  login_primary_color: '#0E7490',
  login_accent_color: '#D8C7A6',
  brand_theme: 'LIGHT',
};

// After
export const DEFAULT_BRANDING: Partial<ResortBranding> = {
  login_primary_color: null,  // Use Propera system colors by default
  login_accent_color: null,   // Use Propera system colors by default
  brand_theme: 'AUTO',        // Follow system preference by default
};
```

**Change 2**: Update `getBrandingWithDefaults()` to preserve null values for colors

```typescript
// Before
return {
  ...branding,
  login_primary_color: branding.login_primary_color || DEFAULT_BRANDING.login_primary_color!,
  login_accent_color: branding.login_accent_color || DEFAULT_BRANDING.login_accent_color!,
  brand_theme: branding.brand_theme || DEFAULT_BRANDING.brand_theme!,
};

// After
return {
  ...branding,
  // Don't override null colors - let CSS defaults handle Propera system colors
  login_primary_color: branding.login_primary_color,
  login_accent_color: branding.login_accent_color,
  brand_theme: branding.brand_theme || 'AUTO',
};
```

### File: `src/components/guest/GuestLayout.tsx`

The existing code already handles null values correctly:

```typescript
const guestPrimaryHSL = hexToHSL(branding.login_primary_color);
// hexToHSL returns null for null input

const brandingStyles: React.CSSProperties = {};
if (guestPrimaryHSL) {
  // Only sets the variable when there's a custom color
  (brandingStyles as Record<string, string>)['--guest-primary'] = guestPrimaryHSL;
}
```

When `guestPrimaryHSL` is `null`, no CSS variable is set, and the CSS fallback kicks in:

```css
--primary: var(--guest-primary, var(--lime-400));
```

---

## Behavior After Changes

| Scenario | Primary Color | Accent Color |
|----------|--------------|--------------|
| No branding set | Astro Lime (`#C3FF2E`) | Blurple (`#5865F2`) |
| Resort sets primary only | Resort's color | Blurple (`#5865F2`) |
| Resort sets both colors | Resort's primary | Resort's accent |
| Resort clears colors | Back to Propera defaults | Back to Propera defaults |

---

## Theme Behavior

Changing `brand_theme` default from `'LIGHT'` to `'AUTO'` means:
- Guests see light/dark mode based on their system preference
- Resorts can still force `LIGHT` or `DARK` in their branding settings

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useResortBranding.ts` | Update `DEFAULT_BRANDING` and `getBrandingWithDefaults()` |

No other files need changes — the CSS fallbacks and GuestLayout null-handling are already in place.

---

## Testing Checklist

- [ ] Guest portal shows lime/blurple when resort has no custom branding
- [ ] Guest portal shows custom colors when resort has set them
- [ ] Clearing branding colors reverts to Propera system colors
- [ ] Theme follows system preference by default (AUTO mode)
- [ ] Existing resorts with custom branding are unaffected
