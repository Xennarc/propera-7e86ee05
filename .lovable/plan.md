
# Fix: Send Login Credentials Button Does Nothing

## Root Cause
The **"Send Login Credentials" button** in `PrearrivalProfileCard.tsx` does nothing because the `SendGuestCredentialsDialog` component is **never rendered** in the JSX.

The component has all the pieces in place:
- Import: `SendGuestCredentialsDialog` is imported (line 42)
- State: `credentialsDialogOpen` is created (line 83)
- Handler: `handleSendEmail` sets `credentialsDialogOpen = true` (line 136)
- Guest object: `dialogGuest` is constructed with correct data (lines 124-133)

**But the dialog component itself is never included in the return JSX** — the state gets set to `true`, but there's nothing listening to it.

## The Fix
Add the `<SendGuestCredentialsDialog />` component to the JSX in `PrearrivalProfileCard.tsx`. This needs to be added in **both return paths**:

1. **Empty state return** (around line 243) — for guests with no pre-arrival data yet
2. **Main card return** (around line 510) — for guests with pre-arrival data

## Technical Implementation

**File: `src/components/prearrival/PrearrivalProfileCard.tsx`**

Add the dialog component right before the closing fragments in both return statements:

```tsx
{/* Add this before the closing </Card> in both empty state and main card */}
<SendGuestCredentialsDialog
  open={credentialsDialogOpen}
  onOpenChange={setCredentialsDialogOpen}
  guests={[dialogGuest]}
  onSuccess={handleCredentialsSent}
/>
```

### Specific Locations:
1. **Empty state** (ends ~line 244): Insert after closing `</Card>`, wrap both in a fragment
2. **Main card** (ends ~line 511): Insert after closing `</Card>`, wrap both in a fragment

### Changes Required:
- Wrap both return paths in `<>...</>` fragments
- Add the dialog component after each `</Card>`

## Files to Modify

| File | Change |
|------|--------|
| `src/components/prearrival/PrearrivalProfileCard.tsx` | Add `<SendGuestCredentialsDialog />` to both return paths |

## Testing Checklist
1. Navigate to a pre-arrival guest (e.g., one showing "No pre-arrival details yet")
2. Click "Send Login Credentials" button
3. Verify the dialog opens with correct guest data (Room, Last Name, PIN/placeholder)
4. Confirm email can be edited and credentials can be sent
5. Also test on a guest with pre-arrival data (the "Resend" button scenario)
