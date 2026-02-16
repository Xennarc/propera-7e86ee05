
# Guest Portal Auth Routing Overhaul

## Problem

When a guest is signed out (session expired, logout, PWA cold launch), they land on `/guest/login` -- a generic page that says "Use your resort link." This loses resort context, forcing the guest to re-find their resort. There is no PWA manifest, no canonical entry point, and no resort context persistence across sessions.

## Solution Overview

Add a smart entry route (`/guest/entry`) that resolves resort context from localStorage and routes guests to the correct resort login page. Persist resort context on login and preserve it on logout. Update the auth gate in `GuestLayout` to redirect through this entry route instead of the generic login page.

## Changes

### 1. NEW: `src/lib/guest-resort-context.ts` -- Resort Context Persistence

A small utility module for reading/writing `propera_last_resort` in localStorage.

```text
Shape: { slug: string; id: string; name?: string }
```

- `saveLastResort(slug, id, name?)` -- called after successful login and after find-resort
- `getLastResort()` -- returns saved context or null
- `clearLastResort()` -- NOT called on logout (resort context survives logout)

### 2. NEW: `src/pages/guest/GuestEntryPage.tsx` -- Canonical Entry Route

A lightweight page at `/guest/entry` that:

1. Reads guest session from `useGuestAuth()`
2. If authenticated: redirect to `next` param or `/guest`
3. If not authenticated:
   - Check `getLastResort()` for saved resort slug
   - If slug exists: redirect to `/resort/{slug}/guest/login?returnTo={next}`
   - If no slug: redirect to `/guest/find?returnTo={next}`
4. While resolving, shows a premium "Reconnecting..." screen (ProperaLoader) -- prevents any flicker of protected UI

This page has zero data-fetching dependencies; it only reads localStorage. Resolution is instant.

### 3. EDIT: `src/components/guest/GuestLayout.tsx` -- Update Auth Gate Redirect

Current behavior (line 168-179): redirects unauthenticated users to `/guest/login?returnTo=...`

New behavior: redirect to `/guest/entry?next=...` instead. This lets the entry route resolve the correct resort login page.

Changes:
- Line 171-173: replace `/guest/login?returnTo=...` with `/guest/entry?next=...`
- The loading state (lines 157-165) already shows ProperaLoader, which prevents flicker -- no change needed

### 4. EDIT: `src/contexts/GuestAuthContext.tsx` -- Persist Resort Context

**On login (line 287):** After `localStorage.setItem(GUEST_SESSION_KEY, ...)`, also call `saveLastResort()` using the resort code. Need to fetch resort code since login data only has resort_id. Add a lightweight query alongside the existing resort info fetch (line 258-268) to also grab `code`.

**On logout (line 296-317):** Keep `propera_last_resort` intact (do NOT clear it). Only `GUEST_SESSION_KEY` is cleared, which is already the case.

**On session expiry (line 149-152):** Change `window.location.replace('/guest/login?expired=1')` to `window.location.replace('/guest/entry?expired=1')` so the entry route can resolve the correct resort.

### 5. EDIT: `src/routes/guestRoutes.ts` -- Add Entry Route Constant

Add `ENTRY: '/guest/entry'` to `GUEST_ROUTES`.

### 6. EDIT: `src/App.tsx` -- Register Entry Route

Add route: `<Route path="/guest/entry" element={<GuestEntryPage />} />`

Place it alongside the other public guest routes (near line 346-350).

### 7. NEW: `public/manifest.json` -- PWA Manifest

Create a basic web app manifest:

```text
name: "Propera Guest"
short_name: "Propera"
start_url: "/guest/entry"
display: "standalone"
background_color: "#ffffff"
theme_color: "#1a1a2e"
icons: [reference existing Propera logo assets]
```

### 8. EDIT: `index.html` -- Link Manifest

Add `<link rel="manifest" href="/manifest.json" />` to the `<head>`.

## What Does NOT Change

- No database, RPC, hook, or business logic changes
- No changes to `GuestFindResort`, `ResortGuestLogin`, or any login form logic
- No removal of existing routes (additive-only)
- `/guest/login` continues to work as-is (fallback for direct links)
- No new npm dependencies
- No service worker (no vite-plugin-pwa) -- manifest-only for installability
- Existing `returnTo` param handling in `GuestLogin` and `ResortGuestLogin` is preserved

## Auth Flow Diagram

```text
PWA Launch / Deep Link / Session Expiry
  |
  v
/guest/entry?next=/guest/bookings
  |
  +-- Session valid? --> /guest/bookings
  |
  +-- No session, has last_resort (slug: "oceanview")
  |     --> /resort/oceanview/guest/login?returnTo=/guest/bookings
  |
  +-- No session, no last_resort
        --> /guest/find?returnTo=/guest/bookings
```

## File Summary

| File | Action |
|---|---|
| `src/lib/guest-resort-context.ts` | NEW -- localStorage utility |
| `src/pages/guest/GuestEntryPage.tsx` | NEW -- canonical entry route |
| `public/manifest.json` | NEW -- PWA manifest |
| `src/routes/guestRoutes.ts` | ADD `ENTRY` constant |
| `src/App.tsx` | ADD entry route registration |
| `src/components/guest/GuestLayout.tsx` | EDIT redirect target |
| `src/contexts/GuestAuthContext.tsx` | EDIT persist resort context + update expiry redirect |
| `index.html` | EDIT add manifest link |
