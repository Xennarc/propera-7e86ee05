
# Plan: Consolidate Requests Inbox into Requests Dashboard

## Overview
Remove the Requests Inbox from sidebar navigation and add a simple access link within the Requests Dashboard page. This keeps both views accessible while decluttering navigation.

---

## Current State

| Component | Location |
|-----------|----------|
| Requests Dashboard | `/staff/requests-dashboard` (sidebar: Guests > Requests Dashboard) |
| Requests Inbox | `/staff/guest-requests` (sidebar: Guests > Requests Inbox) |
| Both appear in sidebar | Under "Guests" navigation group |

---

## Changes Summary

### 1. Remove Requests Inbox from Sidebar Navigation

**File:** `src/components/staff/StaffSidebar.tsx`

Remove the "Requests Inbox" entry from the `navGroups` array:

```typescript
// REMOVE this line (around line 123):
{ title: 'Requests Inbox', url: '/staff/guest-requests', icon: Clock, ... }
```

The route itself remains functional - users can still access it directly or via the Dashboard link.

---

### 2. Add "Inbox View" Button to Dashboard Header

**File:** `src/components/staff/requests-dashboard/DashboardHeader.tsx`

Add a secondary navigation button that links to the Inbox:

```
[Inbox View] [Refresh] [Shortcuts]
```

- Uses a subtle `ghost` variant button with `Inbox` icon
- Links to `/staff/guest-requests`
- Provides easy access without duplicating sidebar clutter

---

### 3. Update StaffCommandBar Reference

**File:** `src/components/staff/StaffCommandBar.tsx`

Update the command bar "Guest Requests" action to point to the Dashboard instead:

```typescript
// Change from:
action: () => navigate('/staff/guest-requests')
// To:
action: () => navigate('/staff/requests-dashboard')
```

---

### 4. Update Internal Links

**Files to update:**

| File | Current Link | New Link |
|------|--------------|----------|
| `src/components/staff/TodayHub.tsx` | `/staff/guest-requests` | `/staff/requests-dashboard` |
| `src/components/staff/dashboard/NeedsAttentionCard.tsx` | `/staff/guest-requests` | `/staff/requests-dashboard` |
| `src/components/staff/dashboard/SmartFAB.tsx` | `/staff/guest-requests/new` | Keep as-is (if valid) or remove |

---

## What Stays the Same

- Route `/staff/guest-requests` remains registered in `App.tsx` (no breaking changes)
- The `StaffRequestsInboxPage` component is preserved (accessible via Dashboard link)
- Mobile bottom navigation is unaffected (doesn't have Requests Inbox)
- All existing functionality in both pages continues to work

---

## Visual Result

**Before (Sidebar):**
```
Guests
├── All Guests
├── Pre-Arrival
├── Requests Dashboard [New]
└── Requests Inbox        <-- REMOVED
```

**After (Sidebar):**
```
Guests
├── All Guests
├── Pre-Arrival
└── Requests Dashboard [New]
```

**Dashboard Header (After):**
```
Requests Dashboard
Last updated 2 minutes ago

[Inbox View] [Refresh] [Shortcuts]
```

---

## Files Changed

| File | Change Type |
|------|-------------|
| `src/components/staff/StaffSidebar.tsx` | Remove nav item |
| `src/components/staff/requests-dashboard/DashboardHeader.tsx` | Add Inbox button |
| `src/components/staff/StaffCommandBar.tsx` | Update navigation target |
| `src/components/staff/TodayHub.tsx` | Update link references |
| `src/components/staff/dashboard/NeedsAttentionCard.tsx` | Update link references |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Broken bookmarks to `/staff/guest-requests` | Route preserved - still accessible |
| Users confused by missing nav item | Clear "Inbox View" button in Dashboard header |
| Minimal code changes | Only navigation config and a single button addition |

This is a low-risk, additive-compatible change that simplifies navigation while preserving all functionality.
