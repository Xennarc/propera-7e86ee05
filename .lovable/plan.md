

## Fix Guest Portal Card to Match Module List

### Problem
The Guest Portal has a `spotlight: true` flag that renders it as a large standalone card (`SpotlightCard`), visually breaking from the uniform list style of the other modules.

### Change — `src/components/landing/PlatformModules.tsx`

1. **Remove the `spotlight` property** from the Guest Portal entry in the `modules` array (line 18)
2. **Remove the `SpotlightCard` component** (lines 58–76) — no longer needed
3. **Remove the spotlight filter logic** (lines 101–102, 118–121) — render all modules through the same `ModuleItem` list
4. **Render all modules uniformly** in a single `<div>` using `ModuleItem`

This makes Guest Portal appear as a row with icon + title + GUEST tag + description, identical to Activities, Dining, etc.

### Files Modified (1)
- `src/components/landing/PlatformModules.tsx`

### No behavior changes
Same data, same scroll target, same section structure.

