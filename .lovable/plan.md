

# Simplify Guest Request Submission (Remove Double Prompt)

## Problem
The current request submission flow requires **two prompts** to send a request:
1. **Sticky bar**: "Send request" button → Opens review sheet
2. **Review sheet**: "Submit Request" button → Actually submits

This feels redundant and slows down the guest experience. Most users select items and want to submit immediately.

---

## Solution: Streamlined Single-Prompt Flow

**New behavior**: The sticky bar "Send request" button submits directly (ASAP by default). The review sheet becomes optional - accessible via a secondary "Review" action for users who want to adjust quantities, add notes, or schedule.

| Current Flow | New Flow |
|--------------|----------|
| Select items → Click "Send" → Sheet opens → Click "Submit" | Select items → Click "Send" → **Submits immediately** |
| 2 taps to submit | 1 tap to submit |
| Review sheet is mandatory | Review sheet is optional (via "Review" link) |

---

## UI Changes

### 1. Update Sticky Bar (`RequestsStickyBar.tsx`)

**Before:**
```
[Shopping bag icon] 2 items selected    [Send request →]
                    1 unique item
```

**After:**
```
[Shopping bag icon] 2 items selected    [Review]  [Send now ⚡]
                    1 unique item
```

- **"Send now"** button: Submits immediately with ASAP timing (primary action)
- **"Review"** link: Opens the bundle sheet for users who want to edit quantities, add notes, or schedule (secondary action)

### 2. Update `GuestRequestsPage.tsx`

Add a new handler for direct submission:
- `handleDirectSubmit()`: Calls `createBundle()` with selected items, `isAsap: true`, and any notes from the inline notes card
- Success shows toast with "View My Requests" action
- Error keeps items selected so user can retry

Keep `handleOpenReview()` for the optional review flow.

### 3. Simplify Notes Input

The `RequestNotesCard` already exists on the catalog page. Notes entered there will be passed to direct submission, so users can add notes without opening the sheet.

---

## Technical Details

### File: `src/components/guest/requests/RequestsStickyBar.tsx`

**Changes:**
1. Add new prop: `onDirectSubmit: () => void`
2. Rename `onSubmit` to `onReview` for clarity
3. Add two buttons:
   - Secondary "Review" button (outline variant) → calls `onReview`
   - Primary "Send now" button → calls `onDirectSubmit`
4. Show loading state on "Send now" when `isSubmitting`

```tsx
interface RequestsStickyBarProps {
  selectedCount: number;
  totalQuantity: number;
  onDirectSubmit: () => void;  // New: immediate submission
  onReview: () => void;        // Opens review sheet
  isSubmitting?: boolean;
  disabled?: boolean;
}
```

**New UI layout:**
```tsx
<div className="flex items-center gap-2">
  <Button variant="ghost" size="sm" onClick={onReview}>
    Review
  </Button>
  <Button onClick={onDirectSubmit} disabled={isSubmitting}>
    {isSubmitting ? <Loader2 /> : <Zap />}
    Send now
  </Button>
</div>
```

### File: `src/pages/guest/GuestRequestsPage.tsx`

**Changes:**
1. Add `handleDirectSubmit` handler:
```tsx
const handleDirectSubmit = async () => {
  if (selectedItems.length === 0) return;
  
  try {
    await createBundle({
      items: selectedItems.map(i => ({ catalogId: i.catalogId, quantity: i.quantity })),
      isAsap: true,
      guestNotes: notes.trim() || undefined,
    });
    
    setSelectedItems([]);
    setNotes('');
    // Toast with action shown by mutation onSuccess
  } catch (error) {
    console.error('Failed to submit request:', error);
  }
};
```

2. Update `RequestsStickyBar` props:
```tsx
<RequestsStickyBar
  selectedCount={selectedItems.length}
  totalQuantity={totalSelectedCount}
  onDirectSubmit={handleDirectSubmit}
  onReview={handleOpenReview}
  isSubmitting={isCreatingBundle}
  disabled={selectedItems.length === 0}
/>
```

---

## User Experience Summary

| User Goal | New Flow |
|-----------|----------|
| Quick ASAP request | Select items → "Send now" (1 tap) |
| Add notes | Type in notes card → "Send now" (1 tap) |
| Adjust quantities | Select items → "Review" → Adjust → "Submit" (2 taps) |
| Schedule for later | Select items → "Review" → Pick time → "Submit" (2 taps) |

**Result**: The 80% use case (quick ASAP requests) becomes a single tap. The 20% use case (scheduled/adjusted requests) remains available via "Review".

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/guest/requests/RequestsStickyBar.tsx` | Add dual-button layout, new `onDirectSubmit` prop |
| `src/pages/guest/GuestRequestsPage.tsx` | Add `handleDirectSubmit`, update sticky bar props |

---

## Verification

After implementation:
1. Select 1-2 items → Click "Send now" → Request submits immediately (no sheet)
2. Toast shows "Request sent to [Department]" with "View My Requests" action
3. Click "Review" → Sheet opens as before for quantity/time adjustments
4. Notes entered on catalog page are included in direct submission
5. Sheet still works for full edit flow when accessed via "Review"

