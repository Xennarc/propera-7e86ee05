# Fix Plan: Guest Requests Lifecycle End-to-End

## ✅ COMPLETED

All phases have been implemented:

### Phase 1: Database Schema Alignment ✅
- Added `actor_type` (TEXT DEFAULT 'SYSTEM') column to `service_request_events`
- Added `notes` (TEXT) column to `service_request_events`  
- Updated `service_request_created_event` trigger to set `actor_type = 'GUEST'`
- Updated `service_request_status_change_event` trigger to set `actor_type = 'SYSTEM'`
- Backfilled existing CREATED events with `actor_type = 'GUEST'`
- Created `service_request_events_compat` view for column aliases

### Phase 2: Frontend Query Fixes ✅
- Fixed `useRequestEvents` hook to query correct columns (`meta`, `event_at`) and map to interface (`metadata`, `created_at`)
- Fixed all event insert calls in `useStaffServiceRequests.ts` to use `meta` instead of `metadata`
- Fixed event insert in `useRequestsDashboard.ts` to use `meta` instead of `metadata`

### Phase 3: Guest RPC Enhancement ✅
- Trigger now sets `actor_type = 'GUEST'` for CREATED events automatically

### Phase 4 & 5: Verification
- Staff Assign picker uses `useStaffDepartmentMembers` which is working
- Cross-portal realtime sync already configured with proper query key invalidation

---

## Expected Outcomes (Now Working)

1. **Guest submits request** → Success toast, request visible in My Requests immediately
2. **Staff sees request** → Appears in New lane of dashboard (via realtime)
3. **Staff acknowledges/assigns/starts/completes** → Actions succeed, timeline records each step
4. **Guest sees updates** → Status changes reflected in My Requests (via realtime)
5. **Timeline works** → Shows "Request submitted", "Acknowledged", "Assigned", "Completed"

---

## Technical Summary

| Column | Database | Frontend Maps To |
|--------|----------|------------------|
| `event_at` | ✅ | `created_at` |
| `meta` | ✅ | `metadata` |
| `actor_type` | ✅ Added | `actor_type` |
| `notes` | ✅ Added | `notes` |
