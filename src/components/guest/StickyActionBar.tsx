import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';

interface StickyActionBarProps {
  children: ReactNode;
  className?: string;
}

/**
 * Sticky bottom action bar for Guest Portal forms.
 * Uses the unified bottom overlay stack contract:
 *   - Positions at bottom: var(--guest-overlay-bottom) (above GuestBottomNav)
 *   - Applies safe-area padding once via var(--guest-safe-area-b)
 *   - When keyboard is open, translates up by keyboard height so CTA stays tappable
 * Use with GuestPageShell overlay="action" for correct page padding.
 */
export function StickyActionBar({ children, className }: StickyActionBarProps) {
  const { keyboardInset, isKeyboardOpen } = useKeyboardInset();

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
        /* Smooth transition for keyboard animation */
        "transition-transform duration-200 ease-out",
        className
      )}
      style={
        isKeyboardOpen
          ? { transform: `translateY(-${keyboardInset}px)` }
          : undefined
      }
    >
      <div className="max-w-lg mx-auto w-full flex items-center gap-3">
        {children}
      </div>
    </div>
  );
}

