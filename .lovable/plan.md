

## Problem: Service Worker Caches Stale Content

The `vite-plugin-pwa` with `registerType: 'autoUpdate'` **precaches** all built assets and uses `navigateFallback: '/index.html'`. When a new build deploys:

1. The old service worker still controls the page and serves cached assets
2. `autoUpdate` downloads the new SW in the background, but doesn't activate until the **next navigation** (not a refresh — the old SW still serves the old `index.html`)
3. The Workbox `runtimeCaching` rule for Supabase API (`NetworkFirst` with 3s timeout) can also serve stale API responses on slow connections

Additionally, the update check interval is **60 minutes**, meaning users can go an hour without even knowing there's an update.

## Fix (3 targeted changes)

### 1. `vite.config.ts` — Force immediate SW activation

Add `skipWaiting: true` and `clientsClaim: true` to the Workbox config. This makes new service workers activate immediately instead of waiting for all tabs to close.

```ts
workbox: {
  skipWaiting: true,
  clientsClaim: true,
  // ... rest stays the same
}
```

### 2. `src/lib/pwa-registration.ts` — Reduce update check to 5 minutes

Change the 60-minute interval to 5 minutes so new deployments are picked up faster:

```ts
setInterval(() => {
  registration.update();
  pwaStatus.lastUpdateCheck = new Date();
}, 5 * 60 * 1000); // 5 minutes instead of 60
```

### 3. `vite.config.ts` — Add cache-busting to navigateFallback

Ensure the `index.html` itself isn't aggressively cached by adding it to `navigateFallbackDenylist` patterns and setting `cleanupOutdatedCaches: true`:

```ts
workbox: {
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  // ... existing config
}
```

### Files modified
- `vite.config.ts` — add `skipWaiting`, `clientsClaim`, `cleanupOutdatedCaches`
- `src/lib/pwa-registration.ts` — reduce update check interval from 60 min to 5 min

