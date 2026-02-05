

# Add Privacy Policy Page

## Overview
Create a dedicated `/privacy` page displaying the Propera privacy policy, using the existing `MarketingLayout` wrapper. Update the footer "Privacy" link (currently `href="#"`) to point to this new page.

## What Changes

### 1. New File: `src/pages/PrivacyPolicyPage.tsx`
- Wrap content in `MarketingLayout` (no `currentPage` prop needed -- it's not a nav item)
- Add `SEOHead` with appropriate title, description, and structured data
- Render the privacy policy text provided by the user in a clean, readable layout
- Use existing Tailwind prose/typography patterns (heading sizes, spacing, muted-foreground for body text) consistent with how the About page structures long-form content
- Sections: Introduction, Information We Collect, Use of Information, Sharing of Information, Cookies and Tracking, Data Security, Jurisdiction, Contact Us
- Include "Last Updated: February 6, 2026" at the top

### 2. Modified File: `src/App.tsx`
- Add lazy import: `const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));`
- Add route: `<Route path="/privacy" element={<PrivacyPolicyPage />} />` alongside the other public routes (`/pricing`, `/about`, `/book-demo`)

### 3. Modified File: `src/components/layout/MarketingLayout.tsx`
- Update the footer "Privacy" link from `<a href="#">` to `<Link to="/privacy">` (using react-router-dom `Link`)
- The "Terms" link stays as `href="#"` for now (no terms page yet)

## Design Approach
- No new components or dependencies
- The page will use the same marketing canvas background, header, and footer as all other public pages
- Content styled with standard heading/paragraph Tailwind classes already used across the codebase
- Mobile-responsive by default (inherits MarketingLayout behavior)

## Technical Details

**Page structure:**
```
MarketingLayout
  SEOHead (title, description, canonical, structured data)
  <section> with container + prose-like layout
    h1: Privacy Policy
    "Last Updated" subtitle
    Sections 1-8 as h2 + p elements
```

**No database, no edge functions, no new dependencies.**

## Files Summary
| File | Action |
|------|--------|
| `src/pages/PrivacyPolicyPage.tsx` | Create |
| `src/App.tsx` | Add lazy import + route |
| `src/components/layout/MarketingLayout.tsx` | Update footer Privacy link |
