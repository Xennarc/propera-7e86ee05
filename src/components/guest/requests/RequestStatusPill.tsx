import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  UserCheck,
  PlayCircle,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInMinutes, parseISO } from 'date-fns';

type RequestStatus = 'NEW' | 'ACKNOWLEDGED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface RequestStatusPillProps {
  status: RequestStatus;
  size?: 'sm' | 'default';
  showIcon?: boolean;
  createdAt?: string;
  slaMinutes?: number; // Optional SLA warning threshold
  animate?: boolean;
   customLabel?: string; // Override the default label (e.g., "Partial" for partial completion)
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

export function RequestStatusPill({ 
  status, 
  size = 'default', 
  showIcon = true,
  createdAt,
  slaMinutes,
  animate = true,
   customLabel,
}: RequestStatusPillProps) {
  const config = statusConfig[status] || statusConfig.NEW;
  const Icon = config.icon;
  
  // Check SLA breach for NEW status
  const isSlaBreach = status === 'NEW' && createdAt && slaMinutes && 
    differenceInMinutes(new Date(), parseISO(createdAt)) > slaMinutes;

  const content = (
    <Badge 
      variant="outline"
      className={cn(
        'font-medium border gap-1.5 whitespace-nowrap transition-all duration-300',
        isSlaBreach 
          ? 'bg-destructive/15 text-destructive border-destructive/30 animate-pulse' 
          : config.className,
        // Minimum 11px text for mobile readability (was 10px for sm)
        size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
      )}
    >
      {showIcon && (
        isSlaBreach ? (
          <AlertTriangle className={cn(
            'flex-shrink-0',
            size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
          )} />
        ) : (
          <Icon className={cn(
            'flex-shrink-0',
            size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4',
            status === 'IN_PROGRESS' && 'animate-spin'
          )} />
        )
      )}
       {isSlaBreach ? 'Waiting' : (customLabel || config.label)}
    </Badge>
  );

  if (!animate) return content;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {content}
      </motion.div>
    </AnimatePresence>
  );
}
