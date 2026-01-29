
Goal: Fix the “Send Login Credentials” flow for pre-arrival guests (it currently fails), then verify end-to-end that an email is sent and logged with correct resort branding and credentials.

What I found (why it fails)
- The “Send Login Credentials” button shown in your screenshot is rendered by `PrearrivalProfileCard`.
- `PrearrivalProfileCard` constructs a partial `Guest` object (`dialogGuest`) for `SendGuestCredentialsDialog`, but it hard-codes:
  - `room_number: ''`
- The email-sending backend function (`send-guest-credentials`) requires `roomNumber` (and rejects empty/undefined values). So pre-arrival sends can fail even though the guest exists and has a real room number in the database.
- Additionally, `SendGuestCredentialsDialog` will also throw before calling the backend if the resort context doesn’t have `currentResort.code` ready (less likely, but we should harden the UI).

Primary fix (minimal diff, aligned to current architecture)
1) Pass the real room number into `PrearrivalProfileCard`
- File: `src/components/prearrival/PrearrivalProfileCard.tsx`
  - Add a prop: `roomNumber: string`
  - Populate `dialogGuest.room_number = roomNumber` instead of `''`
  - (Optional but good) also populate `portal_pin_last4` if available in the parent guest object so the dialog can display that state accurately.

2) Wire it from the guest detail page
- File: `src/pages/guests/GuestDetailPage.tsx`
  - When rendering `<PrearrivalProfileCard ... />`, pass `roomNumber={guest.room_number}`
  - (Optional) pass `portalPinLast4={guest.portal_pin_last4}` if we choose to add that prop too.

Hardening (so this never breaks again if something is missing)
3) Add a “required field” guard in `SendGuestCredentialsDialog`
- File: `src/components/guests/SendGuestCredentialsDialog.tsx`
  - Before calling `supabase.functions.invoke('send-guest-credentials', ...)`, verify:
    - `guest.room_number` exists
    - `guest.check_in_date` exists
    - computed `lastName` is non-empty
    - `currentResort.code` exists
  - If missing, show a clear destructive toast explaining what’s missing (e.g., “Room number is missing—please add it to the guest to send credentials.”) and do not attempt send.
  - This prevents silent failures and saves staff time.

End-to-end verification checklist (after implementation)
A) UI test (staff console)
1. Sign in as `Trml_admin` (password `123456`)
2. Open a pre-arrival guest with an email (e.g., Sam Smith, Room 222)
3. Click “Send Login Credentials”
4. In the dialog, confirm:
   - Room shows “222”
   - Last name is correct
   - PIN shows either a generated PIN or masked existing PIN (and regenerates if needed)
5. Click “Send Credentials”
6. Confirm the UI shows:
   - A success toast (“Credentials sent!”)
   - Button state changes to “Sent!” for that guest in the dialog

B) Backend logging verification (email status for staff visibility)
1. Confirm a new row appears in `guest_outbound_messages` for:
   - `template_key = 'guest_credentials'`
   - `status` transitions to `sent` (or `failed` with `error_message`)
   - `provider_message_id` is populated on success
2. If it fails:
   - Confirm the row is created as `queued` then updated to `failed`
   - Confirm the UI surfaces the error text clearly

C) Email verification (branding + credentials)
1. Confirm the email arrives to the guest address
2. Verify:
   - From name: `${resortName} <reservations@propera.cc>`
   - Resort logo appears (if `login_logo_url` exists)
   - Color theme uses `login_primary_color` (fallback teal)
   - Portal URL uses the resort code: `https://propera.cc/resort/{code}/guest/login`
   - Credentials match: Room, Last Name, PIN
   - CTA button navigates to the portal URL

Edge cases to validate
- Guest missing email → button remains disabled and helper copy shows “Add guest email to enable sending”
- Guest missing room number → sending blocked with clear toast
- Resort code not loaded → sending blocked with clear toast
- Resend/API provider error → status becomes `failed`, staff can retry

Files that will be modified
- `src/components/prearrival/PrearrivalProfileCard.tsx` (add roomNumber prop + set dialogGuest.room_number correctly)
- `src/pages/guests/GuestDetailPage.tsx` (pass roomNumber into PrearrivalProfileCard)
- `src/components/guests/SendGuestCredentialsDialog.tsx` (guardrails + clearer error messaging)

Success criteria
- Pre-arrival guest can be sent credentials successfully from the Pre-Arrival card
- A `guest_outbound_messages` record is created/updated with accurate status
- Guest receives a correctly branded email containing correct portal URL + room/last/PIN
