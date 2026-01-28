
# Fix Guest Requests Not Syncing to Staff Portal

## Problem Summary

Guest requests from "The Residence Falhumaafushi" are being created successfully (confirmed in database), but staff cannot see them. Investigation revealed multiple interconnected issues:

| Area | Issue |
|------|-------|
| **Resort Configuration** | No `request_catalog`, `departments`, or `department_memberships` configured for this resort |
| **Guest Portal UI** | Shows 8 hardcoded categories regardless of resort configuration |
| **RLS Policies** | Staff visibility requires either admin role OR department membership |
| **Multi-Select Mode** | Shows empty grid when no catalog items exist |

---

## Root Cause

The Guest Requests page (`/guest/requests`) displays **hardcoded category tiles** in `RequestCategoryGrid.tsx` that are independent of the resort's actual configuration:

```typescript
// Current: Always shows these categories
const categoryConfigs: CategoryConfig[] = [
  { key: 'HOUSEKEEPING', label: 'Housekeeping', ... },
  { key: 'MINIBAR', label: 'Minibar', ... },
  // ... 8 total hardcoded categories
];
```

When a resort has NO configured catalog items:
1. Guest selects a category → sees empty item list → falls back to free-text input
2. Request is created with the UI category's `department_key` (e.g., `HOUSEKEEPING`)
3. Staff can only see requests if they're Admin OR have department membership for that key
4. Since no departments/memberships are configured, only Admins can view requests

**The requests ARE being created - the issue is visibility on the staff side when not logged in as Admin.**

---

## Solution: Simplify Guest Requests UI for Unconfigured Resorts

When a resort has NO catalog configured, simplify the UI to a single "Make a Request" flow instead of showing misleading category options.

### Phase 1: Detect "Unconfigured" State

**File:** `src/pages/guest/GuestRequestsPage.tsx`

**Logic:** If `catalogItems` is empty after loading, show simplified UI:

```typescript
const hasCatalog = catalogItems && catalogItems.length > 0;

// If no catalog, always use "quick" mode and show simple request form
if (!hasCatalog) {
  return <SimpleRequestFlow ... />;
}
```

### Phase 2: Create Simple Request Flow Component

**New File:** `src/components/guest/requests/SimpleRequestFlow.tsx`

A streamlined single-screen experience when no catalog is configured:
- Large text input for request description
- ASAP/Scheduled toggle
- Submit button
- No confusing category selection

This matches the existing `RequestQuickSheet` but as a full-page experience.

### Phase 3: Route Requests to FRONT_OFFICE by Default

When no catalog/departments configured, all requests should route to `FRONT_OFFICE` (the fallback department that any staff with resort access can handle).

**Update in:** `src/components/guest/requests/SimpleRequestFlow.tsx`

```typescript
await createRequest({
  ...
  departmentKey: 'FRONT_OFFICE', // Universal fallback
  category: 'OTHER',
});
```

### Phase 4: Hide Mode Switcher When No Catalog

The "Quick" vs "Multi-Select" mode switcher is useless when there's no catalog to multi-select from.

**File:** `src/pages/guest/GuestRequestsPage.tsx`

```typescript
// Only show mode switcher when catalog exists
{hasCatalog && (
  <RequestModeSwitcher mode={mode} onModeChange={handleModeChange} />
)}
```

---

## Implementation Details

### New Component: `SimpleRequestFlow.tsx`

```typescript
interface SimpleRequestFlowProps {
  guestId: string;
  resortId: string;
  resortTimezone?: string;
}

export function SimpleRequestFlow({ guestId, resortId, resortTimezone }: SimpleRequestFlowProps) {
  const [requestText, setRequestText] = useState('');
  const [isAsap, setIsAsap] = useState(true);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState('09:00');
  
  const { createRequest, isCreating } = useServiceRequestMutations(guestId, resortId);
  
  const handleSubmit = async () => {
    await createRequest({
      guestId,
      resortId,
      title: requestText.trim(),
      isAsap,
      requestedForAt: scheduledDateTime,
      departmentKey: 'FRONT_OFFICE',
      category: 'OTHER',
    });
    // Reset and show success
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-bold">How can we help?</h1>
        <p className="text-muted-foreground text-sm">
          Tell us what you need and our team will take care of it
        </p>
      </div>
      
      {/* Request Input */}
      <Textarea 
        value={requestText}
        onChange={(e) => setRequestText(e.target.value)}
        placeholder="e.g., Extra towels, room cleaning, wake-up call..."
        rows={4}
        className="text-base" // 16px prevents iOS zoom
      />
      
      {/* Quick Suggestions (hardcoded common requests) */}
      <div className="grid grid-cols-2 gap-2">
        {COMMON_REQUESTS.map((suggestion) => (
          <Button 
            key={suggestion}
            variant={requestText === suggestion ? 'default' : 'outline'}
            onClick={() => setRequestText(suggestion)}
          >
            {suggestion}
          </Button>
        ))}
      </div>
      
      {/* ASAP vs Scheduled */}
      <TimingSelector isAsap={isAsap} onAsapChange={setIsAsap} ... />
      
      {/* Submit */}
      <Button onClick={handleSubmit} disabled={!requestText.trim() || isCreating}>
        {isCreating ? 'Sending...' : 'Send Request'}
      </Button>
      
      {/* Link to My Requests */}
      <Link to="/guest/requests/my">View My Requests</Link>
    </div>
  );
}
```

### Updated GuestRequestsPage Logic

```typescript
export default function GuestRequestsPage() {
  const { guest } = useGuestAuth();
  const { data: catalogItems, isLoading: catalogLoading } = useRequestCatalog(guest?.resortId || '');
  
  // Determine if resort has configured catalog
  const hasCatalog = !catalogLoading && catalogItems && catalogItems.length > 0;
  
  // Pre-arrival check
  if (isPrearrival) {
    return <PrearrivalRequestsBlockedState ... />;
  }
  
  // No catalog = simple flow
  if (!catalogLoading && !hasCatalog) {
    return (
      <SimpleRequestFlow 
        guestId={guest.guestId}
        resortId={guest.resortId}
        resortTimezone={guest.resortTimezone}
      />
    );
  }
  
  // Has catalog = existing category/multi-select flow
  return (
    <div className="space-y-5 pb-24">
      {/* ... existing UI with RequestCategoryGrid ... */}
    </div>
  );
}
```

---

## Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `src/pages/guest/GuestRequestsPage.tsx` | Modify | Add catalog detection, conditionally render SimpleRequestFlow |
| `src/components/guest/requests/SimpleRequestFlow.tsx` | **Create** | New simplified request form component |

---

## Staff Visibility Fix

The staff visibility issue is a **configuration problem** rather than a code bug:

1. Resort Admin SHOULD see all requests (RLS function checks `has_resort_role`)
2. If staff can't see requests, they may not be logged in with the correct account

**Recommendation:** Add a helper query in the Staff Dashboard to show "no departments configured" warning when the resort has no departments, prompting admins to configure them.

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| No catalog configured | Show SimpleRequestFlow |
| Catalog configured | Show category grid + multi-select mode |
| Pre-arrival guest | Show blocked state (existing) |
| Request created | Routes to FRONT_OFFICE (universal fallback) |
| Staff viewing | Admins see all; others need department membership |

---

## Summary

This fix:
1. **Simplifies the guest experience** when no catalog is configured
2. **Eliminates confusing empty category grids** 
3. **Routes all requests to FRONT_OFFICE** ensuring staff visibility
4. **Preserves the full-featured UI** for resorts with configured catalogs
5. **Maintains backward compatibility** with existing requests and workflows
