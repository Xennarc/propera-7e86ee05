import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface StickyActionBarProps {
  children: ReactNode;
  className?: string;
}

/**
 * Sticky bottom action bar for Guest Portal forms.
 * Sits above the bottom navigation, respects safe areas.
 * Use with StickyActionBarSpacer to prevent content overlap.
 */
export function StickyActionBar({ children, className }: StickyActionBarProps) {
  return (
    <div
      className={cn(
        "fixed bottom-[var(--guest-nav-h)] left-0 right-0 z-30",
        "px-4 py-3 flex items-center gap-3",
        "bg-card/95 dark:bg-card/90",
        "border-t border-border/40",
        "backdrop-blur-xl",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
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
 */
export function StickyActionBarSpacer({ className }: { className?: string }) {
  return (
    <div className={cn("h-20 lg:h-0 shrink-0", className)} />
  );
}
