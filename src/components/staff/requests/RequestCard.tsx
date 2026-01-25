import { StaffServiceRequest, StaffRequestPriority } from '@/hooks/useStaffServiceRequests';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RequestStatusPill } from '@/components/guest/requests/RequestStatusPill';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format, isToday, isTomorrow } from 'date-fns';
import {
  User,
  MapPin,
  Timer,
  AlertTriangle,
  ClipboardList,
  Eye,
  PlayCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  UserPlus,
} from 'lucide-react';

const PRIORITY_CONFIG: Record<StaffRequestPriority, { className: string; bgClass: string }> = {
  LOW: { 
    className: 'text-slate-600 dark:text-slate-400',
    bgClass: 'bg-slate-500/10 border-slate-500/20',
  },
  NORMAL: { 
    className: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-500/10 border-blue-500/20',
  },
  HIGH: { 
    className: 'text-orange-600 dark:text-orange-400',
    bgClass: 'bg-orange-500/10 border-orange-500/20',
  },
  URGENT: { 
    className: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-500/10 border-red-500/20',
  },
};

interface RequestCardProps {
  request: StaffServiceRequest;
  onClick: () => void;
  onAcknowledge?: () => void;
  onStart?: () => void;
  onComplete?: () => void;
  isAcknowledging?: boolean;
  isStarting?: boolean;
  isCompleting?: boolean;
  canManage?: boolean;
  currentUserId?: string | null;
}

export function RequestCard({
  request,
  onClick,
  onAcknowledge,
  onStart,
  onComplete,
  isAcknowledging,
  isStarting,
  isCompleting,
  canManage = false,
  currentUserId,
}: RequestCardProps) {
  const priorityConfig = PRIORITY_CONFIG[request.priority];
  const isUrgent = request.priority === 'URGENT' || request.priority === 'HIGH';
  const isAssignedToMe = request.assigned_to === currentUserId;

  const formatRequestedTime = () => {
    if (request.is_asap) return 'ASAP';
    if (!request.requested_for_at) return null;
    const date = new Date(request.requested_for_at);
    if (isToday(date)) return `Today ${format(date, 'HH:mm')}`;
    if (isTomorrow(date)) return `Tomorrow ${format(date, 'HH:mm')}`;
    return format(date, 'MMM d, HH:mm');
  };

  const requestedTime = formatRequestedTime();

  // Determine primary action based on status
  const getPrimaryAction = () => {
    if (!canManage) return null;

    if (request.status === 'NEW' && onAcknowledge) {
      return {
        label: 'Acknowledge',
        icon: Eye,
        onClick: (e: React.MouseEvent) => { e.stopPropagation(); onAcknowledge(); },
        loading: isAcknowledging,
        variant: 'outline' as const,
      };
    }

    if ((request.status === 'ACKNOWLEDGED' || request.status === 'ASSIGNED') && isAssignedToMe && onStart) {
      return {
        label: 'Start',
        icon: PlayCircle,
        onClick: (e: React.MouseEvent) => { e.stopPropagation(); onStart(); },
        loading: isStarting,
        variant: 'default' as const,
      };
    }

    if (request.status === 'IN_PROGRESS' && isAssignedToMe && onComplete) {
      return {
        label: 'Complete',
        icon: CheckCircle2,
        onClick: (e: React.MouseEvent) => { e.stopPropagation(); onComplete(); },
        loading: isCompleting,
        variant: 'default' as const,
        className: 'bg-success hover:bg-success/90 text-success-foreground',
      };
    }

    return null;
  };

  const primaryAction = getPrimaryAction();

  return (
    <Card
      variant="interactive"
      onClick={onClick}
      className={cn(
        "p-4 cursor-pointer transition-all duration-200",
        "hover:shadow-md",
        isUrgent && "ring-1 ring-destructive/30 bg-destructive/5"
      )}
    >
      {/* Top Row: Priority Icon + Title + Status */}
      <div className="flex items-start gap-3">
        {/* Priority Indicator */}
        <div
          className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border",
            priorityConfig.bgClass
          )}
        >
          {request.priority === 'URGENT' ? (
            <AlertTriangle className={cn("h-5 w-5", priorityConfig.className)} />
          ) : (
            <ClipboardList className={cn("h-5 w-5", priorityConfig.className)} />
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-foreground truncate max-w-[200px] sm:max-w-none">
                  {request.title}
                </h4>
                {request.item_count > 1 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">
                    {request.item_count} items
                  </Badge>
                )}
              </div>
              {request.item_preview && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {request.item_preview}
                </p>
              )}
            </div>
            
            {/* Desktop: Chevron */}
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 hidden sm:block" />
          </div>

          {/* Guest & Location Info */}
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              <span className="truncate max-w-[100px]">{request.guest_name}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {request.room_number}
            </span>
            {requestedTime && (
              <span className="flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5" />
                {requestedTime === 'ASAP' ? (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    ASAP
                  </Badge>
                ) : (
                  <span>{requestedTime}</span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Status + Department + Time + Action */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center gap-2 flex-wrap">
          <RequestStatusPill status={request.status} size="sm" />
          <Badge variant="outline" className="text-[10px] capitalize">
            {request.department_key.toLowerCase().replace('_', ' ')}
          </Badge>
          {request.assigned_to_name && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 hidden sm:flex">
              <UserPlus className="h-3 w-3" />
              {request.assigned_to_name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
          </span>

          {/* Primary Action Button */}
          {primaryAction && (
            <Button
              variant={primaryAction.variant}
              size="sm"
              className={cn("h-8 px-3", primaryAction.className)}
              onClick={primaryAction.onClick}
              disabled={primaryAction.loading}
            >
              {primaryAction.loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <primaryAction.icon className="h-4 w-4" />
              )}
              <span className="ml-1.5 hidden sm:inline">{primaryAction.label}</span>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
