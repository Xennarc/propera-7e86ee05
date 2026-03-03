/**
 * OpsStatusChip – Compact status chip for ops views.
 * Uses design tokens only. Supports session + booking statuses.
 */
import { cn } from '@/lib/utils';

export type OpsStatus = 'SCHEDULED' | 'CANCELLED' | 'COMPLETED' | 'PENDING' | 'CONFIRMED' | 'NO_SHOW' | 'CHECK_IN' | 'DEPARTED';

const STATUS_CONFIG: Record<OpsStatus, { label: string; className: string }> = {
  SCHEDULED: { label: 'Scheduled', className: 'bg-success/15 text-success' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-success/15 text-success' },
  PENDING: { label: 'Pending', className: 'bg-warning/15 text-warning' },
  CANCELLED: { label: 'Cancelled', className: 'bg-destructive/15 text-destructive' },
  COMPLETED: { label: 'Completed', className: 'bg-primary/15 text-primary' },
  NO_SHOW: { label: 'No Show', className: 'bg-muted text-muted-foreground' },
  CHECK_IN: { label: 'Check-in', className: 'bg-info/15 text-info' },
  DEPARTED: { label: 'Departed', className: 'bg-primary/15 text-primary' },
};

interface OpsStatusChipProps {
  status: OpsStatus;
  className?: string;
}

export function OpsStatusChip({ status, className }: OpsStatusChipProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.SCHEDULED;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-tight',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
