import { cn } from '@/lib/utils';
import { SLAStatus, formatSLATime, getSLAConfig } from '@/lib/request-sla-config';
import { Clock, AlertTriangle } from 'lucide-react';

interface RequestSLABadgeProps {
  slaStatus: SLAStatus | null;
  priority: string;
  compact?: boolean;
}

export function RequestSLABadge({ slaStatus, priority, compact = false }: RequestSLABadgeProps) {
  if (!slaStatus) return null;

  const config = getSLAConfig(priority);
  const { remainingMinutes, isOverdue, isWarning, statusColor } = slaStatus;

  const colorClasses = {
    green: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
    yellow: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
    red: 'text-red-600 dark:text-red-400 bg-red-500/10',
  };

  if (compact) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded',
          colorClasses[statusColor],
          isOverdue && 'animate-pulse'
        )}
      >
        {isOverdue ? (
          <AlertTriangle className="h-2.5 w-2.5" />
        ) : (
          <Clock className="h-2.5 w-2.5" />
        )}
        {formatSLATime(isOverdue ? -Math.abs(remainingMinutes) : remainingMinutes)}
      </span>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-lg',
        colorClasses[statusColor],
        isOverdue && 'animate-pulse'
      )}
    >
      {isOverdue ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <Clock className="h-3 w-3" />
      )}
      <span>{formatSLATime(isOverdue ? -Math.abs(remainingMinutes) : remainingMinutes)}</span>
    </div>
  );
}
