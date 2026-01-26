import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MobileCardListProps {
  /** The card elements to render */
  children: ReactNode;
  /** Loading state */
  isLoading?: boolean;
  /** Number of skeleton cards to show when loading */
  skeletonCount?: number;
  /** Empty state component */
  emptyState?: ReactNode;
  /** Whether the list is empty */
  isEmpty?: boolean;
  /** Additional className for the container */
  className?: string;
  /** Use internal ScrollArea (default: false, parent handles scroll) */
  useInternalScroll?: boolean;
  /** Max height when using internal scroll */
  maxHeight?: string;
}

/**
 * Container for mobile card lists with consistent spacing and loading states.
 * Designed for vertical-only scrolling with proper padding for bottom nav.
 */
export function MobileCardList({
  children,
  isLoading = false,
  skeletonCount = 5,
  emptyState,
  isEmpty = false,
  className,
  useInternalScroll = false,
  maxHeight = 'calc(100vh - 200px)',
}: MobileCardListProps) {
  const content = (
    <div className={cn("space-y-3 pb-24", className)}>
      {isLoading ? (
        // Skeleton loading state
        Array.from({ length: skeletonCount }).map((_, i) => (
          <MobileCardSkeleton key={i} />
        ))
      ) : isEmpty ? (
        // Empty state
        emptyState
      ) : (
        // Actual content
        children
      )}
    </div>
  );

  if (useInternalScroll) {
    return (
      <ScrollArea style={{ maxHeight }} className="w-full">
        {content}
      </ScrollArea>
    );
  }

  return content;
}

/**
 * Skeleton loader for mobile cards
 */
export function MobileCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-2 mt-3">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Base mobile card with consistent styling
 */
interface MobileCardBaseProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  /** Show press feedback */
  interactive?: boolean;
}

export function MobileCardBase({
  children,
  onClick,
  className,
  interactive = true,
}: MobileCardBaseProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "overflow-hidden",
        interactive && onClick && [
          "cursor-pointer",
          "transition-all duration-150",
          "active:scale-[0.98] active:shadow-sm",
          "hover:bg-muted/30",
        ],
        className
      )}
    >
      {children}
    </Card>
  );
}
