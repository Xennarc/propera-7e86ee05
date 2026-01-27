
# Fix Super Admin Dashboard "System Issues Detected" Banner

## Root Cause

The `SystemHeartbeat` component attempts to check platform health by fetching `/api/health`, but this endpoint doesn't exist. The failed request causes inflated latency measurements (400+ ms), triggering the `critical` status threshold (>300ms) and displaying the red "System Issues Detected" banner.

## Solution

Replace the fake `/api/health` check with a real Supabase connection health ping that accurately measures actual platform latency.

---

## Implementation

### File: `src/components/superadmin/SystemHeartbeat.tsx`

**Changes:**
1. Import the Supabase client
2. Replace the `/api/health` fetch with a lightweight Supabase query (e.g., `SELECT 1`)
3. Adjust latency thresholds to be more realistic for actual database pings
4. Add proper error handling to set `critical` status only on actual connection failures

```typescript
// Before (broken)
await fetch('/api/health', { method: 'HEAD' }).catch(() => {});

// After (fixed)
import { supabase } from '@/integrations/supabase/client';

const start = performance.now();
const { error } = await supabase.from('resorts').select('id').limit(1).single();
const measuredLatency = Math.round(performance.now() - start);

if (error) {
  setStatus('critical');
  setLatency(999);
} else if (measuredLatency < 150) {
  setStatus('healthy');
} else if (measuredLatency < 400) {
  setStatus('degraded');
} else {
  setStatus('critical');
}
setLatency(measuredLatency);
```

**Updated Thresholds:**
- **Healthy:** < 150ms (typical Supabase response)
- **Degraded:** 150-400ms (slow but working)
- **Critical:** > 400ms OR connection error

---

## Technical Details

| Current Behavior | Fixed Behavior |
|-----------------|----------------|
| Fetches non-existent `/api/health` | Pings actual Supabase database |
| Silent error catch inflates latency | Real latency measurement |
| 424ms fake latency → critical status | Actual ~50-100ms → healthy status |
| Red blinking banner with 0 errors | Green "Systems Operational" banner |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/superadmin/SystemHeartbeat.tsx` | Replace fake health check with Supabase ping, update thresholds |

---

## Expected Result

After the fix, the dashboard will show:
- **Green status bar** with "Systems Operational" 
- **Accurate latency** (~50-150ms typical)
- **No blinking red banner** unless there's an actual connection issue

The error metrics section correctly shows 0 errors - the issue was purely with the fake health check logic.
