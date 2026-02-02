import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInMinutes } from 'date-fns';

interface WaitTimeBadgeProps {
  createdAt: string;
  slaMinutes?: number;
}

export function WaitTimeBadge({ createdAt, slaMinutes = 15 }: WaitTimeBadgeProps) {
  const waitMinutes = differenceInMinutes(new Date(), new Date(createdAt));
  const isOverSla = waitMinutes > slaMinutes;
  const isNearSla = waitMinutes > slaMinutes * 0.75;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'text-xs gap-1 tabular-nums',
        isOverSla && 'bg-destructive/10 text-destructive border-destructive/30',
        !isOverSla && isNearSla && 'bg-amber-500/10 text-amber-600 border-amber-500/30',
      )}
    >
      <Clock className="h-3 w-3" />
      {waitMinutes}m
    </Badge>
  );
}
