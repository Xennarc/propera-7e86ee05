import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, CircleDashed } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrearrivalStatusBadgeProps {
  status: 'not_started' | 'in_progress' | 'completed';
  size?: 'sm' | 'default';
}

export function PrearrivalStatusBadge({ status, size = 'default' }: PrearrivalStatusBadgeProps) {
  const config = {
    not_started: {
      label: 'Not started',
      icon: CircleDashed,
      className: 'bg-muted text-muted-foreground border-muted-foreground/20',
    },
    in_progress: {
      label: 'In progress',
      icon: Clock,
      className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    },
    completed: {
      label: 'Completed',
      icon: CheckCircle2,
      className: 'bg-success/10 text-success border-success/20',
    },
  };

  const { label, icon: Icon, className } = config[status];

  return (
    <Badge 
      variant="outline" 
      className={cn(
        className,
        size === 'sm' && 'text-xs px-1.5 py-0'
      )}
    >
      <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      {label}
    </Badge>
  );
}
