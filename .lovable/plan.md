
# Plan: Make Guest Portal Request UI Elements Dynamic

## Overview

This plan addresses the hardcoded UI elements identified in the Guest Requests system. We'll extend the existing database schema and leverage new configuration tables to make these elements resort-configurable.

---

## Priority Breakdown

### High Priority
| Finding | Location | Issue |
|---------|----------|-------|
| Category configs | `RequestCategoryGrid.tsx` | Hardcoded labels, descriptions, icons, colors for 8 categories |
| Quick suggestions | `SimpleRequestFlow.tsx`, `RequestQuickSheet.tsx` | Static `COMMON_REQUESTS` array |
| Response time SLA | `SimpleRequestFlow.tsx`, `RequestQuickSheet.tsx` | Hardcoded "15 minutes" / "10-15 / 30-60 minutes" |

### Medium Priority
| Finding | Location | Issue |
|---------|----------|-------|
| Operating hours | `RequestBundleSheet.tsx`, `SimpleRequestFlow.tsx` | Fixed 6 AM – 11 PM time slots |
| Request limits | `RequestBundleSheet.tsx` | Hardcoded `MAX_BUNDLE_ITEMS=10`, `MAX_TOTAL_QUANTITY=20` |
| UI microcopy | `RequestsHeader.tsx`, `RequestsEmptyState.tsx`, `PrearrivalRequestsBlockedState.tsx` | Static concierge messaging |

---

## Technical Implementation

### Phase 1: Schema Extension

#### 1A. Extend `request_catalog` Table (Category Metadata)

Add new columns to the existing `request_catalog` table to support dynamic category UI:

```sql
ALTER TABLE request_catalog ADD COLUMN IF NOT EXISTS display_label TEXT;
ALTER TABLE request_catalog ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE request_catalog ADD COLUMN IF NOT EXISTS color_class TEXT DEFAULT 'border-gray-400 text-gray-400';
ALTER TABLE request_catalog ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 100;
```

These columns provide:
- `display_label`: Guest-facing category name (vs internal `category`)
- `description`: Short helper text (e.g., "Room cleaning & fresh towels")
- `color_class`: Tailwind ring color (e.g., `border-cyan-400 text-cyan-400`)
- `display_order`: Sort order for categories

#### 1B. Create `resort_request_settings` Table

New table for resort-specific request configuration:

```sql
CREATE TABLE resort_request_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID UNIQUE NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  
  -- SLA Configuration
  asap_response_min_minutes INTEGER DEFAULT 10,
  asap_response_max_minutes INTEGER DEFAULT 15,
  scheduled_response_min_minutes INTEGER DEFAULT 30,
  scheduled_response_max_minutes INTEGER DEFAULT 60,
  
  -- Operating Hours
  requests_start_hour INTEGER DEFAULT 6,
  requests_end_hour INTEGER DEFAULT 23,
  
  -- Limits
  max_bundle_items INTEGER DEFAULT 10,
  max_total_quantity INTEGER DEFAULT 20,
  
  -- Quick Suggestions (JSONB array of strings)
  quick_suggestions JSONB DEFAULT '["Extra towels", "Room cleaning", "Extra pillows", "Wake-up call", "Iron & board", "Extra toiletries"]'::jsonb,
  
  -- UI Microcopy
  header_tagline TEXT DEFAULT 'Tap what you need — we''ll notify the team.',
  empty_state_title TEXT DEFAULT 'Your personal concierge',
  empty_state_description TEXT DEFAULT 'We''re setting up your request options. In the meantime, our team is here to help with anything you need.',
  footer_response_text TEXT DEFAULT 'Our team typically responds within {min}-{max} minutes during operating hours',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE resort_request_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (similar pattern to resort_settings)
CREATE POLICY "staff_can_read_request_settings" ON resort_request_settings
  FOR SELECT TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "admin_can_update_request_settings" ON resort_request_settings
  FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    public.staff_has_resort_role(auth.uid(), resort_id, 'RESORT_ADMIN')
  );

-- Guest read access via RPC (not direct table access)
```

---

### Phase 2: RPC Updates

#### 2A. Update `guest_get_request_catalog` RPC

Modify the existing RPC to return category metadata:

```sql
CREATE OR REPLACE FUNCTION guest_get_request_catalog(p_resort_id UUID)
RETURNS TABLE (
  id UUID,
  code TEXT,
  title TEXT,
  category TEXT,
  department_key TEXT,
  icon_key TEXT,
  is_billable BOOLEAN,
  default_priority TEXT,
  -- NEW fields
  display_label TEXT,
  description TEXT,
  color_class TEXT,
  display_order INTEGER
) AS $$
  SELECT 
    id, code, title, category, department_key, icon_key, is_billable, default_priority,
    COALESCE(display_label, category) as display_label,
    description,
    COALESCE(color_class, 'border-gray-400 text-gray-400') as color_class,
    COALESCE(display_order, 100) as display_order
  FROM request_catalog
  WHERE (resort_id IS NULL OR resort_id = p_resort_id)
    AND is_active = true
  ORDER BY display_order, title;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

#### 2B. Create `guest_get_request_settings` RPC

New RPC for fetching resort-specific request configuration:

```sql
CREATE OR REPLACE FUNCTION guest_get_request_settings(p_resort_id UUID)
RETURNS JSON AS $$
  SELECT json_build_object(
    'asap_response_min', COALESCE(asap_response_min_minutes, 10),
    'asap_response_max', COALESCE(asap_response_max_minutes, 15),
    'scheduled_response_min', COALESCE(scheduled_response_min_minutes, 30),
    'scheduled_response_max', COALESCE(scheduled_response_max_minutes, 60),
    'requests_start_hour', COALESCE(requests_start_hour, 6),
    'requests_end_hour', COALESCE(requests_end_hour, 23),
    'max_bundle_items', COALESCE(max_bundle_items, 10),
    'max_total_quantity', COALESCE(max_total_quantity, 20),
    'quick_suggestions', COALESCE(quick_suggestions, '["Extra towels", "Room cleaning", "Extra pillows", "Wake-up call", "Iron & board", "Extra toiletries"]'::jsonb),
    'header_tagline', COALESCE(header_tagline, 'Tap what you need — we''ll notify the team.'),
    'empty_state_title', COALESCE(empty_state_title, 'Your personal concierge'),
    'empty_state_description', COALESCE(empty_state_description, 'We''re setting up your request options.'),
    'footer_response_text', COALESCE(footer_response_text, 'Our team typically responds within {min}-{max} minutes')
  )
  FROM resort_request_settings
  WHERE resort_id = p_resort_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

---

### Phase 3: Frontend Hooks

#### 3A. Create `useRequestSettings` Hook

New hook in `src/hooks/useRequestSettings.ts`:

```typescript
interface RequestSettings {
  asapResponseMin: number;
  asapResponseMax: number;
  scheduledResponseMin: number;
  scheduledResponseMax: number;
  requestsStartHour: number;
  requestsEndHour: number;
  maxBundleItems: number;
  maxTotalQuantity: number;
  quickSuggestions: string[];
  headerTagline: string;
  emptyStateTitle: string;
  emptyStateDescription: string;
  footerResponseText: string;
}

export function useRequestSettings(resortId: string) {
  return useQuery({
    queryKey: ['request-settings', resortId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('guest_get_request_settings', {
        p_resort_id: resortId,
      });
      if (error) throw error;
      return mapToRequestSettings(data); // camelCase mapping
    },
    enabled: !!resortId,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });
}
```

#### 3B. Update `useRequestCatalog` Return Type

Extend `CatalogItem` interface:

```typescript
export interface CatalogItem {
  id: string;
  code: string;
  title: string;
  category: string;
  department_key: string;
  icon_key: string | null;
  is_billable: boolean;
  default_priority: string;
  // NEW
  display_label?: string;
  description?: string;
  color_class?: string;
  display_order?: number;
}
```

---

### Phase 4: Component Updates

#### 4A. Update `RequestCategoryGrid.tsx`

Remove hardcoded `categoryConfigs` array. Instead, derive categories from catalog items:

```typescript
// Derive unique categories from catalog items
const categories = useMemo(() => {
  const categoryMap = new Map<string, CategoryConfig>();
  
  catalogItems.forEach((item) => {
    if (!categoryMap.has(item.category)) {
      categoryMap.set(item.category, {
        key: item.category,
        label: item.display_label || item.category,
        description: item.description,
        ringColor: item.color_class || 'border-gray-400 text-gray-400',
        icon: getRequestIcon(item.icon_key), // Use existing icon resolver
      });
    }
  });
  
  return Array.from(categoryMap.values());
}, [catalogItems]);
```

**Fallback**: Keep hardcoded defaults as fallback when catalog is empty.

#### 4B. Update `SimpleRequestFlow.tsx` and `RequestQuickSheet.tsx`

Replace hardcoded `COMMON_REQUESTS`:

```typescript
const { data: settings } = useRequestSettings(resortId);

// Use settings.quickSuggestions or fallback
const suggestions = settings?.quickSuggestions || DEFAULT_SUGGESTIONS;

// Dynamic response time
const responseText = settings?.footerResponseText
  ?.replace('{min}', String(settings.asapResponseMin))
  ?.replace('{max}', String(settings.asapResponseMax))
  || 'Our team typically responds within 15 minutes';
```

#### 4C. Update `RequestBundleSheet.tsx`

Dynamic time slots and limits:

```typescript
const { data: settings } = useRequestSettings(resortId);

const startHour = settings?.requestsStartHour ?? 6;
const endHour = settings?.requestsEndHour ?? 23;
const maxItems = settings?.maxBundleItems ?? 10;
const maxQty = settings?.maxTotalQuantity ?? 20;

// Generate slots dynamically
const timeSlots = useMemo(() => generateTimeSlots(startHour, endHour), [startHour, endHour]);
```

#### 4D. Update `RequestsHeader.tsx` and `RequestsEmptyState.tsx`

Use settings for microcopy:

```typescript
const { data: settings } = useRequestSettings(resortId);

// In RequestsHeader
<p className="text-sm text-muted-foreground">
  {settings?.headerTagline || 'Tap what you need — we\'ll notify the team.'}
</p>

// In RequestsEmptyState
<h3>{settings?.emptyStateTitle || 'Your personal concierge'}</h3>
<p>{settings?.emptyStateDescription || 'We\'re setting up your request options...'}</p>
```

---

### Phase 5: Staff Admin UI

#### 5A. Add "Configuration" Tab to RequestsSettingsPage

New tab in `RequestsSettingsPage.tsx`:

```typescript
<TabsTrigger value="config" className="gap-2">
  <Settings2 className="h-4 w-4" />
  <span className="hidden sm:inline">Configuration</span>
</TabsTrigger>

<TabsContent value="config">
  <RequestConfigurationSection resortId={currentResort.id} />
</TabsContent>
```

#### 5B. Create `RequestConfigurationSection` Component

New component with form fields for:
- **SLA Times**: ASAP min/max, Scheduled min/max (number inputs)
- **Operating Hours**: Start/End hour (select dropdowns)
- **Limits**: Max bundle items, Max total quantity (number inputs)
- **Quick Suggestions**: Tag-style input for adding/removing suggestions
- **Microcopy**: Text inputs for header tagline, empty state title/description

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| Migration SQL | Create | New `resort_request_settings` table + schema changes |
| `src/hooks/useRequestSettings.ts` | Create | New hook for fetching settings |
| `src/hooks/useServiceRequests.ts` | Modify | Update `CatalogItem` type |
| `src/components/guest/requests/RequestCategoryGrid.tsx` | Modify | Derive categories from catalog |
| `src/components/guest/requests/SimpleRequestFlow.tsx` | Modify | Use dynamic settings |
| `src/components/guest/RequestQuickSheet.tsx` | Modify | Use dynamic settings |
| `src/components/guest/requests/RequestBundleSheet.tsx` | Modify | Use dynamic limits/hours |
| `src/components/guest/requests/RequestsHeader.tsx` | Modify | Use dynamic tagline |
| `src/components/guest/requests/RequestsEmptyState.tsx` | Modify | Use dynamic empty state |
| `src/pages/settings/RequestsSettingsPage.tsx` | Modify | Add Configuration tab |
| `src/components/settings/requests/RequestConfigurationSection.tsx` | Create | New admin form |

---

## Rollout Strategy

1. **Phase 1**: Create database tables and RPCs (no breaking changes)
2. **Phase 2**: Create hooks with fallback defaults (backward compatible)
3. **Phase 3**: Update components to use hooks (existing behavior preserved via defaults)
4. **Phase 4**: Add admin UI for configuration
5. **Phase 5**: Seed example configurations for demo resorts

---

## Testing Checklist

1. Guest Portal with **no** `resort_request_settings` row → Uses all defaults, unchanged behavior
2. Guest Portal with partial settings → Uses provided values, falls back for unset
3. Staff admin can save all configuration fields
4. Quick suggestions display correctly in guest flow
5. Time slots respect configured operating hours
6. Request limits are enforced with dynamic values
7. Microcopy renders from database when configured
