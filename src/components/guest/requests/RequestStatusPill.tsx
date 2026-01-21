import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  CheckCircle2, 
  Loader2, 
  XCircle, 
  UserCheck,
  PlayCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

type RequestStatus = 'NEW' | 'ACKNOWLEDGED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface RequestStatusPillProps {
  status: RequestStatus;
  size?: 'sm' | 'default';
  showIcon?: boolean;
}

const statusConfig: Record<RequestStatus, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
}> = {
  NEW: {
    label: 'Submitted',
    icon: Clock,
    className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  ACKNOWLEDGED: {
    label: 'Received',
    icon: CheckCircle2,
    className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
  ASSIGNED: {
    label: 'Assigned',
    icon: UserCheck,
    className: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    icon: PlayCircle,
    className: 'bg-primary/15 text-primary border-primary/30',
  },
  COMPLETED: {
    label: 'Completed',
    icon: CheckCircle2,
    className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  CANCELLED: {
    label: 'Cancelled',
    icon: XCircle,
    className: 'bg-muted text-muted-foreground border-muted',
  },
};

export function RequestStatusPill({ status, size = 'default', showIcon = true }: RequestStatusPillProps) {
  const config = statusConfig[status] || statusConfig.NEW;
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline"
      className={cn(
        'font-medium border gap-1.5 whitespace-nowrap',
        config.className,
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'
      )}
    >
      {showIcon && (
        <Icon className={cn(
          'flex-shrink-0',
          size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5',
          status === 'IN_PROGRESS' && 'animate-spin'
        )} />
      )}
      {config.label}
    </Badge>
  );
}
