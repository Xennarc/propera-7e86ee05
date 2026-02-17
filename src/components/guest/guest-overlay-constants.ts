/**
 * Guest Bottom Overlay Stack — Shared Constants
 *
 * Single source of truth for overlay bar heights used by:
 *  - GuestPageShell (to compute page bottom padding)
 *  - StickyActionBar / RequestsStickyBar (for consistent sizing)
 *
 * All bars sit at bottom: var(--guest-bottom-nav-offset) via CSS.
 * These constants represent the bar's own height so that
 * GuestPageShell can add the right amount of extra padding.
 */

/** Height of StickyActionBar including its internal padding (~64px) */
export const STICKY_ACTION_BAR_H = 64;

/** Height of RequestsStickyBar including its internal padding (~80px) */
export const REQUESTS_STICKY_BAR_H = 80;
