
# Pre-Arrival Migration Backfill Execution Plan

## Current State Summary

| Table | Count | Status |
|-------|-------|--------|
| `guests` | 49 | Source data |
| `guest_stays` | 0 | **Needs backfill** |
| `prearrival_profiles` | 7 | Source data |
| `pre_arrival_submissions` | 0 | **Needs backfill** |
| `prearrival_tokens` (active) | 3 | Source data |
| `guest_access_links` | 0 | **Needs backfill** |

## What This Migration Will Do

### Step 1: Backfill Guest Stays
Execute `backfill_guest_stays_from_guests()` to create `guest_stays` records for all 49 guests based on their check-in/check-out dates. Each stay will have:
- `status`: 'pre_arrival', 'in_house', or 'checked_out' based on current date vs. stay dates
- `room_number`: Copied from the guest record
- `arrival_date` / `departure_date`: From guest check-in/check-out

### Step 2: Backfill Pre-Arrival Submissions
Execute `backfill_submissions_from_profiles()` to migrate the 7 existing `prearrival_profiles` records to the new `pre_arrival_submissions` table, converting their data to the new JSONB payload format.

### Step 3: Link Legacy Tokens
Execute `link_legacy_tokens_to_stays()` to create `guest_access_links` records for the 3 active legacy tokens, linking them to the corresponding `guest_stays` and storing a reference to the legacy token.

### Step 4: Verify Results
Query the new tables to confirm successful backfill with expected counts.

---

## Technical Implementation

### Database Migration

Create a new migration that executes the three backfill functions in sequence and logs results:

```sql
-- Execute backfill in correct order
DO $$
DECLARE
  v_stays_result json;
  v_submissions_result json;
  v_links_result json;
BEGIN
  -- Step 1: Create guest_stays from guests
  SELECT public.backfill_guest_stays_from_guests() INTO v_stays_result;
  RAISE NOTICE 'Backfill guest_stays: %', v_stays_result;
  
  -- Step 2: Migrate prearrival_profiles to pre_arrival_submissions
  SELECT public.backfill_submissions_from_profiles() INTO v_submissions_result;
  RAISE NOTICE 'Backfill submissions: %', v_submissions_result;
  
  -- Step 3: Link active legacy tokens to guest_access_links
  SELECT public.link_legacy_tokens_to_stays() INTO v_links_result;
  RAISE NOTICE 'Link legacy tokens: %', v_links_result;
END $$;
```

---

## Post-Migration Verification

After the migration runs, verify:

1. **guest_stays count** ≈ 49 (one per guest with valid dates)
2. **pre_arrival_submissions count** = 7 (matching prearrival_profiles with data)
3. **guest_access_links count** = 3 (matching active legacy tokens)

---

## What This Enables

Once the backfill completes:

1. **Staff Console**: The new `GuestStayPanel` and `PreArrivalSubmissionCard` will show real data for all guests
2. **Guest Portal**: `useActiveStay` hook will return valid stay records, enabling pre-arrival booking with `stay_id`
3. **Unified Reads**: `get_prearrival_data_unified` will return data from the new system instead of falling back to legacy
4. **Dual-Write Active**: New guest submissions will write to both systems during transition

---

## Implementation Order

1. Create database migration with backfill execution
2. Verify counts match expectations
3. Test guest portal flow with pre-arrival guest
4. Test staff console stay panel display

---

## Future Steps (After Backfill)

Once backfill is verified:

1. **Monitor dual-write success** - Ensure new submissions appear in both systems
2. **Transition staff to new links** - Update `SendPrearrivalEmailDialog` to use new system by default
3. **Add telemetry** - Track legacy vs. new system access patterns
4. **Deprecate legacy routes** - Replace `/prearrival/:token` with `LegacyPrearrivalRedirect` when usage drops
