

# Phase 3-5: Update UX, Performance, and Push Notifications

## Overview

Implement the remaining three phases of the PWA plan: superadmin-only debug overlay for service worker status, route prefetching after guest login for faster navigation, and a feature-flagged push notification prompt. All changes are additive-only.

---

## Phase 3 -- Update UX and PWA Debug

### 3a. Enhance `pwa-registration.ts` with status tracking

Export a reactive `getPWAStatus()` function that returns:

```text
{
  swRegistered: boolean;
  swVersion: string | null;     // from SW scope URL hash or build timestamp
  cacheVersion: string | null;  // derived from SW script URL
  lastUpdateCheck: Date | null;
  updateAvailable: boolean;
}
```

Track these values in module-level variables updated during the `onRegisteredSW` and `onNeedRefresh` callbacks. This is purely informational -- no behavior change.

### 3b. NEW: `src/components/guest/GuestPWADebugOverlay.tsx`

A floating debug panel (bottom-left, above nav) shown only when `?pwaDebug=1` is in the URL. Displays:

- SW registered: yes/no
- SW scope URL
- Cache version (derived from script URL)
- Last update check time
- Update available: yes/no
- "Force Check Update" button (calls `registration.update()`)

Uses a simple `Card` with `fixed` positioning. Gated behind:
1. URL param `pwaDebug=1`
2. Rendered inside `GuestLayout` alongside the existing debug panel conditional

No external data fetching. Reads from `getPWAStatus()` on an interval (every 5s).

### 3c. EDIT: `src/components/guest/GuestLayout.tsx`

Add `<GuestPWADebugOverlay />` next to the existing `GuestDebugConsole` conditional. Gate it with `searchParams.get('pwaDebug') === '1'`. One line addition.

### 3d. Enhance `GuestUpdatePrompt` with `skipWaiting` safety

The current implementation is already safe (uses `registerType: 'prompt'` so `skipWaiting` only fires on explicit user action via the "Refresh" button). No changes needed to the activation strategy.

Add one improvement: if the user is on an unsafe route when the update event fires, store a flag and re-check on every subsequent navigation. Edit the component to track a `pendingUpdate` state that triggers the toast when the user navigates to a safe route.

---

## Phase 4 -- Performance Optimization

### 4a. NEW: `src/hooks/useGuestRoutePrefetch.ts`

A hook called once after guest authentication succeeds (inside `GuestLayoutInner`). Uses `router.prefetch` is not available in react-router-dom v6, so instead uses programmatic `<link rel="prefetch">` injection for the lazy chunk URLs of key guest routes.

Approach: After mount + 2s idle delay, inject `<link rel="prefetch" href="...">` tags for:
- `/guest/activities` chunk
- `/guest/restaurants` chunk
- `/guest/bookings` chunk

Since these are lazy-loaded via `React.lazy()`, the prefetch will warm the browser cache for the JS chunks. The hook uses `requestIdleCallback` (with fallback to `setTimeout`) to avoid impacting initial render performance.

### 4b. EDIT: `src/components/guest/GuestLayout.tsx`

Call `useGuestRoutePrefetch()` inside `GuestLayoutInner` (one line). This fires only for authenticated guests.

### 4c. EDIT: `vite.config.ts` -- Optimize chunk splitting

Add guest-specific manual chunks to ensure staff/admin code never loads in the guest bundle:

```text
manualChunks: {
  'lucide-icons': ['lucide-react'],
  'react-vendor': ['react', 'react-dom', 'react-router-dom'],
  'recharts': ['recharts'],  // Only used by staff dashboards
  'framer-motion': ['framer-motion'],
}
```

Adding `recharts` and `framer-motion` as separate chunks prevents them from being bundled into the guest entry chunk (they are only used by staff pages).

---

## Phase 5 -- Push Notifications (Feature-Flagged)

### 5a. Add feature flag to registry

Add to `FEATURE_FLAG_REGISTRY`:

```text
{
  key: 'enable_guest_push_notifications',
  label: 'Guest Push Notifications',
  description: 'Allow guests to opt in to browser push notifications for booking updates and alerts.',
  category: 'experimental',
  tier: 'professional',
  is_dangerous: false,
  scope: 'resort',
}
```

### 5b. Database migration: `push_subscriptions` table

Create a new table to store Web Push subscriptions:

```sql
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  resort_id uuid NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  UNIQUE (guest_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Guests can manage their own subscriptions via RPCs only (no direct access)
-- Staff/admin can view subscriptions for their resort
CREATE POLICY "Staff can view push subscriptions for their resort"
  ON public.push_subscriptions
  FOR SELECT
  TO authenticated
  USING (resort_id IN (
    SELECT urr.resort_id FROM user_resort_roles urr WHERE urr.user_id = auth.uid()
  ));
```

### 5c. NEW: `src/hooks/useGuestPushNotifications.ts`

A hook that manages the push notification lifecycle:

1. Check if `enable_guest_push_notifications` feature flag is on (via `useFeatureEnabled`)
2. Check browser support (`'serviceWorker' in navigator && 'PushManager' in window`)
3. Check current permission state (`Notification.permission`)
4. Expose `requestPermission()` function that:
   - Calls `Notification.requestPermission()`
   - If granted, gets the push subscription from SW registration
   - Saves the subscription to `push_subscriptions` table via an RPC
   - Returns success/failure
5. Expose state: `{ isSupported, permission, isSubscribed, requestPermission }`

The hook does NOT auto-prompt. It only provides the mechanism for UI to trigger it.

### 5d. NEW: `src/components/guest/GuestPushOptIn.tsx`

A small, dismissible banner/card shown on GuestHome after a meaningful action (e.g., first booking confirmed). Conditions to show:

1. Feature flag `enable_guest_push_notifications` is enabled
2. Browser supports push
3. Permission is `'default'` (not yet asked)
4. User has made at least 1 booking (check from existing bookings query)
5. User hasn't dismissed this prompt (tracked in localStorage `propera_push_dismissed`)

UI: A subtle card with bell icon, "Get notified about your bookings" text, "Enable" primary button, and "Not now" dismiss link. On iOS Safari where push is limited, show appropriate messaging.

### 5e. EDIT: `src/pages/guest/GuestHome.tsx`

Add `<GuestPushOptIn />` component below the onboarding tour section (additive, one line). It self-gates via the feature flag and conditions listed above.

### 5f. NEW: Edge function `send-push-notification`

A backend function that can be called to send push notifications to a guest:

- Reads subscription(s) from `push_subscriptions` for the target guest
- Uses the Web Push protocol to deliver the notification
- Requires VAPID keys stored as secrets (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`)
- This is a foundation -- actual trigger integration (e.g., on booking confirmation) would be wired incrementally later

**Note:** This phase requires VAPID keys to be configured as secrets. The implementation will include the code but the actual sending will only work once the keys are provided.

---

## What Does NOT Change

- No existing routes, auth flows, or booking logic modified
- No changes to GuestAuthContext or realtime subscriptions
- No removal of existing components (additive-only)
- Existing notification system (`notifications` table, `create_guest_notification` RPC) stays as-is
- Push notifications are fully behind a feature flag and do not activate without explicit opt-in
- No changes to staff portal or driver portal

## File Summary

| File | Action |
|---|---|
| `src/lib/pwa-registration.ts` | EDIT -- add PWA status tracking exports |
| `src/components/guest/GuestPWADebugOverlay.tsx` | NEW -- debug overlay for ?pwaDebug=1 |
| `src/components/guest/GuestUpdatePrompt.tsx` | EDIT -- add pending update re-check on navigation |
| `src/components/guest/GuestLayout.tsx` | EDIT -- add debug overlay + prefetch hook (2 lines) |
| `src/hooks/useGuestRoutePrefetch.ts` | NEW -- idle-time route prefetching |
| `vite.config.ts` | EDIT -- add recharts/framer-motion chunk splitting |
| `src/lib/feature-flag-registry.ts` | EDIT -- add push notifications flag |
| **Migration SQL** | NEW -- `push_subscriptions` table |
| `src/hooks/useGuestPushNotifications.ts` | NEW -- push notification lifecycle hook |
| `src/components/guest/GuestPushOptIn.tsx` | NEW -- opt-in banner on GuestHome |
| `src/pages/guest/GuestHome.tsx` | EDIT -- add GuestPushOptIn (1 line) |
| `supabase/functions/send-push-notification/index.ts` | NEW -- edge function for Web Push delivery |

## QA Testing Checklist

- [ ] **PWA Debug**: Visit `/guest?pwaDebug=1`. Verify overlay shows SW status, cache info, and "Force Check" button works
- [ ] **Update re-check**: Navigate to a booking flow, trigger SW update (deploy change), then navigate back to home -- verify toast appears on safe route
- [ ] **Route prefetch**: After login, check Network tab -- verify `/guest/activities`, `/guest/restaurants`, `/guest/bookings` chunks prefetch after ~2s idle
- [ ] **Chunk splitting**: Run `npm run build`, verify `recharts` and `framer-motion` are in separate chunks not loaded on guest routes
- [ ] **Push opt-in**: Enable `enable_guest_push_notifications` flag, make a booking, return to home -- verify opt-in card appears
- [ ] **Push dismiss**: Click "Not now" on push opt-in, reload page -- verify it stays dismissed
- [ ] **Push subscribe**: Click "Enable" on opt-in card (Chrome) -- verify permission prompt, subscription saved to `push_subscriptions` table
- [ ] **iOS graceful**: On iOS Safari, verify push opt-in shows appropriate messaging about platform limitations
- [ ] **No regression**: Complete a full booking flow (activity + restaurant). Verify no interference from any new code
- [ ] **Lighthouse**: Run Lighthouse on `/guest`. Verify PWA score remains passing, Performance score stable or improved

