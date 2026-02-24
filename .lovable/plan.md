

## Hide Theme Toggle from All Public Pages

Remove the `ThemeToggle` component from every public-facing page while keeping it on staff/admin pages.

### Files to modify (8 files, all removals)

| File | Lines | What to remove |
|------|-------|----------------|
| `src/components/guest/GuestLayout.tsx` | 17, 307 | Import + `<ThemeToggle>` in header actions |
| `src/components/layout/MarketingLayout.tsx` | 5, 81 | Import + `<ThemeToggle>` in desktop nav |
| `src/pages/guest/GuestLogin.tsx` | 7, 39-42 | Import + wrapper div with `<ThemeToggle>` |
| `src/pages/guest/GuestFindResort.tsx` | 12, 118-121 | Import + wrapper div with `<ThemeToggle>` |
| `src/pages/guest/ResortGuestLogin.tsx` | 13, 262, 296, 330, 414 | Import + all 4 instances of `<ThemeToggle>` in various auth states |
| `src/pages/resorts/ResortMarketingPage.tsx` | 8, 133 | Import + `<ThemeToggle>` in header |
| `src/pages/Auth.tsx` | 13, 193, 281 | Import + both instances on staff auth page (this is the public staff login) |

### What stays unchanged

- `src/components/layout/AppLayout.tsx` -- staff console topbar (internal, behind auth)
- `src/components/staff/StaffTopbar.tsx` -- staff topbar variant (internal, behind auth)
- `src/components/ThemeToggle.tsx` -- the component itself remains available

### Technical detail

Each removal is straightforward: delete the import line and the JSX element (plus its wrapper `<div>` where applicable). No logic changes, no new components. The public pages will simply use whatever theme is set (defaulting to the current theme or system preference) without exposing a toggle to guests.

