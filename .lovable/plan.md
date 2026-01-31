
# Plan: Fix Actions Button Not Responding on `/superadmin/users`

## Root Cause Identified

The Actions button (three-dot menu) in the Users table is **invisible by default** due to `opacity-0` CSS class. It only becomes visible when hovering over the row.

**Current code (line 555):**
```tsx
<Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
```

This causes two problems:
1. On **mobile/touch devices**, hover doesn't work, so the button is never visible or clickable
2. On **desktop**, users must hover over the row to see the button, which is not intuitive for many users

## Solution

Update the button's className to make it:
- **Always visible on mobile** (touch devices need visible targets)
- **Visible on hover for desktop** (preserves clean aesthetic)
- Add smooth transition for polish

## Technical Change

### File: `src/pages/superadmin/GlobalUsersPage.tsx`

**Line 555 - Change from:**
```tsx
<Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
```

**To:**
```tsx
<Button variant="ghost" size="icon" className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
```

## Breakdown of the Fix

| Class | Effect |
|-------|--------|
| `opacity-100` | Always visible by default (mobile-first) |
| `sm:opacity-0` | Hidden on screens 640px+ (desktop) |
| `sm:group-hover:opacity-100` | Shows on row hover (desktop only) |
| `transition-opacity` | Smooth fade animation |

## Impact Assessment

- **No database changes**
- **No new components**
- **Single line CSS modification**
- **Fully backwards compatible**
- **Significantly improves mobile/touch UX**

## Files Changed

| File | Change |
|------|--------|
| `src/pages/superadmin/GlobalUsersPage.tsx` | Update button className on line 555 |

## Testing Checklist

After implementation:
1. Open `/superadmin/users` on mobile viewport - Actions button should be visible
2. Open on desktop - Actions button appears on row hover
3. Click button - Dropdown menu opens with all actions (Copy ID, Edit Access, Deactivate, etc.)
4. Verify all dropdown actions work correctly
