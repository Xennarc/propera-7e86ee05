

# Pre-Arrival Details Collapsible Display

## Overview
Convert the `PreArrivalSubmissionCard` into a collapsible expandable section that staff can open to view pre-arrival details. This provides a cleaner interface where the pre-arrival information doesn't take up screen real estate until explicitly expanded.

## Current State
- `PreArrivalSubmissionCard.tsx` displays pre-arrival submission data in a full card
- Always visible with all sections expanded
- Contains: Arrival Details, Dietary & Allergies, Water Comfort, Special Occasions, Special Requests

## Proposed Design

### Visual Appearance
- **Collapsed State**: Shows a compact summary bar with:
  - FileText icon + "Pre-Arrival Submission" title
  - Status badge (Completed / Pending)
  - Key flags as small badges (e.g., "Has Allergies", "Late Arrival", "Special Occasion")
  - Chevron icon to expand
  
- **Expanded State**: 
  - Full details as currently displayed
  - All sections visible: Arrival, Dietary, Water Comfort, Occasions, Requests
  - Collapse button to close

### Implementation

**File: `src/components/staff/PreArrivalSubmissionCard.tsx`**

1. Import the `Collapsible`, `CollapsibleTrigger`, and `CollapsibleContent` components from `@/components/ui/collapsible`

2. Add local state for open/closed: `const [isOpen, setIsOpen] = useState(false)`

3. Restructure the card layout:
   - CardHeader becomes the CollapsibleTrigger with summary info
   - CardContent wraps in CollapsibleContent
   - Add chevron icon that rotates based on open state

4. Add summary badges in collapsed header:
   - If `payload.allergies` exists → show "Allergies" badge (amber)
   - If late arrival (arrival_time >= 20:00) → show "Late Arrival" badge
   - If `special_occasions` has items → show occasion count badge
   - If `completedAt` exists → show "Completed" badge

### Code Changes

```tsx
// Add imports
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

// Inside component
const [isOpen, setIsOpen] = useState(false);

// Helper for late arrival detection
const isLateArrival = payload.arrival_time && parseInt(payload.arrival_time.split(':')[0], 10) >= 20;

// Summary badges for collapsed state
const summaryBadges = [];
if (payload.allergies) summaryBadges.push({ label: 'Allergies', variant: 'amber' });
if (isLateArrival) summaryBadges.push({ label: 'Late Arrival', variant: 'orange' });
if (Array.isArray(payload.special_occasions) && payload.special_occasions.length > 0) {
  summaryBadges.push({ label: `${payload.special_occasions.length} Occasion(s)`, variant: 'pink' });
}

// New structure:
return (
  <Card>
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <CardTitle className="text-lg">Pre-Arrival Submission</CardTitle>
              {/* Summary badges in collapsed view */}
              {!isOpen && summaryBadges.map(...)}
            </div>
            <div className="flex items-center gap-2">
              {completedAt && <Badge variant="success">Completed</Badge>}
              <ChevronDown className={cn("h-5 w-5 transition-transform", isOpen && "rotate-180")} />
            </div>
          </div>
        </CardHeader>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <CardContent className="space-y-6 pt-0">
          {/* Existing sections... */}
        </CardContent>
      </CollapsibleContent>
    </Collapsible>
  </Card>
);
```

### Behavior
- Default: **Collapsed** (saves space on guest detail page)
- Click header to expand/collapse
- Summary badges give quick visual cues without opening
- Smooth animation via Radix Collapsible

### Edge Cases
- **No submission**: Continue showing the "No pre-arrival information submitted" empty state
- **Loading**: Continue showing skeleton
- **All fields empty**: Show "No details provided" message in expanded state

## Files to Modify

| File | Change |
|------|--------|
| `src/components/staff/PreArrivalSubmissionCard.tsx` | Convert to collapsible component with summary badges |

## Testing Checklist
1. View a guest with pre-arrival submission → collapsed by default, shows summary badges
2. Click to expand → shows full details
3. Click again → collapses smoothly
4. Check guest without submission → shows empty state (not collapsible)
5. Verify allergies badge appears when guest has allergies
6. Verify late arrival badge appears for 20:00+ arrival times
7. Verify special occasions badge shows correct count

