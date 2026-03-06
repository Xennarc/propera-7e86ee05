

## Force Dark Mode on All Public Pages

All public/marketing pages already use `MarketingLayout`. The simplest fix is to wrap `MarketingLayout`'s children in a nested `ThemeProvider` with `forcedTheme="dark"`, which next-themes supports natively — it disables theme switching and locks to dark.

### Changes

**`src/components/layout/MarketingLayout.tsx`**
- Import `ThemeProvider` from `@/components/ThemeProvider`
- Wrap the entire return in `<ThemeProvider forcedTheme="dark">` so all marketing pages are locked to dark mode regardless of user preference

This single change covers: Landing, Pricing, About, Book Demo, Privacy, Terms — every page using `MarketingLayout`. No CSS or other file changes needed.

