
## What’s happening
The RPC `create_service_request_bundle` is still failing, but the UI now only shows the generic error string `Failed to create service request bundle`.

That generic string comes from the *exception handler* inside the latest SQL function (it hardcodes the message and discards the real database error). So even though the real failure is still occurring (likely RLS/permissions or a remaining constraint mismatch), we can’t see the actual cause from the frontend.

## Goal
1) Make the RPC return the *real* underlying database error (SQLERRM + SQLSTATE) so we can fix it precisely.  
2) Ensure the RPC reliably bypasses row-level security during its internal inserts (common cause when calling from guest/anon contexts), by explicitly disabling row security within the SECURITY DEFINER function.

---

## Changes we will make

### A) Database migration: improve `create_service_request_bundle` error visibility + ensure RLS doesn’t block it
Create a new migration that does **CREATE OR REPLACE FUNCTION public.create_service_request_bundle(...)** and:

1. Keeps the “insert submission first” behavior (parent row before child rows).
2. Adds function-level settings:
   - `SECURITY DEFINER`
   - `SET search_path = public`
   - **`SET row_security = off`** (critical: prevents RLS from blocking inserts inside the function even when called by guest sessions)
3. Updates the exception handler to return:
   - `success: false`
   - `error: SQLSTATE`
   - `message: SQLERRM`
   - (optional) `context: 'create_service_request_bundle'`

This will immediately tell us whether the real cause is:
- RLS policy violation on `service_request_submissions`, `service_requests`, or `service_request_items`
- missing/renamed column
- NOT NULL constraint failure
- enum/value mismatch
- FK to `request_catalog` / `service_requests` / etc.

### B) (Optional but recommended) Guardrail: don’t leave orphan submissions
Right now the function inserts into `service_request_submissions` and then loops items. If all items are skipped (invalid/inactive), you can end up with a submission but no requests.

We’ll add a check after the loop:
- If `array_length(v_request_ids, 1)` is null/0:
  - delete the inserted submission row
  - return `{ success:false, error:'NO_VALID_ITEMS', message:'No valid items found for this request.' }`

This prevents confusing “empty submissions”.

### C) Frontend: no change required (for now)
Your frontend already surfaces `result.message` when `success:false`. Once the RPC returns SQLERRM, the UI toast/log will show the real cause automatically.

(If you’d like, we can later polish the message shown to guests, but first we need the real error.)

---

## Files / systems affected
- **Database migration (new)**: update `public.create_service_request_bundle(uuid, uuid, jsonb)`.

No React changes required for this diagnostic + fix-hardening step.

---

## How we’ll verify
1. In the guest portal, submit a multi-item bundle again.
2. If it fails:
   - the toast / console error should now show the *real* error message (ex: “new row violates row-level security policy for table …”, “null value in column … violates not-null constraint”, etc.)
3. Based on that real message, we’ll apply the *minimal* targeted fix (policy tweak, column mapping, defaults, etc.).
4. If it succeeds:
   - confirm the new request appears in Guest “My Requests”
   - confirm staff dashboard shows it in “New”

---

## Why this is the most credit-efficient next step
Right now we’re debugging blind because the function intentionally hides the real error. Returning SQLERRM + SQLSTATE and disabling row security inside the SECURITY DEFINER function will either:
- fix the issue outright (if it’s RLS), or
- instantly reveal the exact remaining schema/constraint problem so we can fix it in one follow-up.

---

## Notes for the next step after this
Once we see the true error, the most likely follow-up fixes are:
- Add/adjust RLS policies for guest inserts (if we decide not to rely on `row_security=off`), or
- Provide missing required columns/defaults in the inserts, or
- Align payload keys / column names with the real schema.

