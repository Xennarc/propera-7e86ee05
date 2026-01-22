# Demo Reset - Service Requests Auto-Heal

## ✅ Completed

Added **Pass 6: Service Requests Auto-Heal** to `demo-reset` edge function.

### Changes Made

1. **Updated results tracking** - Added `service_requests: 0` to the seeded counts
2. **Added Pass 6** - Auto-heals sample service requests when count < 3

### Sample Requests Seeded

| Status | Department | Notes |
|--------|------------|-------|
| NEW | Minibar | "Could we get 2 bottles please?" |
| IN_PROGRESS | Housekeeping | "Thank you!" |
| COMPLETED | Engineering | "The bathroom light was flickering" |

### Why This Matters
- Demo visitors now see the **minimal ring icons** on the "My Requests" page
- **Status tracking** (NEW → IN_PROGRESS → COMPLETED) is showcased
- All recent UI improvements are visible in the demo environment
