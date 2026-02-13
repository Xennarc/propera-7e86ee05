

# Add Buggy from Dispatch Resources Panel

## Problem

The Resources panel on the dispatch page lets staff add drivers via a "+" button and dialog, but there is no equivalent for adding buggies. Staff must navigate to the setup wizard to add new buggies.

## Solution

Add a "+" button next to the Buggies header (mirroring the Drivers pattern) that opens a new `AddBuggyDialog` for quick buggy creation directly from the dispatch view.

## Changes

### 1. New File: `src/components/transport/dispatch/AddBuggyDialog.tsx`

A dialog matching the style of `AddDriverDialog` with:
- Name input (text)
- Capacity input (number, default 4)
- Wheelchair accessible toggle (switch)
- Submit button that calls `useTransportSetupMutations().addBuggy`
- Loading and error states

### 2. Update: `src/components/transport/dispatch/ResourcesPanel.tsx`

- Import `AddBuggyDialog`
- Add `showAddBuggy` state
- Add a "+" button next to the Buggies header (same pattern as Drivers section, gated by `canManageDrivers` prop -- which effectively means "can manage resources")
- Render `AddBuggyDialog` with the resort ID

### 3. Update: `src/components/transport/dispatch/index.ts`

- Export `AddBuggyDialog`

## What Does NOT Change

- No database changes
- No new dependencies
- `AddDriverDialog` -- untouched
- `BuggiesSetupStep` -- untouched
- `useTransportSetupMutations` -- reused as-is (already has `addBuggy`)
- Mobile or desktop layout -- unchanged

