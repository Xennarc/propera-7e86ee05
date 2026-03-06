

## Move Resort Size Selector Under "Choose Your Plan" Heading

The ResortSizeSelector currently sits between the hero section and the plan grid. The user wants it placed directly under the "Choose your plan" heading inside the plan grid section.

### Changes

**`src/pages/PricingPage.tsx`**
- Remove the standalone `<ResortSizeSelector>` line between `PricingHeroSection` and `PricingPlanGrid`
- Pass `resortSize` and `setResortSize` remain as-is (ResortSizeSelector will be rendered inside PricingPlanGrid)

**`src/components/pricing/PricingPlanGrid.tsx`**
- Add `onResortSizeChange` callback prop to the interface
- Import and render `<ResortSizeSelector>` inside the `RevealItem` block, right after the subtitle paragraph (line 90), before the plan cards grid

Two files, minimal diff.

