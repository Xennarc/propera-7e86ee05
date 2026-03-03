/**
 * StatusChip – Standardized status indicator for ops views.
 * 
 * Semantic mapping:
 *  - overdue  → destructive (red)
 *  - warning  → warning (amber)
 *  - active   → info (blue)
 *  - done     → success (green)
 *  - neutral  → muted (gray)
 *  - Custom string statuses auto-map via KNOWN_STATUSES.
 */
import { cn } from '@/lib/utils';

export type StatusChipVariant = 'overdue' | 'warning' | 'active' | 'done' | 'neutral';

// Auto-map common string statuses to variants
const KNOWN_STATUSES: Record<string, StatusChipVariant> = {
  SCHEDULED: 'active',
  CONFIRMED: 'done',
  PENDING: 'warning',
  CANCELLED: 'overdue',
  COMPLETED: 'done',
  NO_SHOW: 'neutral',
  OPEN: 'done',
  CLOSED: 'neutral',
  FULL: 'warning',
  CHECK_IN: 'active',
  DEPARTED: 'done',
  OVERDUE: 'overdue',
};

const VARIANT_CLASSES: Record<StatusChipVariant, string> = {
  overdue: 'bg-destructive/15 text-destructive',
  warning: 'bg-warning/15 text-warning',
  active: 'bg-info/15 text-info',
  done: 'bg-success/15 text-success',
  neutral: 'bg-muted text-muted-foreground',
};

interface StatusChipProps {
  /** Explicit variant, or pass a status string to auto-map */
  variant?: StatusChipVariant;
  /** Status string – auto-mapped if variant is not set */
  status?: string;
  /** Override display label */
  label?: string;
  className?: string;
}

export function StatusChip({ variant, status, label, className }: StatusChipProps) {
  const resolvedVariant = variant ?? (status ? KNOWN_STATUSES[status] ?? 'neutral' : 'neutral');
  const displayLabel = label ?? status?.replace(/_/g, ' ') ?? '';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-tight capitalize',
        VARIANT_CLASSES[resolvedVariant],
        className,
      )}
    >
      {displayLabel}
    </span>
  );
}
