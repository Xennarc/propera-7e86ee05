import { cn } from '@/lib/utils';
import { ReactNode, forwardRef } from 'react';

interface MobileCardProps {
  children: ReactNode;
  /** Click handler — adds hover/active states */
  onClick?: () => void;
  /** Subtle left accent strip color class (e.g., "bg-emerald-500") */
  accentColor?: string;
  /** Reduce padding for compact lists */
  compact?: boolean;
  /** Visually muted (e.g., cancelled items) */
  muted?: boolean;
  className?: string;
}

/**
 * Standardized mobile card for Guest Portal lists.
 * Provides consistent padding, touch feedback, and optional accent strip.
 */
export const MobileCard = forwardRef<HTMLDivElement, MobileCardProps>(
  ({ children, onClick, accentColor, compact = false, muted = false, className }, ref) => {
    const Component = onClick ? 'button' : 'div';

    return (
      <Component
        ref={ref as any}
        onClick={onClick}
        className={cn(
          "w-full text-left guest-card overflow-hidden",
          "transition-all duration-150",
          onClick && "cursor-pointer active:scale-[0.98] hover:shadow-soft hover:border-border/80 tap-target",
          muted && "opacity-60",
          className
        )}
      >
        <div className="flex">
          {accentColor && (
            <div className={cn("w-1 shrink-0 rounded-l-xl", accentColor)} />
          )}
          <div className={cn(
            "flex-1 min-w-0",
            compact ? "p-3" : "p-4"
          )}>
            {children}
          </div>
        </div>
      </Component>
    );
  }
);
MobileCard.displayName = 'MobileCard';

/** Row inside MobileCard: title + status on the right */
export function MobileCardHeader({
  title,
  badge,
  className,
}: {
  title: string;
  badge?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-2 mb-1", className)}>
      <h3 className="font-semibold text-foreground truncate text-sm sm:text-base">{title}</h3>
      {badge}
    </div>
  );
}

/** Secondary meta line (time, location, guests) */
export function MobileCardMeta({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      "flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground",
      className
    )}>
      {children}
    </div>
  );
}
