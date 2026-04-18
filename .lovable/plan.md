

## Goal
Ensure every activity in the DEMO resort always has upcoming sessions on every day of every demo guest's stay, so the guest portal never shows "session already started" / "no sessions available".

## Investigation

Let me check what's currently in the DB for the DEMO resort.
<lov-tool-use id="toolu_vrtx_01TwTDy83SBzo5pqubnS92r7" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"\\nSELECT id, name, category, status, duration_minutes, capacity \\nFROM activities \\nWHERE resort_id = '7819d1dc-485a-4309-a403-67c16c468f4b'\\nORDER BY category, name;\\n\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01ADTVnrRB4Lt7LtUc2PyqX1" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"\\nSELECT \\n  a.name, \\n  s.date, \\n  s.start_time, \\n  s.end_time, \\n  s.capacity, \\n  s.status\\nFROM activity_sessions s\\nJOIN activities a ON a.id = s.activity_id\\nWHERE s.resort_id = '7819d1dc-485a-4309-a403-67c16c468f4b'\\n  AND s.date >= CURRENT_DATE - 2\\nORDER BY s.date, s.start_time\\nLIMIT 100;\\n\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_014RjHatR8bVaX1UeQWtpubu" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"\\nSELECT \\n  MIN(date) as earliest, \\n  MAX(date) as latest, \\n  COUNT(*) as total_sessions,\\n  COUNT(DISTINCT date) as distinct_days\\nFROM activity_sessions\\nWHERE resort_id = '7819d1dc-485a-4309-a403-67c16c468f4b';\\n\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01LzmzRdPnw6aXRdodEXtGPm" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"\\nSELECT id, room_number, full_name, check_in_date, check_out_date\\nFROM guests\\nWHERE resort_id = '7819d1dc-485a-4309-a403-67c16c468f4b'\\nORDER BY room_number;\\n\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Rz6wVZyZjBbrtGDFjGV4pg" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT id, name, category, status, duration_minutes, capacity FROM activities WHERE resort_id = '7819d1dc-485a-4309-a403-67c16c468f4b' ORDER BY category, name;\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01SiPRqnVUHj3nkmGVAk32Mb" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT a.name, s.date, s.start_time, s.end_time, s.capacity, s.status FROM activity_sessions s JOIN activities a ON a.id = s.activity_id WHERE s.resort_id = '7819d1dc-485a-4309-a403-67c16c468f4b' AND s.date >= CURRENT_DATE - 2 ORDER BY s.date, s.start_time LIMIT 200;\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01KM5pwQ5da8ZrTVb5eQ3snT" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT id, room_number, full_name, check_in_date, check_out_date FROM guests WHERE resort_id = '7819d1dc-485a-4309-a403-67c16c468f4b' ORDER BY room_number;\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01QEeiA5BjhyNh7AgAZfjXaf" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT MIN(date) earliest, MAX(date) latest, COUNT(*) total, COUNT(DISTINCT date) days FROM activity_sessions WHERE resort_id = '7819d1dc-485a-4309-a403-67c16c468f4b';\"}">
</lov-tool-use>
I have enough context. Sessions exist for 15 days, and the demo guest stay is rebased on entry to today-1 → today+3. The problem: existing seeded sessions start at fixed times (06:00, 07:00, etc.) — by the time a user enters the demo at, say, 3pm, all morning sessions show as "already begun".

The right fix is to **regenerate sessions during slot reset** so every slot has fresh forward-looking sessions for that guest's stay window — anchored at "now + 30min" forward, not at fixed clock times.
<lov-tool-use id="toolu_vrtx_01PGTBW8uCw2LgUZR94CWLLP" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/demo-enter/index.ts\", \"lines\": \"60-110\"}">
</lov-tool-use>
<lov-plan>

## Goal
Demo guests should never see "already begun" activities. Today (the guest's first stay day) must always have a healthy list of upcoming sessions starting from ~30 min after entry.

## Root cause
Sessions are pre-seeded at fixed clock times (06:00 → 17:30). When a visitor enters mid-afternoon, all morning slots are in the past. Filtering them out can leave today nearly empty.

## Approach
Add a per-slot **session refresh** step inside `demo-enter`, called right after `rebaseGuestStay`. It rewrites today's `activity_sessions` for the DEMO resort so they always look forward from "now":

1. **Determine anchor**: `nowResort = now in resort timezone`, rounded up to next 30-min boundary, +30 min buffer.
2. **For TODAY only**: delete existing sessions for today in DEMO resort (catalog activities untouched). Regenerate per activity:
   - 1st session at anchor
   - 2nd session at anchor + 2.5h
   - 3rd session at anchor + 5h (only if it fits before 21:00)
   - duration from `activities.duration_minutes` (fallback 60)
   - capacity from `activities.capacity` (fallback 8)
3. **Future days (today+1 … today+4)**: leave existing fixed-time sessions in place (they're already future). If a future day has zero sessions for an activity, insert a default morning + afternoon slot.
4. **Past days**: leave alone (no one sees them — guest stay starts today-1 but UI filter never shows yesterday's catalog).

This way, the moment a user clicks "Enter as Guest", today has 2–3 fresh upcoming sessions per activity starting in ~30 min.

## Implementation
Single edit: add `regenerateTodaySessions(admin, resortId, resortTimezone)` helper to `supabase/functions/demo-enter/index.ts` and call it in the main flow right after `rebaseGuestStay`. Read the resort's timezone from the existing `resorts` lookup already in the function. Use `activity_sessions` only — no schema change.

Existing seeded future-day sessions remain as the "looks pre-populated" baseline, so the catalog still feels lived-in for days 2–5.

## Files touched
- `supabase/functions/demo-enter/index.ts` — add helper + one call site.
- Redeploy `demo-enter`.

No DB migration. No client changes.

## Verification
1. Enter demo as guest → check Activities tab → today shows 2–3 sessions per activity, all in the future.
2. Wait 5 min, exit, re-enter → today refreshes again with new anchor.
3. Tomorrow's tab still shows the standard fixed-time schedule.

