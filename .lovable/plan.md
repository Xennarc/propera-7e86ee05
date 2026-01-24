
# Legacy Pre-Arrival Code Cleanup Plan

## Executive Summary

Following the successful migration to the stay-based pre-arrival system, this plan identifies legacy code that can be safely removed while being **extremely cautious** to preserve any components still in active use.

---

## Analysis Summary

### Components Classification

| Category | Status | Action |
|----------|--------|--------|
| **Legacy Routes** (`/prearrival/:token/*`) | Routes active but should redirect | Replace with `LegacyPrearrivalRedirect` |
| **Legacy Pages** (PrearrivalLandingPage, PrearrivalCheckinWizard, PreArrivalPage) | Still handling legacy token URLs | Keep for backward compat, mark as deprecated |
| **Legacy Link Manager** (PrearrivalLinkManager) | Used by PrearrivalProfileCard | Keep until PrearrivalProfileCard is retired |
| **PrearrivalProfileCard** | Used on GuestDetailPage | Keep - still primary staff view |
| **Helper Components** (OperationalFlags, GuestAtAGlanceChips, PrearrivalStatusBadge, PrearrivalHistoryTimeline) | Actively used in staff portal | **KEEP** - shared utility components |
| **URL Utility** (`getPrearrivalUrl`) | Used by multiple components | Keep but mark deprecated |
| **Demo redirect pages** | Already redirecting to new routes | Safe to simplify |

---

## What Can Be Safely Cleaned Up

### Phase 1: Safe Immediate Cleanup (Low Risk)

#### 1.1 Replace Legacy Routes with Redirects
Instead of deleting the legacy pages immediately, replace the route definitions with the `LegacyPrearrivalRedirect` component. This preserves user experience for anyone with old links while not serving the complex legacy pages.

**File: `src/App.tsx`**
- Change routes at lines 300-303 from lazy-loading legacy pages to using `LegacyPrearrivalRedirect`

```typescript
// Before:
<Route path="/prearrival/:token" element={<PrearrivalLandingPage />} />
<Route path="/prearrival/:token/checkin" element={<PrearrivalCheckinWizard />} />
<Route path="/prearrival/:token/experiences" element={<PreArrivalPage />} />

// After:
<Route path="/prearrival/:token" element={<LegacyPrearrivalRedirect />} />
<Route path="/prearrival/:token/checkin" element={<LegacyPrearrivalRedirect />} />
<Route path="/prearrival/:token/experiences" element={<LegacyPrearrivalRedirect />} />
```

#### 1.2 Remove Lazy Imports for Legacy Pages
Remove the lazy import statements for pages that are no longer directly rendered:

```typescript
// Remove these lazy imports:
const PrearrivalLandingPage = lazy(() => import('./pages/prearrival/PrearrivalLandingPage'));
const PrearrivalCheckinWizard = lazy(() => import('./pages/prearrival/PrearrivalCheckinWizard'));
const PreArrivalPage = lazy(() => import('./pages/guest/PreArrivalPage'));
```

#### 1.3 Delete Legacy Page Files
After routes are redirected, these files can be deleted:

| File | Lines | Reason |
|------|-------|--------|
| `src/pages/prearrival/PrearrivalLandingPage.tsx` | 586 | Replaced by unified guest portal |
| `src/pages/prearrival/PrearrivalCheckinWizard.tsx` | ~991 | Replaced by `PrearrivalWizard` in guest portal |
| `src/pages/guest/PreArrivalPage.tsx` | 783 | Replaced by unified booking flow |

**Total: ~2,360 lines removed**

---

### Phase 2: Consolidate Link Generation (Medium Risk)

#### 2.1 Update `GeneratePreArrivalLinkDialog` to Use New System
This dialog still uses the legacy `generate_prearrival_token` RPC. Update it to use the stay-based system:

**File: `src/components/guest/GeneratePreArrivalLinkDialog.tsx`**
- Change from `generate_prearrival_token` to `create_guest_access_link`
- Use `getGuestAccessUrl` instead of `getPrearrivalUrl`

#### 2.2 Update `PrearrivalProfileCard` Send Email Logic
The card's email mutation at line 131 hardcodes the legacy URL format.

**File: `src/components/prearrival/PrearrivalProfileCard.tsx`**
- Update to prefer new stay-based links (similar to `SendPrearrivalEmailDialog`)

---

### Phase 3: Future Cleanup (After Monitoring)

These should **NOT** be removed yet. Wait until telemetry confirms zero legacy usage:

| Component | Reason to Keep |
|-----------|----------------|
| `PrearrivalLinkManager.tsx` | Still embedded in `PrearrivalProfileCard` |
| `SharePrearrivalLinkDialog.tsx` | Used by `PrearrivalLinkManager` |
| `PrearrivalProfileCard.tsx` | Primary staff view for pre-arrival data |
| `getPrearrivalUrl()` | Fallback in `SendPrearrivalEmailDialog` |
| Legacy RPCs (`generate_prearrival_token`, etc.) | Database functions - keep for transition |

---

## What Must NOT Be Removed

### Critical Keep List

| Component | Location | Reason |
|-----------|----------|--------|
| `LegacyPrearrivalRedirect` | `src/components/prearrival/` | Needed for graceful legacy link handling |
| `ExpiredLinkScreen` | `src/components/prearrival/` | Used by both legacy and new systems |
| `GuestAtAGlanceChips` | `src/components/prearrival/` | Used on GuestDetailPage |
| `OperationalFlags` | `src/components/prearrival/` | Used on GuestDetailPage |
| `PrearrivalStatusBadge` | `src/components/prearrival/` | Used across staff portal |
| `PrearrivalHistoryTimeline` | `src/components/prearrival/` | Used in PrearrivalProfileCard |
| `PrearrivalProfileCard` | `src/components/prearrival/` | Primary staff pre-arrival view |
| Guest Portal Prearrival Components | `src/components/guest/prearrival/` | **NEW SYSTEM** - actively used |
| Demo auto-login redirects | `src/pages/guest/DemoGuestAutoLoginPage.tsx` | Backward compat for demo links |

---

## Implementation Details

### Files to Delete (Phase 1)

```text
src/pages/prearrival/
├── PrearrivalLandingPage.tsx    (DELETE - 586 lines)
└── PrearrivalCheckinWizard.tsx  (DELETE - 991 lines)

src/pages/guest/
└── PreArrivalPage.tsx           (DELETE - 783 lines)
```

### Files to Modify (Phase 1)

**`src/App.tsx`:**
1. Remove lazy imports for deleted pages
2. Update routes to use `LegacyPrearrivalRedirect`

### Files to Modify (Phase 2)

**`src/components/guest/GeneratePreArrivalLinkDialog.tsx`:**
1. Check for `guest_stays` record first
2. Use `create_guest_access_link` RPC if available
3. Fall back to legacy only for guests without stays
4. Use `getGuestAccessUrl` for new links

**`src/components/prearrival/PrearrivalProfileCard.tsx`:**
1. Update `sendEmailMutation` to prefer new system
2. Use `getGuestAccessUrl` when stay exists

---

## Code Size Impact

| Action | Lines Removed | Lines Added |
|--------|---------------|-------------|
| Delete legacy pages | ~2,360 | 0 |
| Update App.tsx routes | ~3 | ~3 |
| Update GeneratePreArrivalLinkDialog | 0 | ~20 |
| Update PrearrivalProfileCard | ~5 | ~15 |
| **Net Impact** | **~2,330 lines removed** | |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking old bookmarked links | `LegacyPrearrivalRedirect` provides graceful UX |
| Staff confusion | PrearrivalProfileCard unchanged in this phase |
| Missing data for some guests | Dual-write already active; backfill complete |
| Demo links breaking | `DemoGuestAutoLoginPage` already redirects properly |

---

## Testing Checklist

After cleanup:
- [ ] Visit `/prearrival/any-token` → Should show redirect screen
- [ ] Guest Detail page still shows pre-arrival data
- [ ] `OperationalFlags` render correctly
- [ ] `SendPrearrivalEmailDialog` sends emails successfully
- [ ] New guest access links (`/guest/access?t=...`) work
- [ ] Staff can still generate and share links
- [ ] Demo auto-login still works

---

## Recommended Execution Order

1. **Update `App.tsx`** - Replace routes with redirects
2. **Delete legacy page files** - Remove the 3 large page files
3. **Update `GeneratePreArrivalLinkDialog`** - Use new system
4. **Update `PrearrivalProfileCard`** - Use new system for emails
5. **Verify** - Test all staff and guest flows
6. **Monitor** - Track any errors in console/network logs

---

## Summary

This cleanup removes approximately **2,330 lines** of legacy code while:
- Preserving all active staff portal functionality
- Maintaining backward compatibility via redirects
- Keeping shared utility components (`OperationalFlags`, `GuestAtAGlanceChips`, etc.)
- Not touching the new guest portal prearrival components
- Avoiding database changes (RPCs remain for fallback)

The approach is deliberately conservative - we only remove pages that are no longer routed to, while keeping all components that might still be referenced.
