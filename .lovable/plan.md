
Goal: Fix two critical UX issues in the Guest Portal (Android Chrome, entire portal):
1) Vertical scrolling does not work reliably (or at all).
2) Activity cards’ thumbnails/text appear visually “pulled upward” instead of centered.

What’s most likely happening (based on code inspection)
- The Guest Portal uses a fixed header + fixed bottom nav + a “scrollable main” region:
  - `GuestLayout.tsx`: `<main className="flex-1 overflow-y-auto ...">`
- In flex column layouts, scrollable children frequently fail unless the scroll container is explicitly allowed to shrink via `min-h-0` (or an explicit height constraint is used).
  - Without `min-h-0`, the flex child can grow to fit content instead of becoming a constrained scroll region, resulting in “nothing scrolls” behavior on certain browsers/devices.
- Additionally, `.guest-page-bg` sets `min-height: 100vh` on the same `<main>`, which can fight the desired “constrained height + internal scrolling” model.
- The Activities page header collapse logic is still attached to `window.scrollY`, but the portal’s scroll is inside `<main>`. That mismatch won’t necessarily block scrolling, but it does indicate the system is intended to scroll in `<main>`—so we should align all scroll logic to the `<main>` container.

Plan (implementation steps)

A) Make Guest Portal scrolling robust (primary fix)
Files: `src/components/guest/GuestLayout.tsx`, and small targeted CSS updates in `src/index.css` (only if needed).

1. Constrain the Guest Portal to the viewport and force internal scrolling
- Update the outer guest container to use a real viewport height and hide body-level overflow inside the portal:
  - Change from `min-h-screen` to `h-[100dvh]` (dynamic viewport height is more accurate on mobile)
  - Add `overflow-hidden` so the only scrolling surface is the `<main>` element.

2. Ensure the `<main>` scroll container can actually scroll inside a flex column
- Add `min-h-0` to `<main>` (this is the classic flexbox scroll fix).
- Keep `overflow-y-auto overflow-x-hidden`.
- Consider removing `min-height: 100vh` influence from `.guest-page-bg` when applied to `<main>` (see step A4).

3. Ensure touch scrolling is not blocked
- Confirm `touch-action: pan-y` is applied to the scrolling container (already in `.touch-scroll`).
- Keep `-webkit-overflow-scrolling: touch`.

4. Resolve `.guest-page-bg` height interference
- Today `.guest-page-bg` includes `min-height: 100vh;`.
- When `.guest-page-bg` is applied to the scroll container itself (`<main>`), this can undermine the constrained-scroll design.
- Fix options (minimal-diff approach):
  - Option A (preferred): Move `.guest-page-bg` class from `<main>` to the outer wrapper container, so background is still correct but `<main>` is purely a scroll region.
  - Option B: Adjust `.guest-page-bg` so it doesn’t enforce `min-height: 100vh` when used on a scroll container (e.g., remove `min-height: 100vh` or replace with `min-height: 0` in that class).
- We’ll choose the smallest change that keeps the existing background look identical and restores scrolling.

5. Align “sticky header collapse” logic with the actual scroll container
Files: `src/pages/guest/GuestActivitySessionsPage.tsx` (and later other guest pages if they use window scroll)
- Replace the `window.addEventListener('scroll', ...)` listener with a listener attached to the Guest Portal scroll container (`<main>`).
- Minimal approach without refactors:
  - Query the scroll container in the page via a selector (e.g., `document.querySelector('main')`) and subscribe to its `scroll` event.
- Better approach (slightly more code but cleaner):
  - Expose `mainRef` via a small React context from `GuestLayout` (e.g., `GuestScrollContext`) so pages can subscribe to the correct element.
- Because you requested immediate attention and minimal risk, we’ll do the “selector-based” approach first (smallest change, quickest fix). If later you want, we can formalize it into a context.

Acceptance check for (A)
- On Android Chrome, in the Guest Portal:
  - You can scroll vertically on Home, Activities, Bookings, Requests.
  - Scroll momentum feels natural (no “stuck” scroll).
  - Bottom nav remains fixed; content scrolls behind it.
  - No horizontal drift.

B) Fix Activity card vertical centering (secondary but visible issue)
File: `src/pages/guest/GuestActivitySessionsPage.tsx`

From your screenshot, the card contents look slightly biased upward. The current structure is close, but two things commonly cause that “top-heavy” feel:
- Top row uses `mb-1`, visually weighting content to the top.
- The content column doesn’t have an explicit minimum height that matches the thumbnail, so line-height and padding can make the center feel off.

1. Make the card’s internal layout center consistently
- Ensure the immediate inner layout has consistent height alignment:
  - Keep outer `div` as `flex items-center gap-4` (good)
  - Set the content wrapper to match thumbnail height:
    - Add `min-h-16` or `h-16` (depending on responsiveness) to the content wrapper so its vertical center is defined relative to the thumbnail.
    - Keep `flex flex-col justify-center` so both rows center within that height.

2. Remove “top bias” spacing
- Reduce or remove `mb-1` on the top row and instead use a tighter, symmetric gap:
  - Replace `mb-1` with `gap-[2px]` via `space-y-0.5` on the content wrapper, or use `leading-tight` on text to reduce perceived top padding.
- Ensure both rows use `leading-tight` for consistent vertical rhythm.

3. Make thumbnail images visually centered and consistent
- Add `block` to `<img>` and ensure no baseline alignment issues.
- Confirm `object-cover` and no unexpected line-height behavior.

Acceptance check for (B)
- In `/guest/activities`, each card:
  - Thumbnail sits perfectly centered vertically against the two-line text block.
  - The two-line text block feels centered within the card, not pressed toward the top.
  - Chevron aligns to the vertical middle of the card content.

C) Troubleshooting verification (to ensure we don’t “think” it’s fixed but published still isn’t)
Because you’re seeing this on the published site:
1. We’ll validate in preview first (to confirm the code change truly fixes it).
2. Then you publish and re-test on Android Chrome.
3. If published still differs, we’ll check for:
   - service worker caching / stale assets
   - whether the custom domain is serving a cached build
   - any CSS overrides unique to production
(If needed, we’ll use console + network logs to confirm which CSS/JS bundle is loaded.)

Files expected to change
- `src/components/guest/GuestLayout.tsx`
  - Constrain portal height (`h-[100dvh]`), ensure `overflow-hidden`, ensure `<main>` has `min-h-0`.
  - Potentially relocate `.guest-page-bg` to avoid min-height conflicts.
- `src/index.css`
  - Only if needed: adjust `.guest-page-bg` so it doesn’t force `min-height: 100vh` on the scroll container.
- `src/pages/guest/GuestActivitySessionsPage.tsx`
  - Attach header-collapse scroll listener to the correct scroll container.
  - Fine-tune card vertical centering (min height, spacing, line-height).

Risks / edge cases and how we avoid them
- Risk: Changing height constraints can affect modals/drawers.
  - Mitigation: We keep the portal model consistent: one scrolling surface (`main`), header and bottom nav fixed. This is a standard mobile pattern.
- Risk: `.guest-page-bg` background could shift.
  - Mitigation: Prefer moving the class to a non-scroll element, preserving the fixed pseudo-element background visuals.

Testing checklist (must-do)
1. Android Chrome: scroll on `/guest`, `/guest/activities`, `/guest/requests`, `/guest/bookings`.
2. Activities page: confirm cards are visually centered and not top-biased.
3. Confirm bottom nav is always reachable and doesn’t overlap last card (safe bottom padding still works).
4. Confirm no horizontal scrolling occurs.

If after these changes you still can’t scroll on Android Chrome
- We will immediately inspect:
  - Browser console errors
  - Whether the scroll container has a computed height and `overflow-y: auto`
  - Whether any element overlays the screen (e.g., invisible fixed layer with `pointer-events: auto`)
Using: session replay + console logs + a quick DOM/CSS inspection checklist.
