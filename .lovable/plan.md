
# Guest Requests Feature - Implementation Complete ✅

## Fixes Applied

### 1. Fixed Critical Sync Issue ✅
- Updated `useGuestRequestsSync.ts` to subscribe to `service_requests` table instead of legacy `guest_requests`
- Updated query key invalidations to include both `['requests-dashboard', resortId]` and `['guest-service-requests', resortId, guestId]`

### 2. Enhanced Cross-Portal Sync ✅
- Added staff dashboard invalidation in `useServiceRequests.ts` mutations (`createRequest`, `createBundle`)
- Guest request creation now triggers immediate staff dashboard refresh

### 3. Improved RequestQuickSheet UX ✅
- Added "Quick suggestions" with common requests (Extra towels, Room cleaning, etc.)
- Added character count indicator (500 max)
- Added estimated response time display
- Improved visual feedback on selection

## Real-Time Sync Flow

```
Guest creates request → service_requests INSERT
                      ↓
              Supabase Realtime
                      ↓
┌─────────────────────┴─────────────────────┐
↓                                           ↓
useGuestServiceRequests                useRequestsDashboard  
(guest portal)                         (staff dashboard)
↓                                           ↓
Invalidates:                           Invalidates:
['guest-service-requests', resortId]   ['requests-dashboard', resortId]
```

## Testing Checklist

| Step | Expected | Status |
|------|----------|--------|
| Guest opens RequestQuickSheet | Drawer with suggestions | ✅ |
| Guest taps suggestion | Text populates | ✅ |
| Guest submits request | Toast + drawer closes | ✅ |
| Staff dashboard receives update | NEW count increments in <5s | Pending QA |
| Request card appears | Shows guest name/room | Pending QA |
