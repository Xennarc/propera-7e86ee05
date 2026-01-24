-- Execute pre-arrival backfill in correct order
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