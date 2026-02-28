# Guest Portal — UI Regression Checklist

> Phase 1 artifact. Run through this checklist on **real devices** (not just Chrome DevTools)
> after any guest UI change. Enable `?uiDebug=1` overlay to visualise safe-area &
> fixed-element boundaries while testing.

---

## 1 — Devices & Browsers

| Device class | Browser | Notes |
|---|---|---|
| iPhone SE (375 × 667) | Safari, Chrome | No notch; small screen |
| iPhone 14/15 (390 × 844) | Safari, Chrome | Dynamic Island + home indicator |
| iPhone 14 Pro Max (430 × 932) | Safari | Largest iOS viewport |
| Small Android (360 × 800) | Chrome | Galaxy S series |
| Large Android (412 × 915) | Chrome, Samsung Internet | Pixel / OnePlus |
| 320 px viewport | any | Stress-test minimum width |
| iPad Mini (768 ×) | Safari | Tablet breakpoint |

---

## 2 — Pages to Test

| Page | Route | Key concerns |
|---|---|---|
| Home | `/guest` | Stay progress, quick actions, suggestions, timeline |
| Activities browser | `/guest/activities` | Category pills scroll, session cards, date picker |
| Activity detail | `/guest/activities/:id` | Sticky book bar, image hero, attendee selector |
| Dining / Restaurants | `/guest/restaurants` | Restaurant cards, slot picker |
| My Bookings | `/guest/bookings` | Tab bar, booking cards, empty state, cancel sheet |
| Profile | `/guest/profile` | Stay info, travel party, push opt-in |
| Requests | `/guest/requests` | Category grid, create sheet, bundle sheet |
| Buggy / Ride | `/guest/buggy` | Request form, live status card |
| Login | `/guest/login` | PIN pad, branding logo, room input |
| Pre-arrival pages | `/guest/prearrival/*` | Countdown, checklists |
| Loyalty | `/guest/loyalty` | Points card, tier badge |
| Room Service | `/guest/room-service` | Menu list, cart, sticky total bar |

---

## 3 — Critical Interactions Checklist

### 3.1 Bottom Navigation

- [ ] Visible at all times on all pages (not hidden behind browser toolbar)
- [ ] Active tab indicator matches current route
- [ ] Tapping a tab scrolls page to top if already on that tab
- [ ] 44 × 44 px minimum tap targets
- [ ] Hides when software keyboard opens
- [ ] Not covered by iOS home indicator (safe-area padding applied)

### 3.2 Sticky CTA / Action Bars

- [ ] `StickyActionBar` sits **above** bottom nav, not overlapping
- [ ] Content below the bar is scrollable and not clipped
- [ ] Bar moves up when keyboard opens (via `useKeyboardInset`)
- [ ] Bar is not visible on desktop (or renders inline variant)

### 3.3 Modals & Bottom Sheets

- [ ] Bottom sheets don't overlap with bottom nav
- [ ] Sheet backdrop covers the entire screen
- [ ] Dismiss via swipe-down works on iOS & Android
- [ ] Sheet content scrolls independently when taller than viewport
- [ ] Focus trapped inside modal for a11y

### 3.4 Toasts / Notifications

- [ ] Toast appears above bottom nav (uses `--guest-nav-h` offset)
- [ ] Toast doesn't overlap with iOS status bar / Dynamic Island
- [ ] Toast auto-dismisses and is manually dismissable

### 3.5 Date & Time Pickers

- [ ] Calendar popover doesn't overflow viewport on small screens
- [ ] Date selected state is visually distinct
- [ ] Tapping outside closes the picker
- [ ] Works with `react-day-picker` and shadcn `Calendar`

### 3.6 Forms & Keyboard

- [ ] All `<input>` and `<textarea>` use `text-base` (16 px) to prevent iOS auto-zoom
- [ ] Focused field scrolls into view above keyboard + sticky bar
- [ ] Bottom nav hides when keyboard is open
- [ ] Dismissing keyboard restores layout correctly

### 3.7 Long Lists / Scrolling

- [ ] Only one scroll container active (no nested scroll traps)
- [ ] Pull-to-refresh doesn't conflict with scroll (if applicable)
- [ ] Overscroll bounce is contained to main area (no body bounce)
- [ ] Scroll position restores when switching tabs via bottom nav
- [ ] List virtualisation works for 50 + items (if applicable)

### 3.8 Empty States

- [ ] All pages show a meaningful empty state (not blank)
- [ ] Empty state has a CTA or explanation
- [ ] Loading skeleton matches final layout (prevents CLS)

### 3.9 Branding / Theming

- [ ] Guest portal respects `--guest-primary` / `--guest-accent` overrides
- [ ] Dark mode renders correctly on all pages
- [ ] Resort logo displays at correct aspect ratio
- [ ] Font override (`brand_font_family`) applies globally

### 3.10 Accessibility Basics

- [ ] Skip-to-content link works
- [ ] All interactive elements reachable via keyboard (Tab)
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1 text, 3:1 UI)
- [ ] Screen reader announces page changes (focus management)

---

## 4 — How to Use the `?uiDebug=1` Overlay

Append `?uiDebug=1` to any guest portal URL to activate the visual debug overlay.

**What it shows:**
- 🟦 Blue dashed outline — scroll container boundaries
- 🟥 Red tinted band — bottom safe-area / nav reserved zone
- 🟩 Green outline — all `position: fixed` elements with labels
- 📐 CSS variable readout panel (top-right corner)

The overlay is **client-side only** and does not affect production unless the query param is present.

---

## 5 — Related Debug Tools

| Tool | Activation | Purpose |
|---|---|---|
| Layout Debug | `?debugLayout=1` | Bottom-stack CSS variable readout |
| Guest Debug Console | `?debug=1` | Query/error tracker, network log |
| PWA Debug | `?pwaDebug=1` | Service worker + manifest diagnostics |
| **UI Debug (new)** | `?uiDebug=1` | Safe-area guides, fixed-element bounds, scroll containers |
