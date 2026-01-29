
# Fix React Error #185: Maximum Update Depth Exceeded

## Problem Summary
The "Add Resort" button now correctly opens the dialog, but the app crashes with **React Error #185** (Maximum update depth exceeded) immediately when the wizard renders.

## Root Cause

In `CreateResortWizard.tsx`, the `setStepValid` callback is passed to child step components but is **not memoized**:

```tsx
// ❌ Creates a new function on every render
const setStepValid = (stepIndex: number, valid: boolean) => {
  setStepValidation(prev => ({ ...prev, [stepIndex]: valid }));
};
```

Each child step component (e.g., `QuickBrandingStep`) has a `useEffect` that depends on `onValidChange`:

```tsx
// In QuickBrandingStep.tsx
useEffect(() => {
  onValidChange(true);
}, [onValidChange]); // Runs every time onValidChange changes!
```

**The infinite loop sequence:**
1. Parent renders → creates new `setStepValid` function
2. Child renders → `useEffect` runs because `onValidChange` is a new reference → calls `onValidChange(true)`
3. `setStepValidation` updates state in parent → triggers parent re-render
4. Go back to step 1 → infinite loop → crash

---

## Solution

Wrap `setStepValid` in `useCallback` to ensure the function reference remains stable across re-renders.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/resort/CreateResortWizard.tsx` | Wrap `setStepValid` with `useCallback` |

---

## Implementation Details

### CreateResortWizard.tsx

**Current code (line ~107):**
```tsx
const setStepValid = (stepIndex: number, valid: boolean) => {
  setStepValidation(prev => ({ ...prev, [stepIndex]: valid }));
};
```

**Fixed code:**
```tsx
import { useState, useReducer, useCallback } from 'react';

// Memoize the callback to prevent infinite re-renders
const setStepValid = useCallback((stepIndex: number, valid: boolean) => {
  setStepValidation(prev => ({ ...prev, [stepIndex]: valid }));
}, []);
```

This single change ensures:
- `setStepValid` has a **stable reference** across renders
- Child `useEffect` hooks only run when their actual data dependencies change
- No more infinite loop

---

## Testing Checklist

1. Navigate to `/superadmin/resorts`
2. Click "Add Resort"
3. Verify the wizard opens without crashing
4. Complete all 4 steps and create a resort successfully
5. Verify no console errors

---

## Technical Notes

### Why `useCallback` fixes this

`useCallback` returns a memoized version of the callback that only changes if dependencies change. Since `setStepValidation` from `useState` is already stable (React guarantees this), using an empty dependency array `[]` ensures `setStepValid` never changes.

### Alternative approaches (not needed here)

We could also remove `onValidChange` from the child `useEffect` dependency arrays, but that would violate React's exhaustive-deps rule. The proper fix is to memoize the callback in the parent.
