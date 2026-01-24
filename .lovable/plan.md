
# Simplify Pre-Arrival Flow: Remove Token Links, Use Standard Login

## Summary

Replace the complex token-based pre-arrival access links with a simpler approach where guests receive standard login credentials (room number, last name, PIN) via email, and can optionally use QR codes for instant login.

---

## Current Architecture

The pre-arrival system currently uses **one-time secure access links** that bypass PIN authentication:

| Component | Purpose |
|-----------|---------|
| `guest_access_links` table | Stores hashed tokens for stay-based access |
| `prearrival_tokens` table | Legacy token system |
| `create_guest_access_link` RPC | Generates secure tokens for stays |
| `consume_guest_access_link` RPC | Validates and consumes tokens |
| `GuestAccessLoginPage.tsx` | Processes `/guest/access?t=TOKEN` URLs |
| `SendPrearrivalEmailDialog` | Generates link and sends email with magic link |
| `StayAccessLinkManager` | Manages access links on guest detail page |
| `send-prearrival-link` edge function | Sends email with access link button |

---

## Proposed New Architecture

### Philosophy Change

Instead of "magic links" that auto-authenticate, use the **standard guest login flow**:

1. **Email with credentials**: Guest receives email with resort portal URL + login instructions (room, last name, PIN)
2. **QR code option**: Staff can generate instant-login QR codes for guests who prefer scanning
3. **Same portal URL**: All guests use `/resort/{code}/guest/login` - no special token routes

### Benefits

- **Simpler**: One login method for all guests (pre-arrival and in-house)
- **Reusable**: Guest can share credentials with travel companions
- **No expiry concerns**: PIN doesn't expire like tokens
- **Familiar UX**: Standard login form guests understand
- **Less infrastructure**: Remove token tables and consumption logic over time

---

## Implementation Plan

### Phase 1: Create New "Send Login Credentials" Email Flow

#### 1.1 Create New Edge Function: `send-guest-credentials`

**File:** `supabase/functions/send-guest-credentials/index.ts`

A new edge function that sends an email with:
- Resort portal URL (e.g., `https://propera.cc/resort/DEMO/guest/login`)
- Guest's room number
- Last name for login
- PIN (generated if not already set)
- Check-in date
- Optional: QR code as inline image for instant login

Key differences from `send-prearrival-link`:
- No token generation or magic link
- Includes PIN in email (one-time display)
- Simpler email template focused on credentials

#### 1.2 Create New Dialog: `SendGuestCredentialsDialog`

**File:** `src/components/guests/SendGuestCredentialsDialog.tsx`

Replace or complement `SendPrearrivalEmailDialog` with a dialog that:
- Shows guest details (name, room, dates)
- Generates PIN if none exists (calls `generate_guest_pin` RPC)
- Allows editing email address
- Has toggle: "Include QR code for instant login"
- Sends email via new `send-guest-credentials` edge function
- Shows preview of what guest will receive

#### 1.3 Update Email Template

The new email template will include:

```text
Subject: Your stay at {Resort Name} — login details

Body:
- Welcome message
- Check-in date
- How to access: "Visit {portal URL}"
- Your credentials:
  - Room Number: {room}
  - Last Name: {lastName}
  - PIN: {pin}
- Trust signals (secure portal, same as in-room access)
- Optional QR code section
- Contact info
```

### Phase 2: Update Staff UI

#### 2.1 Update Guest Detail Page Actions

**File:** `src/pages/guests/GuestDetailPage.tsx`

Change the "Send Pre-Arrival" action to "Send Login Credentials":
- Replace `SendPrearrivalEmailDialog` with `SendGuestCredentialsDialog`
- Keep existing `GuestPinManager` (generate/reset PIN)
- Keep existing `GuestQrLoginManager` (generate QR codes)

#### 2.2 Update or Replace `StayAccessLinkManager`

**File:** `src/components/staff/StayAccessLinkManager.tsx`

Options:
1. **Remove entirely** - PIN + QR are now the primary methods
2. **Simplify to "Quick Actions"** - Show options: Send Credentials, Generate QR, View PIN

#### 2.3 Update Bulk Guest Actions

If bulk "Send Pre-Arrival" exists, update to use the new credentials flow.

### Phase 3: Simplify Routes (Future)

#### 3.1 Deprecate Token Routes

The following routes can be deprecated over time:
- `/guest/access?t=TOKEN` → Redirect to `/guest/login` with message
- `/prearrival/:token` → Already using `LegacyPrearrivalRedirect`

#### 3.2 Keep QR Login Routes

These are still valuable and should be kept:
- `/guest/qr?t=TOKEN` (instant QR login)
- `/guest/qr/:token` (confirmed QR login)

QR codes are different from email links - they're for in-person use where staff generates them on the spot.

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/send-guest-credentials/index.ts` | Edge function for credentials email |
| `src/components/guests/SendGuestCredentialsDialog.tsx` | Dialog to send login credentials |

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/guests/GuestDetailPage.tsx` | Replace pre-arrival email with credentials email |
| `src/components/staff/StayAccessLinkManager.tsx` | Simplify or repurpose for credentials flow |
| `src/components/guests/GuestCreatedModal.tsx` | Update to clarify PIN sharing (already good) |

## Files to Deprecate (Phase 3)

| File | Reason |
|------|--------|
| `src/components/guests/SendPrearrivalEmailDialog.tsx` | Replaced by credentials dialog |
| `src/components/prearrival/SharePrearrivalLinkDialog.tsx` | No longer needed |
| `src/components/prearrival/PrearrivalLinkManager.tsx` | Token management no longer needed |
| `src/components/guest/GeneratePreArrivalLinkDialog.tsx` | Replaced by credentials flow |

---

## New Email Template Structure

```text
┌────────────────────────────────────────┐
│  [Resort Logo]                         │
│                                        │
│  Welcome to {Resort Name}!             │
│  Your stay begins {Check-in Date}      │
├────────────────────────────────────────┤
│                                        │
│  Dear {First Name},                    │
│                                        │
│  We're excited to welcome you! Access  │
│  your guest portal to:                 │
│  ✓ Complete your pre-arrival check-in  │
│  ✓ Browse and book activities          │
│  ✓ Reserve restaurants                 │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  YOUR LOGIN DETAILS              │  │
│  │                                  │  │
│  │  Portal:    {resort URL}         │  │
│  │  Room:      {room_number}        │  │
│  │  Last Name: {last_name}          │  │
│  │  PIN:       {pin}                │  │
│  └──────────────────────────────────┘  │
│                                        │
│        [ Access Guest Portal ]         │
│                                        │
│  ─────── Or scan to login ───────     │
│                                        │
│          [QR CODE IMAGE]               │
│                                        │
├────────────────────────────────────────┤
│  🔒 Your PIN is for your use only     │
│  📱 Works on any device                │
│  💾 Same login throughout your stay    │
├────────────────────────────────────────┤
│  Questions? Contact our guest services │
│  The {Resort Name} Team                │
└────────────────────────────────────────┘
```

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| PIN in email | PINs are 4-6 digits, tied to specific room + last name combo |
| Email forwarding | Same risk as magic links; hotel credential pattern is well understood |
| QR code in email | Optional feature; QR expires quickly if using instant type |
| Multiple devices | Standard login supports multiple devices naturally |

---

## Migration Path

1. **Week 1**: Implement new credentials email flow alongside existing
2. **Week 2**: Update staff UI to prefer credentials flow
3. **Week 3**: Monitor usage, gather feedback
4. **Week 4+**: Deprecate token-based flows if no issues

---

## Technical Details

### Generate PIN if Missing

The `SendGuestCredentialsDialog` will automatically generate a PIN if the guest doesn't have one:

```typescript
// Check if guest has PIN
if (!guest.portal_pin_last4) {
  // Generate PIN
  const { data } = await supabase.rpc('generate_guest_pin', {
    p_guest_id: guest.id
  });
  // PIN is returned and can be included in email
}
```

### QR Code in Email (Optional)

If staff enables "Include QR code":
1. Generate instant login token via `create_guest_login_token`
2. Generate QR code as base64 image
3. Embed in email as inline image
4. Include note that QR expires in 5 minutes (configurable)

---

## Summary

This change simplifies the guest onboarding experience by:
1. Using familiar login credentials instead of magic links
2. Reducing infrastructure complexity (fewer token tables/functions)
3. Giving guests reusable credentials for their entire stay
4. Maintaining QR option for staff who prefer that method
