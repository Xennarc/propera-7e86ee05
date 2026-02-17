import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { STICKY_ACTION_BAR_H, REQUESTS_STICKY_BAR_H } from './guest-overlay-constants';

/**
 * Guest Layout Contract — GuestPageShell
 *
 * A standard wrapper for all Guest Portal page content that guarantees:
 *  1. Correct bottom padding so nothing hides behind GuestBottomNav or sticky bars.
 *  2. A single scroll container (the parent <main> in GuestLayout handles scroll).
 *  3. Consistent max-width and horizontal padding via inherited layout styles.
 *
 * Usage:
 *   <GuestPageShell>                    — default safe bottom above nav
 *   <GuestPageShell overlay="action">   — extra room for StickyActionBar
 *   <GuestPageShell overlay="requests"> — extra room for RequestsStickyBar
 *   <GuestPageShell overlayHeight={120}>— custom px value
 *
 * The shell sets --guest-overlay-h as an inline CSS variable which feeds into
 * the .guest-safe-shell utility class defined in index.css:
 *   padding-bottom: calc(var(--guest-safe-base) + var(--guest-overlay-h, 0px))
 *
 * IMPORTANT: This is additive. Existing guest-safe-bottom / guest-safe-bottom-extended
 * classes remain untouched and can still be used independently.
 */

/** Preset overlay heights sourced from shared constants */
const OVERLAY_PRESETS: Record<string, number> = {
  none: 0,
  action: STICKY_ACTION_BAR_H,
  requests: REQUESTS_STICKY_BAR_H,
};

interface GuestPageShellProps {
  children: ReactNode;
  /** Named preset overlay: "none" | "action" | "requests" */
  overlay?: 'none' | 'action' | 'requests';
  /** Custom overlay height in px (overrides `overlay` preset) */
  overlayHeight?: number;
  /** Additional CSS classes on the outer div */
  className?: string;
}

export function GuestPageShell({
  children,
  overlay = 'none',
  overlayHeight,
  className,
}: GuestPageShellProps) {
  // Resolve the overlay height: explicit px wins, then preset, then 0
  const resolvedOverlay = overlayHeight ?? OVERLAY_PRESETS[overlay] ?? 0;

  return (
    <div
      className={cn('guest-safe-shell', className)}
      style={
        resolvedOverlay > 0
          ? ({ '--guest-overlay-h': `${resolvedOverlay}px` } as React.CSSProperties)
          : undefined
      }
    >
      {children}
    </div>
  );
}
