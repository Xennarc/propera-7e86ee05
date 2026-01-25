

# Fix: "Cannot read properties of null (reading 'id')" on Guests Page

## Root Cause

The error occurs in `src/pages/guests/GuestsPage.tsx` when passing `currentResort.id` and `currentResort.code` as props to `GuestDialog`. While there's an early return guard at line 319, React's state transitions (e.g., during resort switching or context updates) can briefly cause `currentResort` to become `null`, bypassing the guard during re-renders.

**Affected Line:**
```tsx
<GuestDialog
  open={dialogOpen}
  onOpenChange={setDialogOpen}
  guest={editingGuest}
  resortId={currentResort.id}    // ← Crashes if currentResort is null
  resortCode={currentResort.code} // ← Crashes if currentResort is null
  onSuccess={() => {...}}
/>
```

## Fix Strategy

**Approach: Conditional Rendering with Fallback Values**

Add null safety by:
1. Using optional chaining with empty string fallback for props
2. Conditionally preventing dialog from opening if `currentResort` is null

## Code Changes

### File: `src/pages/guests/GuestsPage.tsx`

**Change 1: Wrap GuestDialog with null guard (lines 587-596)**

```tsx
// Before
<GuestDialog
  open={dialogOpen}
  onOpenChange={setDialogOpen}
  guest={editingGuest}
  resortId={currentResort.id}
  resortCode={currentResort.code}
  onSuccess={() => {
    // React Query will auto-refetch via invalidation
  }}
/>

// After
{currentResort && (
  <GuestDialog
    open={dialogOpen}
    onOpenChange={setDialogOpen}
    guest={editingGuest}
    resortId={currentResort.id}
    resortCode={currentResort.code}
    onSuccess={() => {
      // React Query will auto-refetch via invalidation
    }}
  />
)}
```

**Change 2: Add safety to SendPrearrivalEmailDialog (lines 620-627)**

The `SendPrearrivalEmailDialog` doesn't require `currentResort` as a prop (it uses context internally), but we should ensure it only opens when resort is available:

```tsx
// Before
<SendPrearrivalEmailDialog
  open={sendEmailDialogOpen}
  onOpenChange={setSendEmailDialogOpen}
  guests={emailTargetGuests}
  onSuccess={() => {
    setSelectedGuests(new Set());
  }}
/>

// After
{currentResort && (
  <SendPrearrivalEmailDialog
    open={sendEmailDialogOpen}
    onOpenChange={setSendEmailDialogOpen}
    guests={emailTargetGuests}
    onSuccess={() => {
      setSelectedGuests(new Set());
    }}
  />
)}
```

**Change 3: Add safety to button click handlers (lines 337-343, 438)**

Prevent opening dialogs if resort is null:

```tsx
// Add Guest button click handler (line 338)
onClick={() => { 
  if (!currentResort) return;  // Add guard
  setEditingGuest(null); 
  setDialogOpen(true); 
}}

// Empty state Add Guest button (line 438)
onClick={() => { 
  if (!currentResort) return;  // Add guard
  setEditingGuest(null); 
  setDialogOpen(true); 
}}

// Row actions Edit button (inside DataTable)
onClick={() => { 
  if (!currentResort) return;  // Add guard
  setEditingGuest(guest); 
  setDialogOpen(true); 
}}
```

## Testing

After the fix:
1. Navigate to `/staff/guests` 
2. Page should load without errors
3. Add Guest button should work
4. Edit Guest should work
5. Switching resorts should not cause crashes

## Summary

| File | Change |
|------|--------|
| `src/pages/guests/GuestsPage.tsx` | Wrap dialogs in `{currentResort && (...)}` conditional rendering |

This is a minimal, targeted fix that addresses the null safety issue without restructuring the component.

