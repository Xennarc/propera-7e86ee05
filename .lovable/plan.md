

## Remove Theme Toggle from Public Pages

The `ThemeToggle` is rendered in `MarketingLayout.tsx` in two places: the desktop nav (line ~79) and the mobile menu button area (line ~91). Both need to be removed.

### Changes

**`src/components/layout/MarketingLayout.tsx`**
1. Remove the `ThemeToggle` import
2. Remove `<ThemeToggle>` from the desktop right-side CTA area (line ~79)
3. Remove `<ThemeToggle>` from the mobile menu button area (line ~91)

1 file, 3 line deletions. Guest pages (`LanguageSwitcher`, guest layout) are unaffected.

