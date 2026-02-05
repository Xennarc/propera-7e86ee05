

# Add Terms of Service Page

## Overview
Create a `/terms` page displaying the Propera Terms of Service, following the exact same pattern as the recently added Privacy Policy page. Update the footer "Terms" link to point to it.

## What Changes

### 1. New File: `src/pages/TermsOfServicePage.tsx`
- Wrap content in `MarketingLayout` (no `currentPage` prop -- not a nav item)
- Add `SEOHead` with title "Terms of Service", description, canonical URL `/terms`, and structured data
- Render the 9 sections provided: Acceptance of Terms, User Accounts, User Content, Payments, Intellectual Property, Termination, Limitation of Liability, Governing Law, Changes
- Include "Last Updated: February 6, 2026" subtitle
- Match the exact same styling as `PrivacyPolicyPage.tsx` (same heading sizes, spacing, `muted-foreground` body text, list styles)

### 2. Modified File: `src/App.tsx`
- Add lazy import: `const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage"));`
- Add route: `<Route path="/terms" element={<TermsOfServicePage />} />` alongside `/privacy`

### 3. Modified File: `src/components/layout/MarketingLayout.tsx`
- Line 186: Change `<a href="#" ...>Terms</a>` to `<Link to="/terms" ...>Terms</Link>`

## Design Approach
- No new components, no new dependencies
- Identical layout and styling to the Privacy Policy page
- Mobile-responsive by default via `MarketingLayout`

## Technical Details

| File | Action |
|------|--------|
| `src/pages/TermsOfServicePage.tsx` | Create |
| `src/App.tsx` | Add lazy import + route |
| `src/components/layout/MarketingLayout.tsx` | Update footer Terms link (line 186) |

