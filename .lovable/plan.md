
# Fix: Guest PIN Management Showing "Disabled" Despite Features Being Enabled

## Problem Summary

The "Guest Portal PIN" card on the Guest Detail page shows **"PIN management has been disabled for this resort"** even though all feature flags appear enabled.

**Root Cause:** The feature flag `enable_guests_pin_management` does not exist in the database.

---

## Technical Analysis

### Current State

| Component | Status |
|-----------|--------|
| `enable_guests_pin_management` in `feature-flag-registry.ts` | ❌ **MISSING** |
| `enable_guests_pin_management` in `feature-flag-modules.ts` | ✅ Listed as child of `enable_guests` |
| `enable_guests_pin_management` in `feature_flags` table | ❌ **NOT SEEDED** |
| `enable_guests` (parent) in database | ✅ Enabled globally |

### Resolution Logic Chain

```
GuestPinManager.tsx
└── useFeatureEnabled('enable_guests_pin_management')
    └── isEnabledEffective(key, flagsMap)
        └── flagsMap['enable_guests_pin_management'] 
            └── undefined (not in DB)
                └── ?? false → Returns FALSE
```

### Files Affected

| File | Change Required |
|------|-----------------|
| `src/lib/feature-flag-registry.ts` | Add flag definition |
| Database migration | Seed the flag row |
| `src/lib/feature-flag-modules.ts` | ✅ Already correct |
| `src/components/guest/GuestPinManager.tsx` | ✅ No changes needed |

---

## Implementation Plan

### Step 1: Add Flag to Registry

Add the `enable_guests_pin_management` definition to `src/lib/feature-flag-registry.ts`:

```typescript
// After enable_guests_history definition (around line 93)
{
  key: 'enable_guests_pin_management',
  label: 'Guest PIN Management',
  description: 'Allow staff to generate and manage guest login PINs for the guest portal.',
  category: 'core',
  tier: 'starter',
  is_dangerous: false,
  scope: 'global',
},
```

### Step 2: Add `enable_guests_prearrival_tab` (Also Missing)

While fixing this, I noticed `enable_guests_prearrival_tab` is also listed in `feature-flag-modules.ts` but missing from the registry. Add it as well:

```typescript
{
  key: 'enable_guests_prearrival_tab',
  label: 'Guest Pre-Arrival Tab',
  description: 'Show the Pre-Arrival tab on guest detail pages.',
  category: 'core',
  tier: 'professional',
  is_dangerous: false,
  scope: 'global',
},
```

### Step 3: Seed Database with Migration

Create a migration to insert both flags:

```sql
-- Insert enable_guests_pin_management (enabled by default)
INSERT INTO feature_flags (key, label, description, category, tier, is_enabled, is_dangerous, scope)
VALUES (
  'enable_guests_pin_management',
  'Guest PIN Management',
  'Allow staff to generate and manage guest login PINs for the guest portal.',
  'core',
  'starter',
  true,
  false,
  'global'
)
ON CONFLICT (key, COALESCE(resort_id, '00000000-0000-0000-0000-000000000000')) DO NOTHING;

-- Insert enable_guests_prearrival_tab (enabled by default)
INSERT INTO feature_flags (key, label, description, category, tier, is_enabled, is_dangerous, scope)
VALUES (
  'enable_guests_prearrival_tab',
  'Guest Pre-Arrival Tab',
  'Show the Pre-Arrival tab on guest detail pages.',
  'core',
  'professional',
  true,
  false,
  'global'
)
ON CONFLICT (key, COALESCE(resort_id, '00000000-0000-0000-0000-000000000000')) DO NOTHING;
```

---

## Why This Fix Is Correct

1. **Follows Existing Patterns**: Other flags like `enable_guests_history` and `enable_guests_preferences` are defined in both the registry and seeded in the database

2. **Respects Parent-Child Model**: The flag's parent (`enable_guests`) is already enabled globally, so once `enable_guests_pin_management` is seeded as `true`, it will be effectively enabled

3. **No Component Changes Needed**: `GuestPinManager.tsx` logic is correct—it's just checking a flag that doesn't exist

4. **Enables Resort Overrides**: Once the global flag exists, resorts can create overrides to disable PIN management if needed

---

## Alternative Considered (Not Recommended)

Change `GuestPinManager` to check `enable_guests` instead:
```typescript
const pinEnabled = useFeatureEnabled('enable_guests');
```

**Why rejected:** This loses granular control. Some resorts may want guests module enabled but PIN management disabled.

---

## Expected Result

After implementation:

1. **Default Behavior**: PIN management enabled for all resorts
2. **Super Admin Control**: Can toggle `enable_guests_pin_management` globally or per-resort
3. **UI Consistency**: "Guest Portal PIN" card shows the generate/reset PIN interface instead of "disabled" message

---

## Testing Checklist

- [ ] Navigate to Guest Detail page for any guest
- [ ] Verify "Guest Portal PIN" card shows "Generate PIN" or "Reset PIN" (not disabled message)
- [ ] Verify Super Admin can see and toggle `enable_guests_pin_management` in Feature Flags page
- [ ] Verify creating a resort override for this flag works correctly
- [ ] Verify disabling the flag shows the "disabled" message again
