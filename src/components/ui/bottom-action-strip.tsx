/**
 * BottomActionStrip – Fixed bottom action bar for ops pages.
 * Respects safe-area-inset-bottom and existing fixed nav.
 *
 * Height: 72px (excluding safe area).
 * Always renders above the viewport bottom with safe-area padding.
 */
import { cn } from '@/lib/utils';

interface BottomActionStripProps {
  children: React.ReactNode;
  className?: string;
  /** Whether to show the strip. Allows conditional rendering without unmounting. */
  visible?: boolean;
}

export function BottomActionStrip({ children, className, visible = true }: BottomActionStripProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        'bg-background/95 backdrop-blur-sm border-t border-border/40',
        'px-4 pt-3',
        'ops-bottom-strip',
        className,
      )}
    >
      <div className="flex gap-2 max-w-lg mx-auto">
        {children}
      </div>
    </div>
  );
}
