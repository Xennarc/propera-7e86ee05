

# Safe Migration from Legacy Pre-Arrival Token System

## Overview

This plan implements a zero-downtime migration from the old `prearrival_tokens` + `prearrival_profiles` system to the new `guest_stays` + `pre_arrival_submissions` + `guest_access_links` architecture. The migration proceeds in 4 phases: Backfill, Cutover Reads, Deprecation, and Removal.

---

## Current State Analysis

| Table | Count | Notes |
|-------|-------|-------|
| `prearrival_tokens` (active) | 3 | Legacy tokens still in use |
| `prearrival_profiles` | Multiple | Legacy profile data |
| `guest_stays` | 0 | New table, not yet populated |
| `pre_arrival_submissions` | 0 | New table, not yet populated |
| `guest_access_links` | 0 | New table, not yet populated |

**Components using legacy system:**
- `PrearrivalLandingPage.tsx` → calls `validate_prearrival_token`
- `PreArrivalPage.tsx` → calls `validate_prearrival_token`
- `PrearrivalLinkManager.tsx` → calls `generate_prearrival_token`, queries `prearrival_tokens`
- `SendPrearrivalEmailDialog.tsx` → calls `generate_prearrival_token`, uses `getPrearrivalUrl`
- `GeneratePreArrivalLinkDialog.tsx` → calls `generate_prearrival_token`
- `PrearrivalProfileCard.tsx` → calls `generate_prearrival_token`
- `send-prearrival-link` edge function → sends emails with `/prearrival/:token` URLs
- `usePrearrivalData.ts` → reads from `prearrival_profiles` via RPC
- `useStaffPrearrivalData.ts` → queries `prearrival_tokens` directly

---

## Phase 1: Backfill (Database Migration)

### Goal
Populate `guest_stays` and `pre_arrival_submissions` from existing data while maintaining full backward compatibility.

### Database Changes

**1. Backfill RPC: `backfill_guest_stays_from_guests`**

Creates `guest_stays` records for all guests who don't have one yet:

```sql
CREATE OR REPLACE FUNCTION public.backfill_guest_stays_from_guests()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted_count INT := 0;
  v_skipped_count INT := 0;
  v_guest RECORD;
BEGIN
  FOR v_guest IN
    SELECT g.id, g.resort_id, g.check_in_date, g.check_out_date, g.room_number
    FROM guests g
    WHERE NOT EXISTS (
      SELECT 1 FROM guest_stays gs 
      WHERE gs.guest_id = g.id 
        AND gs.resort_id = g.resort_id
        AND gs.arrival_date = g.check_in_date
    )
  LOOP
    INSERT INTO guest_stays (
      resort_id, guest_id, arrival_date, departure_date, room_number, status
    ) VALUES (
      v_guest.resort_id,
      v_guest.id,
      v_guest.check_in_date,
      v_guest.check_out_date,
      v_guest.room_number,
      CASE 
        WHEN v_guest.check_out_date < CURRENT_DATE THEN 'checked_out'
        WHEN v_guest.check_in_date <= CURRENT_DATE THEN 'in_house'
        ELSE 'pre_arrival'
      END
    )
    ON CONFLICT DO NOTHING;
    
    v_inserted_count := v_inserted_count + 1;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'inserted', v_inserted_count
  );
END;
$$;
```

**2. Backfill RPC: `backfill_submissions_from_profiles`**

Migrates `prearrival_profiles` data to `pre_arrival_submissions`:

```sql
CREATE OR REPLACE FUNCTION public.backfill_submissions_from_profiles()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_migrated_count INT := 0;
  v_profile RECORD;
  v_stay_id UUID;
  v_payload JSONB;
BEGIN
  FOR v_profile IN
    SELECT pp.* 
    FROM prearrival_profiles pp
    WHERE pp.prearrival_status IN ('partial', 'completed')
  LOOP
    -- Find matching stay
    SELECT gs.id INTO v_stay_id
    FROM guest_stays gs
    JOIN guests g ON g.id = gs.guest_id
    WHERE gs.guest_id = v_profile.guest_id
      AND gs.resort_id = v_profile.resort_id
    ORDER BY gs.arrival_date DESC
    LIMIT 1;
    
    IF v_stay_id IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Skip if submission already exists
    IF EXISTS (SELECT 1 FROM pre_arrival_submissions WHERE stay_id = v_stay_id) THEN
      CONTINUE;
    END IF;
    
    -- Build payload from profile
    v_payload := jsonb_build_object(
      'arrival_time', v_profile.arrival_time,
      'arrival_flight_number', v_profile.arrival_flight_number,
      'transfer_preference', v_profile.transfer_preference,
      'dietary_preferences', COALESCE(v_profile.dietary_preferences, '[]'::jsonb),
      'allergies', v_profile.allergies,
      'water_comfort_level', v_profile.water_comfort_level,
      'special_occasions', COALESCE(v_profile.special_occasions, '[]'::jsonb),
      'special_requests', v_profile.special_requests,
      'room_preferences', COALESCE(v_profile.room_preferences, '{}'::jsonb),
      'custom_answers_json', COALESCE(v_profile.custom_answers_json, '{}'::jsonb)
    );
    
    INSERT INTO pre_arrival_submissions (
      resort_id, stay_id, guest_id, payload, 
      completed_at, updated_at
    ) VALUES (
      v_profile.resort_id,
      v_stay_id,
      v_profile.guest_id,
      v_payload,
      CASE WHEN v_profile.prearrival_status = 'completed' THEN v_profile.checkin_completed_at END,
      COALESCE(v_profile.updated_at, NOW())
    );
    
    v_migrated_count := v_migrated_count + 1;
  END LOOP;
  
  RETURN json_build_object('success', true, 'migrated', v_migrated_count);
END;
$$;
```

**3. Link Legacy Tokens: `link_legacy_tokens_to_stays`**

Maps existing `prearrival_tokens` to corresponding `guest_stays`:

```sql
ALTER TABLE guest_access_links ADD COLUMN IF NOT EXISTS legacy_token_id UUID REFERENCES prearrival_tokens(id);

CREATE OR REPLACE FUNCTION public.link_legacy_tokens_to_stays()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_linked_count INT := 0;
  v_token RECORD;
  v_stay_id UUID;
BEGIN
  FOR v_token IN
    SELECT pt.* FROM prearrival_tokens pt
    WHERE pt.revoked_at IS NULL
      AND pt.expires_at > NOW()
  LOOP
    -- Find matching stay
    SELECT gs.id INTO v_stay_id
    FROM guest_stays gs
    WHERE gs.guest_id = v_token.guest_id
      AND gs.resort_id = v_token.resort_id
    ORDER BY gs.arrival_date DESC
    LIMIT 1;
    
    IF v_stay_id IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Create guest_access_link pointing to the stay, store reference to legacy token
    INSERT INTO guest_access_links (
      resort_id, stay_id, guest_id, token_hash, expires_at, purpose, legacy_token_id
    ) VALUES (
      v_token.resort_id,
      v_stay_id,
      v_token.guest_id,
      encode(extensions.digest(v_token.token::bytea, 'sha256'), 'hex'),
      v_token.expires_at,
      'legacy_migration',
      v_token.id
    )
    ON CONFLICT (token_hash) DO NOTHING;
    
    v_linked_count := v_linked_count + 1;
  END LOOP;
  
  RETURN json_build_object('success', true, 'linked', v_linked_count);
END;
$$;
```

---

## Phase 2: Cutover Reads (Frontend Changes)

### Goal
Update all read paths to check `pre_arrival_submissions` first, falling back to `prearrival_profiles` only if missing.

### Files to Modify

**1. `src/hooks/usePrearrivalData.ts` - Guest Portal Reads**

Add fallback logic to `guest_get_prearrival_data` RPC or modify the hook:

```typescript
// Enhanced usePrearrivalData with new system priority
queryFn: async (): Promise<PrearrivalData | null> => {
  if (!guest) return null;
  
  // Try new system first if guest has stayId
  if (guest.stayId) {
    const { data: submission } = await supabase
      .from('pre_arrival_submissions')
      .select('*')
      .eq('stay_id', guest.stayId)
      .single();
    
    if (submission) {
      // Transform submission.payload to PrearrivalProfile format
      return transformSubmissionToLegacyFormat(submission, guest);
    }
  }
  
  // Fallback to legacy RPC
  const { data, error } = await supabase.rpc('guest_get_prearrival_data', {
    p_guest_id: guest.guestId,
  });
  // ... existing logic
}
```

**2. `src/hooks/useStaffPrearrivalData.ts` - Staff Portal Reads**

Add fallback from `pre_arrival_submissions` → `prearrival_profiles`:

```typescript
// Priority: pre_arrival_submissions > prearrival_profiles
const { data: submission } = await supabase
  .from('pre_arrival_submissions')
  .select('*')
  .eq('guest_id', guestId)
  .maybeSingle();

// If submission exists, use it; otherwise fall back to legacy profile query
if (submission) {
  profile = transformSubmissionToProfileFormat(submission);
} else {
  // Existing prearrival_profiles query
}
```

**3. `src/components/staff/PreArrivalSubmissionCard.tsx`**

Already reads from `pre_arrival_submissions` - no changes needed.

**4. New: Create fallback-aware RPC `get_prearrival_data_unified`**

Database function that checks both systems:

```sql
CREATE OR REPLACE FUNCTION public.get_prearrival_data_unified(p_guest_id uuid, p_resort_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stay guest_stays%ROWTYPE;
  v_submission pre_arrival_submissions%ROWTYPE;
  v_profile prearrival_profiles%ROWTYPE;
  v_result json;
BEGIN
  -- Try to find active stay
  SELECT * INTO v_stay
  FROM guest_stays
  WHERE guest_id = p_guest_id AND resort_id = p_resort_id
  ORDER BY CASE status WHEN 'in_house' THEN 1 WHEN 'pre_arrival' THEN 2 ELSE 3 END, arrival_date DESC
  LIMIT 1;
  
  IF v_stay.id IS NOT NULL THEN
    -- Try new submission system
    SELECT * INTO v_submission
    FROM pre_arrival_submissions
    WHERE stay_id = v_stay.id;
    
    IF v_submission.id IS NOT NULL THEN
      RETURN json_build_object(
        'source', 'new_system',
        'stay', row_to_json(v_stay),
        'data', v_submission.payload
      );
    END IF;
  END IF;
  
  -- Fallback to legacy profile
  SELECT * INTO v_profile
  FROM prearrival_profiles
  WHERE guest_id = p_guest_id AND resort_id = p_resort_id;
  
  IF v_profile.id IS NOT NULL THEN
    RETURN json_build_object(
      'source', 'legacy_system',
      'stay', CASE WHEN v_stay.id IS NOT NULL THEN row_to_json(v_stay) ELSE NULL END,
      'data', json_build_object(
        'arrival_time', v_profile.arrival_time,
        'arrival_flight_number', v_profile.arrival_flight_number,
        'transfer_preference', v_profile.transfer_preference,
        'dietary_preferences', v_profile.dietary_preferences,
        'allergies', v_profile.allergies,
        'water_comfort_level', v_profile.water_comfort_level,
        'special_occasions', v_profile.special_occasions,
        'special_requests', v_profile.special_requests
      )
    );
  END IF;
  
  RETURN json_build_object('source', 'none', 'data', NULL);
END;
$$;
```

---

## Phase 3: Deprecation (Link Updates + Redirects)

### Goal
Transition all link generation and sharing to the new `/guest/access` route while gracefully handling legacy links.

### Files to Modify

**1. `src/lib/url-utils.ts` - Add new URL function**

```typescript
/**
 * Generate a unified guest access link URL (new system)
 */
export function getGuestAccessUrl(token: string): string {
  return `${PRODUCTION_URL}/guest/access?t=${token}`;
}
```

**2. `src/components/guests/SendPrearrivalEmailDialog.tsx` - Use new links**

Update to prefer the new stay-based access link system:

```typescript
// Check if guest has a stay record
const { data: stay } = await supabase
  .from('guest_stays')
  .select('id')
  .eq('guest_id', guest.id)
  .eq('resort_id', currentResort.id)
  .maybeSingle();

if (stay) {
  // Use new system
  const { data: linkResult } = await supabase.rpc('create_guest_access_link', {
    p_stay_id: stay.id,
  });
  const result = linkResult as { success: boolean; raw_token?: string };
  if (result?.success && result.raw_token) {
    accessLink = getGuestAccessUrl(result.raw_token);
  }
} else {
  // Fall back to legacy
  const token = await generateLinkMutation.mutateAsync(guest.id);
  accessLink = getPrearrivalUrl(token);
}
```

**3. `supabase/functions/send-prearrival-link/index.ts` - Support both URL patterns**

Update the URL extraction to handle both `/prearrival/:token` and `/guest/access?t=:token`:

```typescript
function getProductionUrl(linkOrToken: string): string {
  // Handle new /guest/access?t= format
  const accessMatch = linkOrToken.match(/[?&]t=([^&]+)/);
  if (accessMatch && accessMatch[1]) {
    return `${PRODUCTION_URL}/guest/access?t=${accessMatch[1]}`;
  }
  
  // Handle legacy /prearrival/:token format
  if (!linkOrToken.includes('/')) {
    return `${PRODUCTION_URL}/prearrival/${linkOrToken}`;
  }
  
  const prearrivalMatch = linkOrToken.match(/\/prearrival\/([^/?#]+)/);
  if (prearrivalMatch && prearrivalMatch[1]) {
    return `${PRODUCTION_URL}/prearrival/${prearrivalMatch[1]}`;
  }
  
  return linkOrToken;
}
```

**4. `src/pages/prearrival/PrearrivalLandingPage.tsx` - Add legacy redirect support**

Add logic to redirect legacy tokens to the new system when possible:

```typescript
// After validating the legacy token, check if we can redirect to new system
const checkForNewSystemMigration = async (legacyToken: string) => {
  const { data: accessLink } = await supabase
    .from('guest_access_links')
    .select('token_hash, stay_id')
    .eq('legacy_token_id', legacyTokenId)
    .maybeSingle();
  
  if (accessLink) {
    // Legacy token has been migrated - but we can't redirect because
    // we don't have the raw token. Let the legacy flow continue but
    // ensure any writes go to the new system.
    setMigratedStayId(accessLink.stay_id);
  }
};
```

**5. Handle unmapped legacy tokens gracefully**

Update error handling in `PrearrivalLandingPage.tsx`:

```typescript
// In error state, show helpful message with CTA
if (error.includes('TOKEN_EXPIRED') || error.includes('TOKEN_NOT_FOUND')) {
  return (
    <ExpiredLinkScreen
      resortBranding={resortBranding}
      message="This link has expired or is no longer available."
      cta={
        <Button onClick={() => navigate('/guest/login')}>
          Use Room Number & PIN Instead
        </Button>
      }
      secondaryCta={
        <p className="text-sm text-muted-foreground">
          Or contact the resort to request a new pre-arrival link.
        </p>
      }
    />
  );
}
```

---

## Phase 4: Removal (After Telemetry Confirms)

### Prerequisites Before Removal

1. **Usage telemetry shows near-zero legacy token usage** (< 1% of logins)
2. **All guests with upcoming stays have been migrated** to `guest_stays`
3. **Staff have been notified** about the deprecation
4. **Database backup snapshot** has been taken

### Removal Steps

**Step 1: Create backup snapshot**
- Export `prearrival_tokens` and `prearrival_profiles` to storage

**Step 2: Remove legacy routes from `App.tsx`**

```typescript
// REMOVE these routes:
// <Route path="/prearrival/:token" element={<PrearrivalLandingPage />} />
// <Route path="/prearrival/:token/checkin" element={<PrearrivalCheckinWizard />} />
// <Route path="/prearrival/:token/experiences" element={<PreArrivalPage />} />

// ADD redirect fallback:
<Route path="/prearrival/*" element={<LegacyPrearrivalRedirect />} />
```

**Step 3: Create redirect component**

```typescript
function LegacyPrearrivalRedirect() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md">
        <CardContent className="pt-6 text-center space-y-4">
          <AlertCircle className="h-12 w-12 mx-auto text-amber-500" />
          <h2 className="text-xl font-semibold">This link format has been updated</h2>
          <p className="text-muted-foreground">
            Please use the new link sent to your email, or log in using your room number and PIN.
          </p>
          <Button onClick={() => window.location.href = '/guest/login'}>
            Go to Guest Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 4: Database cleanup (run after 30-day grace period)**

```sql
-- Drop legacy RPCs
DROP FUNCTION IF EXISTS public.generate_prearrival_token(uuid);
DROP FUNCTION IF EXISTS public.validate_prearrival_token(text);
DROP FUNCTION IF EXISTS public.validate_prearrival_link(text, text);
DROP FUNCTION IF EXISTS public.regenerate_prearrival_link(uuid);
DROP FUNCTION IF EXISTS public.revoke_prearrival_link(uuid);

-- Remove legacy_token_id column from guest_access_links
ALTER TABLE guest_access_links DROP COLUMN IF EXISTS legacy_token_id;

-- Archive tables (don't drop immediately)
ALTER TABLE prearrival_tokens RENAME TO prearrival_tokens_archived;
ALTER TABLE prearrival_profiles RENAME TO prearrival_profiles_archived;
```

---

## Implementation Order

| Step | Phase | Description | Risk |
|------|-------|-------------|------|
| 1 | Backfill | Run `backfill_guest_stays_from_guests` | Low |
| 2 | Backfill | Run `backfill_submissions_from_profiles` | Low |
| 3 | Backfill | Run `link_legacy_tokens_to_stays` | Low |
| 4 | Cutover | Update `usePrearrivalData.ts` with fallback | Low |
| 5 | Cutover | Update `useStaffPrearrivalData.ts` with fallback | Low |
| 6 | Cutover | Create `get_prearrival_data_unified` RPC | Low |
| 7 | Deprecation | Add `getGuestAccessUrl` to url-utils | None |
| 8 | Deprecation | Update `SendPrearrivalEmailDialog` to use new links | Low |
| 9 | Deprecation | Update edge function URL handling | Low |
| 10 | Deprecation | Add graceful expired link screen | None |
| 11 | Monitor | Track usage metrics for 2-4 weeks | - |
| 12 | Removal | Remove legacy routes (after confirmation) | Medium |
| 13 | Removal | Archive legacy tables (after 30-day grace) | Low |

---

## Rollback Plan

If issues are detected after any phase:

1. **Phase 1-2 rollback**: Delete newly created `guest_stays` and `pre_arrival_submissions` records
2. **Phase 3-4 rollback**: Revert frontend code, legacy system remains fully functional
3. **Phase 5 rollback**: Restore archived tables from backup

---

## Testing Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Guest opens legacy `/prearrival/:token` link | Works normally, data saved to both systems |
| Guest opens new `/guest/access?t=` link | Authenticates via new system, lands on guest portal |
| Legacy token expired | Shows graceful expired screen with login CTA |
| Legacy token not found | Shows helpful message, not a crash |
| Staff generates link for guest with stay | Uses new system, sends `/guest/access` URL |
| Staff generates link for guest without stay | Falls back to legacy system, sends `/prearrival` URL |
| Guest submits checklist | Dual-writes to both `prearrival_profiles` and `pre_arrival_submissions` |
| Staff views guest profile | Shows data from `pre_arrival_submissions` if available, else legacy |

---

## Files Summary

### New Files to Create
- `src/components/prearrival/LegacyPrearrivalRedirect.tsx` - Redirect component for deprecated routes
- `src/components/prearrival/ExpiredLinkScreen.tsx` - Graceful error UI for expired/invalid links

### Files to Modify
- `src/lib/url-utils.ts` - Add `getGuestAccessUrl` function
- `src/hooks/usePrearrivalData.ts` - Add new system priority with fallback
- `src/hooks/useStaffPrearrivalData.ts` - Add new system priority with fallback
- `src/components/guests/SendPrearrivalEmailDialog.tsx` - Use new links when possible
- `src/pages/prearrival/PrearrivalLandingPage.tsx` - Add migration awareness, improved error UI
- `supabase/functions/send-prearrival-link/index.ts` - Support both URL patterns

### Database Migrations
- Backfill RPCs (3 functions)
- `get_prearrival_data_unified` RPC
- Add `legacy_token_id` column to `guest_access_links`

