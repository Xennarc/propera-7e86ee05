import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface StickyActionBarProps {
  children: ReactNode;
  className?: string;
}

/**
 * Sticky bottom action bar for Guest Portal forms.
 * Uses the unified bottom overlay stack contract:
 *   - Positions at bottom: var(--guest-overlay-bottom) (above GuestBottomNav)
 *   - Applies safe-area padding once via var(--guest-safe-area-b)
 * Use with GuestPageShell overlay="action" for correct page padding.
 */
export function StickyActionBar({ children, className }: StickyActionBarProps) {
  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-30",
        /* Position above the bottom nav using shared contract variable */
        "bottom-[var(--guest-overlay-bottom)]",
        "px-4 pt-3 flex items-center gap-3",
        "bg-card/95 dark:bg-card/90",
        "border-t border-border/40",
        "backdrop-blur-xl",
        /* Safe-area padding applied once via shared variable */
        "pb-[max(0.75rem,var(--guest-safe-area-b))]",
        "lg:hidden", // Only on mobile
        className
      )}
    >
      <div className="max-w-lg mx-auto w-full flex items-center gap-3">
        {children}
      </div>
    </div>
  );
}

/**
 * Spacer to add at the bottom of scrollable content when using StickyActionBar.
 * Prevents the action bar from covering the last items.
 * NOTE: Prefer using GuestPageShell overlay="action" instead of this spacer.
 */
export function StickyActionBarSpacer({ className }: { className?: string }) {
  return (
    <div className={cn("h-20 lg:h-0 shrink-0", className)} />
  );
}
