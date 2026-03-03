/**
 * SkeletonCard – Reusable loading skeleton for inbox cards and list rows.
 * Configurable via variant prop.
 */
import { cn } from '@/lib/utils';

type SkeletonVariant = 'card' | 'row' | 'compact';

interface SkeletonCardProps {
  variant?: SkeletonVariant;
  className?: string;
}

export function SkeletonCard({ variant = 'card', className }: SkeletonCardProps) {
  if (variant === 'compact') {
    return (
      <div className={cn('rounded-[14px] border border-border/40 bg-card p-3 min-h-[56px] flex items-center gap-3 animate-pulse', className)}>
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-24 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
        </div>
        <div className="h-8 w-16 rounded-lg bg-muted" />
      </div>
    );
  }

  if (variant === 'row') {
    return (
      <div className={cn('rounded-[14px] border border-border/40 bg-card p-3 min-h-[72px] flex items-center gap-3 animate-pulse', className)}>
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-28 rounded bg-muted" />
          <div className="h-3 w-20 rounded bg-muted" />
        </div>
        <div className="grid grid-cols-2 gap-0.5">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-7 w-7 rounded-md bg-muted" />)}
        </div>
        <div className="h-11 w-16 rounded-xl bg-muted" />
      </div>
    );
  }

  // Default: card (DepartureCard-style)
  return (
    <div className={cn('ops-surface min-h-[104px] flex flex-col gap-2.5 animate-pulse', className)}>
      <div className="flex items-start justify-between">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-5 w-16 rounded-full bg-muted" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-3 w-12 rounded bg-muted" />
      </div>
      <div className="h-12 rounded-xl bg-muted mt-auto" />
    </div>
  );
}

/**
 * Render N skeleton cards in a column.
 */
export function SkeletonCardList({ count = 5, variant = 'card' }: { count?: number; variant?: SkeletonVariant }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} variant={variant} />
      ))}
    </div>
  );
}
