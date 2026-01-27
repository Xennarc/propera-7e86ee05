
# Consolidate Resort Deletion: Remove Legacy delete-resort Function

## Problem Summary

The codebase has two resort deletion paths:

| Path | Edge Function | Storage Cleanup | Progress Tracking | Used By |
|------|---------------|-----------------|-------------------|---------|
| Purge System | `purge-resort` | Yes (60+ tables + storage) | Yes via `resort_purge_jobs` | `ResortSettingsDrawer` Danger Zone |
| Legacy Delete | `delete-resort` | No (relies on CASCADE only) | No | `ResortActionsMenu` quick action |

The legacy `delete-resort` function is problematic because:
- It **skips storage cleanup** (orphaned files in `activity-images` and `resort-branding` buckets)
- It provides **no progress feedback** for the user
- It **duplicates functionality** that the purge system already handles comprehensively

## Solution

Consolidate all deletion paths to use the `purge-resort` system by:

1. **Removing** the `delete-resort` edge function entirely
2. **Updating** `ResortActionsMenu` to use the purge system
3. **Cleaning up** the unused `deleteMutation` from `ResortSettingsDrawer`
4. **Removing** the function config from `supabase/config.toml`

---

## Implementation Details

### 1. Delete Legacy Edge Function

**Action:** Delete the entire `supabase/functions/delete-resort/` folder

This function is obsolete now that the comprehensive purge system exists.

### 2. Update ResortActionsMenu to Use Purge System

**File:** `src/components/superadmin/ResortActionsMenu.tsx`

Changes:
- Import `usePurgeJob` hook
- Replace the simple delete dialog with a purge-aware dialog (matching the drawer's UX)
- Use `startPurge()` instead of the legacy edge function call
- Add progress/status display for running purge jobs

The updated component will:
- Show the same triple-confirmation UI (resort code + DELETE + checkbox)
- Trigger the purge job via `startPurge()`
- Display purge progress inline while running
- Handle retry for failed purge jobs

### 3. Clean Up ResortSettingsDrawer

**File:** `src/components/superadmin/ResortSettingsDrawer.tsx`

Changes:
- Remove the unused `deleteMutation` (lines 221-265) which calls `delete-resort`
- The drawer already correctly uses `handlePurgeRequest` for deletion

### 4. Remove Config Entry

**File:** `supabase/config.toml`

Remove the `[functions.delete-resort]` section.

---

## Updated Flow After Consolidation

```text
User clicks "Delete Resort" (from either location)
    │
    ▼
Triple Confirmation UI
(resort code + DELETE + I understand checkbox)
    │
    ▼
request_resort_purge RPC
(creates job in resort_purge_jobs)
    │
    ▼
purge-resort Edge Function
    ├── Delete 60+ tables (ordered)
    ├── Delete storage files
    └── Update job progress
    │
    ▼
Resort Deleted + Audit Logged
```

---

## Files to Delete

| File/Folder | Reason |
|-------------|--------|
| `supabase/functions/delete-resort/` | Legacy function, replaced by purge-resort |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/superadmin/ResortActionsMenu.tsx` | Use `usePurgeJob` hook instead of direct edge function call |
| `src/components/superadmin/ResortSettingsDrawer.tsx` | Remove unused `deleteMutation` |
| `supabase/config.toml` | Remove `[functions.delete-resort]` section |

---

## Technical Details

### ResortActionsMenu Changes

The current delete dialog in `ResortActionsMenu` only has two confirmations (code + DELETE word). After this change, it will:

1. Import and use `usePurgeJob(resort.id)` hook
2. Replace `deleteMutation` with calls to `startPurge()`
3. Add the "I understand" checkbox for consistency
4. Show purge status when a job is running/failed
5. Add optional reason field for audit trail

### State Management

The `usePurgeJob` hook already handles:
- Job polling every 2 seconds while running
- Query invalidation on completion
- Error handling with toast notifications

### Audit Trail

The `purge-resort` function already logs to `admin_audit_logs`:
- `resort_purge_started`
- `resort_purge_completed`
- `resort_purge_failed`

This is more comprehensive than the legacy function's single `resort_deleted` log.

---

## Edge Cases Handled

| Scenario | Handling |
|----------|----------|
| User closes dialog during purge | Job continues in background, status visible on reopen |
| Purge fails mid-way | Job marked as failed, user can retry |
| Demo resort deletion | Requires additional "DELETE DEMO" confirmation |
| Multiple purge attempts | Only one job can be active per resort (queued/running) |

---

## Testing Checklist

- [ ] Delete resort from `ResortActionsMenu` uses purge system
- [ ] Delete resort from `ResortSettingsDrawer` Danger Zone still works
- [ ] Storage files are cleaned up on deletion
- [ ] Purge progress is visible during deletion
- [ ] Failed purge can be retried
- [ ] Audit logs show purge actions
- [ ] No references to `delete-resort` remain in codebase
- [ ] Edge function is removed from deployment

---

## Summary

This consolidation ensures that **every resort deletion path**:
- Cleans up all 60+ related tables in the correct order
- Removes files from storage buckets
- Provides progress tracking and retry capability
- Logs comprehensive audit trail
- Uses consistent triple-confirmation UX

The legacy `delete-resort` function is completely removed, eliminating the risk of orphaned storage files and inconsistent deletion behavior.
