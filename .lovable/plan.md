
# Phase 1-2: PWA Foundations + Service Worker

## Overview

Install `vite-plugin-pwa`, configure it with Workbox-based service worker generation, enhance the manifest, add Apple PWA meta tags, create an offline fallback page, and wire up an update prompt toast. All additive -- no existing routes, auth, or realtime flows are modified.

## Phase 1 -- PWA Foundations

### 1a. Install `vite-plugin-pwa`

Add `vite-plugin-pwa` as a dev dependency. This handles manifest generation, service worker creation, and update lifecycle.

### 1b. Configure `vite-plugin-pwa` in `vite.config.ts`

Add the `VitePWA()` plugin with:

```text
registerType: 'prompt'         -- prompts user before activating new SW (safe for booking flows)
manifest: { ... }              -- full manifest (replaces static manifest.json)
workbox:
  navigateFallback: '/index.html'
  navigateFallbackDenylist: [/^\/~oauth/, /^\/api/]   -- never cache OAuth or API routes
  runtimeCaching: [...]        -- see Phase 2 caching rules below
  globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}']
```

Manifest fields:
- name: "Propera Guest"
- short_name: "Propera"
- start_url: "/guest/entry"
- scope: "/"
- display: "standalone"
- background_color: "#0B0E14"
- theme_color: "#0B0E14"
- icons: 192x192 + 512x512 (both "any" and "maskable" purpose variants, using existing Propera logo asset)

### 1c. Delete static `public/manifest.json`

Since `vite-plugin-pwa` generates the manifest automatically from config, the static file is replaced. The `<link rel="manifest">` tag in `index.html` is also removed (the plugin injects it).

### 1d. Add Apple PWA meta tags to `index.html`

Add inside `<head>`:

```text
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" sizes="512x512" href="[propera-512-icon-url]">
```

Remove the duplicate/existing `<link rel="manifest" href="/manifest.json">` since the plugin auto-injects it.

## Phase 2 -- Service Worker + Caching

### 2a. Runtime caching rules (in vite.config.ts VitePWA config)

| Pattern | Strategy | Purpose |
|---|---|---|
| Google Fonts stylesheets | StaleWhileRevalidate | Font CSS |
| Google Fonts webfonts | CacheFirst (1 year) | Font files |
| Propera logo/icon assets (storage.googleapis.com) | CacheFirst (30 days) | App icons |
| Supabase REST API `/rest/v1/*` (GET only) | NetworkFirst (3s timeout) | Data queries (activities, dining catalogs) |
| All other Supabase API calls | NetworkOnly | Auth, mutations, realtime -- never cache |

### 2b. Offline fallback page

**New file: `src/pages/guest/GuestOfflinePage.tsx`**

A mobile-first offline page showing:
- WifiOff icon + "You're offline" heading
- "Some features are unavailable without a connection" subtext
- "Try Again" button that calls `window.location.reload()`
- Propera branding (ProperaMark logo)
- Uses existing design tokens (bg-background, text-foreground, etc.)

**New file: `public/offline.html`**

A minimal static HTML fallback (served by the service worker when navigation fails and no cache is available). Contains inline CSS matching Propera's dark theme with a simple "You're offline" message and reload button. This is the last-resort fallback before the React app loads.

### 2c. Register service worker + update prompt

**New file: `src/lib/pwa-registration.ts`**

Uses `vite-plugin-pwa/vanilla` to register the SW and listen for updates. Exports:
- `registerPWA()` -- called once from `main.tsx`
- An event-based mechanism that fires when an update is available

**Edit: `src/main.tsx`**

Add `registerPWA()` call after React renders.

### 2d. Update toast in GuestLayout

**New file: `src/components/guest/GuestUpdatePrompt.tsx`**

A small component that listens for SW update events and shows a `sonner` toast:
- "A new version is available"
- "Refresh" button that calls `updateSW(true)` to activate the new service worker and reload
- Only appears on safe screens (not during active booking -- checks current route)

**Edit: `src/components/guest/GuestLayout.tsx`**

Add `<GuestUpdatePrompt />` inside the layout (after header, before main content). Additive only.

### 2e. Offline-aware action guard

**New file: `src/hooks/useOfflineActionGuard.ts`**

A thin hook that wraps the existing `useOnlineStatus`:

```typescript
function useOfflineActionGuard() {
  const isOnline = useOnlineStatus();
  
  const guardAction = (action: () => void, message?: string) => {
    if (!isOnline) {
      toast.error(message || "You're offline. This action requires an internet connection.");
      return;
    }
    action();
  };
  
  return { isOnline, guardAction };
}
```

This can be adopted incrementally by booking/request forms -- no existing code is modified. It's a utility for future use.

## What Does NOT Change

- No database, RPC, or hook changes
- No route changes (all existing routes preserved)
- No changes to GuestAuthContext, GuestEntryPage, or login flows
- No changes to realtime subscriptions
- No removal of existing components (additive-only)
- Existing `OfflineBanner` component stays as-is
- `useOnlineStatus` hook stays as-is
- No push notification code (deferred to later phase)

## File Summary

| File | Action |
|---|---|
| `package.json` | ADD `vite-plugin-pwa` dev dependency |
| `vite.config.ts` | ADD VitePWA plugin with manifest + workbox config |
| `public/manifest.json` | DELETE (replaced by plugin-generated manifest) |
| `public/offline.html` | NEW -- static offline fallback |
| `index.html` | EDIT -- add Apple PWA meta tags, remove static manifest link |
| `src/pages/guest/GuestOfflinePage.tsx` | NEW -- React offline page |
| `src/lib/pwa-registration.ts` | NEW -- SW registration + update listener |
| `src/main.tsx` | EDIT -- call registerPWA() |
| `src/components/guest/GuestUpdatePrompt.tsx` | NEW -- update toast component |
| `src/components/guest/GuestLayout.tsx` | EDIT -- add GuestUpdatePrompt (1 line) |
| `src/hooks/useOfflineActionGuard.ts` | NEW -- offline action guard utility |

## QA Testing Checklist

- [ ] **Installability**: Visit guest portal on Android Chrome / iOS Safari. Confirm "Add to Home Screen" prompt appears or is available via browser menu
- [ ] **PWA launch**: Open from home screen. Verify it launches in standalone mode (no browser chrome) at `/guest/entry`
- [ ] **Deep links**: Navigate to `/guest/activities` while logged in, kill app, reopen from home screen -- verify correct landing
- [ ] **Offline navigation**: Enable airplane mode. Cached pages (home, activities catalog) should still render from cache. Non-cached pages show offline fallback
- [ ] **Offline action guard**: While offline, attempt a booking. Verify toast error appears and no silent failure
- [ ] **Booking flow unaffected**: Complete a full activity booking and restaurant reservation while online. Verify no SW interference
- [ ] **Service worker update**: Deploy a code change. Revisit the app. Verify "New version available" toast appears with Refresh CTA
- [ ] **Lighthouse**: Run Lighthouse PWA audit on `/guest`. Target: all PWA criteria pass (installable, SW registered, offline fallback, manifest valid)
- [ ] **Auth flow intact**: Log out, verify redirect to `/guest/entry`, login via resort page. No SW caching of auth state
