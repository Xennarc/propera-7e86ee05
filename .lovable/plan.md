

## Fix: Missing Foreign Key for `assigned_to` → `profiles`

### Problem
The Staff Requests Dashboard query fails with:
```
PGRST200: Could not find a relationship between 'service_requests' and 'profiles'
```

The query attempts to join `service_requests.assigned_to` to `profiles` using a foreign key hint:
```typescript
assignee:profiles!service_requests_assigned_to_fkey(full_name)
```

But this foreign key **does not exist** in the database.

### Current State

**Existing FKs on `service_requests`:**
| Constraint | Definition |
|------------|------------|
| `service_requests_guest_id_fkey` | → `guests(id)` |
| `service_requests_catalog_id_fkey` | → `request_catalog(id)` |
| `service_requests_resort_id_fkey` | → `resorts(id)` |
| `service_requests_submission_id_fkey` | → `service_request_submissions(id)` |

**Missing FK:**
- `service_requests_assigned_to_fkey` → `profiles(id)` ❌

### Solution

Add the missing foreign key constraint via a database migration:

```sql
ALTER TABLE public.service_requests
  ADD CONSTRAINT service_requests_assigned_to_fkey
  FOREIGN KEY (assigned_to)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;
```

This creates the relationship that PostgREST needs to resolve the join in the query.

---

### Files Changed

| Type | File/Change |
|------|-------------|
| Database Migration | Add FK constraint `service_requests_assigned_to_fkey` |

---

### Technical Details

- The `assigned_to` column already stores UUIDs that match `profiles.id`
- The FK uses `ON DELETE SET NULL` so if a staff member is deleted, requests aren't lost
- Once the FK exists, the query's join syntax will work automatically

---

### Testing

1. Sign in as Resort Admin
2. Navigate to `/staff/requests-dashboard?debug=1`
3. Check console for `[RequestsDashboard] Query result:` showing `resultCount > 0`
4. Verify requests appear in the dashboard UI

