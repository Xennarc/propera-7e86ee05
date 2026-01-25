
# Add Debug Logging to Guest Search (find-guest-resort)

## Overview
Enhance the `find-guest-resort` edge function with detailed debug logging to help troubleshoot failed searches. The logs will show exactly what was searched vs. what exists in the database, making it easy to identify mismatches.

---

## Current State
The edge function currently logs:
- Basic request info (IP, has lastName/roomNumber)
- Result type (found/not_found/multiple)

**Missing:**
- The actual search values being used
- What records exist that might have matched
- Why specific records were filtered out (date range, resort status, etc.)

---

## Implementation Plan

### File: `supabase/functions/find-guest-resort/index.ts`

**Change 1: Add detailed search parameters log (after line 137)**

Log the exact values being used for the search query:
```typescript
console.log(JSON.stringify({
  event: 'find-guest-resort-search-params',
  searchLastName: sanitizedLastName,
  searchRoom: sanitizedRoomNumber,
  searchDate: today,
  timestamp: new Date().toISOString()
}))
```

**Change 2: Add query for nearby matches when not found (before line 172)**

When no active guests are found, query for similar records to help debug:
```typescript
// If no results, log what similar records exist for debugging
if (activeGuests.length === 0) {
  // Check if there are any guests with matching room (ignoring name)
  const { data: roomMatches } = await supabase
    .from('guests')
    .select('full_name, room_number, check_in_date, check_out_date, resort_id')
    .ilike('room_number', sanitizedRoomNumber)
    .limit(5)

  // Check if there are any guests with matching last name (ignoring room)
  const { data: nameMatches } = await supabase
    .from('guests')
    .select('full_name, room_number, check_in_date, check_out_date, resort_id')
    .ilike('full_name', `%${sanitizedLastName}%`)
    .limit(5)

  console.log(JSON.stringify({
    event: 'find-guest-resort-debug-no-match',
    searchedLastName: sanitizedLastName,
    searchedRoom: sanitizedRoomNumber,
    searchedDate: today,
    rawQueryResultCount: guests?.length || 0,
    activeGuestCount: activeGuests.length,
    roomMatchSamples: roomMatches?.map(g => ({
      fullName: g.full_name?.substring(0, 20) + '...',
      room: g.room_number,
      checkIn: g.check_in_date,
      checkOut: g.check_out_date,
      isCurrentStay: g.check_in_date <= today && g.check_out_date >= today
    })) || [],
    nameMatchSamples: nameMatches?.map(g => ({
      fullNamePreview: g.full_name?.substring(0, 20) + '...',
      room: g.room_number,
      checkIn: g.check_in_date,
      checkOut: g.check_out_date,
      isCurrentStay: g.check_in_date <= today && g.check_out_date >= today
    })) || [],
    timestamp: new Date().toISOString()
  }))
}
```

**Change 3: Add filter diagnostics before active guest filtering (after line 157)**

Log why records might be filtered out:
```typescript
// Log diagnostic info about query results
if (guests && guests.length > 0) {
  const diagnostics = guests.map((g: any) => ({
    hasResort: !!g.resorts,
    resortStatus: g.resorts?.status,
    isActive: g.resorts?.status === 'ACTIVE'
  }))
  
  console.log(JSON.stringify({
    event: 'find-guest-resort-query-diagnostics',
    totalMatches: guests.length,
    byStatus: {
      active: diagnostics.filter(d => d.isActive).length,
      inactive: diagnostics.filter(d => !d.isActive).length,
      noResort: diagnostics.filter(d => !d.hasResort).length
    },
    timestamp: new Date().toISOString()
  }))
}
```

**Change 4: Enhance existing result log (line 181-186)**

Add more detail to the final result log:
```typescript
console.log(JSON.stringify({
  event: 'find-guest-resort-result',
  ip: clientIP,
  resultType: result.type,
  uniqueResortsFound: uniqueResorts.size,
  searchedLastName: sanitizedLastName.substring(0, 3) + '***',  // Partial for privacy
  searchedRoom: sanitizedRoomNumber,
  timestamp: new Date().toISOString()
}))
```

---

## Log Output Examples

### Successful Search
```json
{"event":"find-guest-resort-search-params","searchLastName":"Smith","searchRoom":"101","searchDate":"2026-01-25"}
{"event":"find-guest-resort-query-diagnostics","totalMatches":1,"byStatus":{"active":1,"inactive":0,"noResort":0}}
{"event":"find-guest-resort-result","resultType":"found","uniqueResortsFound":1,"searchedLastName":"Smi***","searchedRoom":"101"}
```

### Failed Search (shows what exists)
```json
{"event":"find-guest-resort-search-params","searchLastName":"Smyth","searchRoom":"101","searchDate":"2026-01-25"}
{"event":"find-guest-resort-debug-no-match",
  "searchedLastName":"Smyth",
  "searchedRoom":"101",
  "searchedDate":"2026-01-25",
  "rawQueryResultCount":0,
  "activeGuestCount":0,
  "roomMatchSamples":[{"fullNamePreview":"John Smith...","room":"101","checkIn":"2026-01-20","checkOut":"2026-01-28","isCurrentStay":true}],
  "nameMatchSamples":[]
}
{"event":"find-guest-resort-result","resultType":"not_found","uniqueResortsFound":0}
```

---

## Privacy Considerations

- Full names are truncated in logs (first 20 chars + "...")
- Last names in result logs show only first 3 chars + "***"
- Room numbers are shown fully (not PII)
- Resort IDs are not logged (internal reference only)
- IP addresses are already logged for rate limiting

---

## How to Use Debug Logs

1. **View logs in Cloud View**: Navigate to Backend Functions > find-guest-resort > Logs
2. **Search by event type**: Filter by `find-guest-resort-debug-no-match` to see failed searches
3. **Identify mismatches**: Compare `searchedLastName` vs `nameMatchSamples` to spot typos or case issues

---

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/find-guest-resort/index.ts` | **Modify** | Add 4 new logging statements for search params, query diagnostics, no-match debugging, and enhanced results |

---

## Testing

After deployment:
1. Search for a valid guest → Logs show search params + diagnostics + found result
2. Search with misspelled name → Logs show no-match with room matches sample
3. Search with wrong room → Logs show no-match with name matches sample
4. Search for past guest → Logs show isCurrentStay: false in samples
