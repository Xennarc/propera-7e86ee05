
# Fix Resort Creation Button & Enhance Resort Management

## Problem Analysis

### Issue 1: "Create Resort" Button Not Working
Based on code review of `ResortsPage.tsx`, the button correctly calls `setCreateDialogOpen(true)` which should open `CreateResortDialog`. However, there's a potential React hooks violation causing the issue:

**Root Cause**: In `ResortsPage.tsx` lines 54-65, there's a conditional return (`if (!isSuperAdmin())`) that occurs *before* the `useEffect` hook is called. React requires all hooks to be called in the same order on every render. This conditional early return violates the Rules of Hooks because it causes hooks to be skipped on some renders.

```tsx
// ❌ PROBLEM: Conditional return BEFORE useEffect
if (!isSuperAdmin()) {
  return <EmptyState ... />;
}

// This useEffect may not run consistently
useEffect(() => {
  fetchResorts();
}, []);
```

This pattern can cause React to throw errors or behave unexpectedly, potentially preventing dialog state updates from working.

### Issue 2: Current Resort Creation UX Limitations
- The current `CreateResortDialog` is a basic form with minimal visual guidance
- No step-by-step wizard for complex resort setup
- Missing new branding fields that were recently added
- No pre-arrival settings initialization

### Issue 3: Onboarding Flow Missing New Features
The current onboarding only covers 5 steps:
1. Resort Basics
2. Activities  
3. Restaurants
4. Staff
5. Portal

**Missing new feature areas:**
- **Branding customization** (new button/card/radius/font options)
- **Pre-arrival settings** configuration
- **Home hero image** setup
- **Guest experience** configuration

---

## Solution Overview

### Phase 1: Fix the Hook Violation Bug
Move the access check inside the component body, after all hooks are called.

### Phase 2: Enhance Create Resort Dialog
Transform into a beautiful multi-step wizard with:
- Step 1: Basic Info (name, code, timezone, currency)
- Step 2: Admin Setup (primary admin credentials)
- Step 3: Quick Branding (optional - color preset selection)
- Step 4: Review & Create

### Phase 3: Enhance Onboarding Flow
Add new onboarding steps for recently added features:
- **Step 6: Branding** - Configure guest portal appearance
- **Step 7: Pre-Arrival** - Enable/configure pre-arrival portal

---

## Detailed Implementation

### Fix 1: ResortsPage Hook Violation

**File**: `src/pages/settings/ResortsPage.tsx`

Move the hooks to the top and use conditional rendering instead of early return:

```tsx
export default function ResortsPage() {
  // ALL HOOKS FIRST - before any conditionals
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(true);
  // ... other state hooks

  const { isSuperAdmin } = useAuth();
  const { refetch: refetchResorts } = useResort();
  const { toast } = useToast();

  const fetchResorts = async () => { /* ... */ };

  useEffect(() => {
    if (isSuperAdmin()) {
      fetchResorts();
    } else {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  // Access check AFTER hooks
  if (!isSuperAdmin()) {
    return <EmptyState ... />;
  }

  // Rest of component...
}
```

### Enhancement 1: Multi-Step Create Resort Wizard

**New Component**: `src/components/resort/CreateResortWizard.tsx`

A beautiful, guided wizard experience with:

| Step | Title | Fields |
|------|-------|--------|
| 1 | Resort Details | Name, Code, Timezone, Currency, Description |
| 2 | Resort Admin | Full name, Email, Username (with availability check) |
| 3 | Quick Setup (optional) | Color preset selection, Logo upload option |
| 4 | Review & Create | Summary card, confirmation |

**Visual Design:**
```
┌─────────────────────────────────────────────────────────────┐
│  Create New Resort                                    [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [1]───────[2]───────[3]───────[4]                         │
│   ●         ○         ○         ○                          │
│  Details   Admin    Branding   Review                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 1: Resort Details                                     │
│  ─────────────────────                                      │
│                                                             │
│  Let's set up your new resort property                      │
│                                                             │
│  ┌─────────────────────┐  ┌──────────────┐                 │
│  │ Resort Name *       │  │ Resort Code *│                 │
│  │ [Paradise Island...]│  │ [PIR      ]  │                 │
│  └─────────────────────┘  └──────────────┘                 │
│                                                             │
│  ┌─────────────────────┐  ┌──────────────┐                 │
│  │ Timezone           │  │ Currency     │                 │
│  │ [Asia/Maldives ▼]  │  │ [USD ▼]      │                 │
│  └─────────────────────┘  └──────────────┘                 │
│                                                             │
│  ┌─────────────────────────────────────────┐               │
│  │ Description (optional)                   │               │
│  │ [Luxury overwater resort in...]          │               │
│  └─────────────────────────────────────────┘               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                             [Cancel]  [Next: Admin Setup →] │
└─────────────────────────────────────────────────────────────┘
```

**Key UX Improvements:**
- Visual step indicator with progress
- Animated transitions between steps
- Real-time validation feedback
- Username availability check with debounce
- Auto-generated resort code from name
- Color preset thumbnails for quick branding
- Success state with confetti animation and quick links

### Enhancement 2: Expanded Onboarding Flow

**File**: `src/pages/onboarding/ResortOnboardingPage.tsx`

Add two new onboarding steps:

**Step 6: Branding**
```tsx
{
  key: 'branding',
  label: 'Branding',
  icon: Palette,
  description: 'Customize your guest portal appearance',
  tip: 'Pick a color preset now—you can fine-tune everything later in Settings.',
  estimatedTime: '3 min',
  subtasks: [
    { key: 'select_colors', label: 'Choose color scheme', check: (_, state) => state.branding_done },
    { key: 'upload_logo', label: 'Upload logo (optional)', check: (_, state) => state.branding_done },
  ]
}
```

**Step 7: Pre-Arrival**
```tsx
{
  key: 'prearrival',
  label: 'Pre-Arrival',
  icon: ClipboardCheck,
  description: 'Configure guest pre-arrival experience',
  tip: 'Enable pre-arrival to collect guest preferences before they arrive.',
  estimatedTime: '2 min',
  subtasks: [
    { key: 'enable_prearrival', label: 'Enable pre-arrival portal', check: async (resortId) => /* check settings */ },
    { key: 'configure_fields', label: 'Configure visible sections', check: async (resortId) => /* check */ },
  ]
}
```

**Database Migration Required:**
```sql
ALTER TABLE resorts
ADD COLUMN IF NOT EXISTS onboarding_branding_done BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_prearrival_done BOOLEAN DEFAULT false;
```

---

## Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/pages/settings/ResortsPage.tsx` | **Fix** | Move hooks before conditional return |
| `src/components/resort/CreateResortWizard.tsx` | **Create** | New multi-step wizard component |
| `src/components/resort/CreateResortDialog.tsx` | **Refactor** | Replace content with Wizard component |
| `src/components/resort/steps/ResortDetailsStep.tsx` | **Create** | Step 1 form |
| `src/components/resort/steps/AdminSetupStep.tsx` | **Create** | Step 2 form |
| `src/components/resort/steps/QuickBrandingStep.tsx` | **Create** | Step 3 form |
| `src/components/resort/steps/ReviewStep.tsx` | **Create** | Step 4 summary |
| `src/pages/onboarding/ResortOnboardingPage.tsx` | **Extend** | Add branding and pre-arrival steps |
| **Database Migration** | **Create** | Add new onboarding columns |

---

## Technical Notes

### Wizard State Management
Use React's `useReducer` for managing multi-step form state:

```tsx
type WizardState = {
  step: number;
  data: {
    name: string;
    code: string;
    timezone: string;
    currency: string;
    adminName: string;
    adminEmail: string;
    adminUsername: string;
    colorPreset: string | null;
  };
  validation: Record<string, string>;
};
```

### Animation Approach
Use Framer Motion for step transitions:
```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={step}
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
  >
    {renderStep()}
  </motion.div>
</AnimatePresence>
```

### Backward Compatibility
- The existing `CreateResortDialog` interface remains unchanged
- The edge function `bootstrap-resort-admin` is reused
- Existing resorts won't require migration for new onboarding fields (defaults to false)

---

## Testing Checklist

1. **Bug Fix Verification**
   - Navigate to Settings → Resorts as Super Admin
   - Click "Create Resort" button
   - Verify dialog opens correctly

2. **Wizard Flow**
   - Complete all 4 steps successfully
   - Test back navigation between steps
   - Verify validation errors display properly
   - Test username availability check

3. **Onboarding Enhancement**
   - Start fresh resort onboarding
   - Verify new Branding step appears
   - Verify new Pre-Arrival step appears
   - Complete full onboarding flow

4. **Edge Cases**
   - Test with duplicate resort code
   - Test with taken username
   - Test network failure during creation
