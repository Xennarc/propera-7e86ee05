import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RequestSLABadge } from './RequestSLABadge';
import { formatDistanceToNow } from 'date-fns';
import { Eye, Play, CheckCircle2, User, MapPin, Package } from 'lucide-react';
import type { RequestWithSLA } from '@/hooks/useRequestsDashboard';
import { getSLAConfig } from '@/lib/request-sla-config';

interface RequestDashboardCardProps {
  request: RequestWithSLA;
  onAcknowledge?: () => void;
  onStart?: () => void;
  onComplete?: () => void;
  onAssignToMe?: () => void;
  onOpenDetail?: () => void;
  isLoading?: boolean;
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  URGENT: { label: 'URGENT', className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 animate-pulse' },
  HIGH: { label: 'HIGH', className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30' },
  NORMAL: { label: 'NORMAL', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  LOW: { label: 'LOW', className: 'bg-muted text-muted-foreground border-border' },
};

export function RequestDashboardCard({
  request,
  onAcknowledge,
  onStart,
  onComplete,
  onAssignToMe,
  onOpenDetail,
  isLoading,
}: RequestDashboardCardProps) {
  const priorityCfg = priorityConfig[request.priority] || priorityConfig.NORMAL;
  const isNew = request.status === 'NEW';
  const isInProgress = request.status === 'IN_PROGRESS';
  const isAcknowledged = request.status === 'ACKNOWLEDGED' || request.status === 'ASSIGNED';
  const isCompleted = request.status === 'COMPLETED';
  const hasMultipleItems = request.item_count > 1;

  return (
    <div
      className={cn(
        'group relative rounded-xl border bg-card p-4 transition-all duration-200',
        'hover:shadow-md hover:border-border/80',
        request.slaStatus?.isOverdue && 'border-red-500/50 bg-red-500/5',
        isNew && request.priority === 'URGENT' && 'ring-1 ring-red-500/30'
      )}
    >
      {/* Priority Badge + SLA */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn('text-[10px] font-semibold', priorityCfg.className)}>
            {priorityCfg.label}
          </Badge>
          {hasMultipleItems && (
            <Badge variant="secondary" className="text-[10px] gap-1">
              <Package className="h-3 w-3" />
              {request.item_count} items
            </Badge>
          )}
        </div>
        <RequestSLABadge slaStatus={request.slaStatus} priority={request.priority} compact />
      </div>

      {/* Main Content */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground line-clamp-1">
            {request.title}
          </h3>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
          </span>
        </div>

        {hasMultipleItems && request.item_preview && (
          <p className="text-sm text-muted-foreground line-clamp-1">
            {request.item_preview}
          </p>
        )}

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {request.guest_name}
          </span>
          {request.room_number && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              Room {request.room_number}
            </span>
          )}
        </div>

        {request.assigned_to_name && (
          <p className="text-xs text-muted-foreground">
            Assigned to: <span className="font-medium">{request.assigned_to_name}</span>
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50">
        {isNew && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 flex-1"
              onClick={onAcknowledge}
              disabled={isLoading}
            >
              <Eye className="h-4 w-4" />
              Acknowledge
            </Button>
            {onAssignToMe && (
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5"
                onClick={onAssignToMe}
                disabled={isLoading}
              >
                <User className="h-4 w-4" />
                Assign to Me
              </Button>
            )}
          </>
        )}

        {isAcknowledged && (
          <Button
            size="sm"
            variant="default"
            className="gap-1.5 flex-1"
            onClick={onStart}
            disabled={isLoading}
          >
            <Play className="h-4 w-4" />
            Start
          </Button>
        )}

        {isInProgress && (
          <Button
            size="sm"
            variant="default"
            className="gap-1.5 flex-1"
            onClick={onComplete}
            disabled={isLoading}
          >
            <CheckCircle2 className="h-4 w-4" />
            Complete
          </Button>
        )}

        {isCompleted && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Completed {request.completed_at && formatDistanceToNow(new Date(request.completed_at), { addSuffix: true })}
          </span>
        )}

        {onOpenDetail && (
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={onOpenDetail}
          >
            Details
          </Button>
        )}
      </div>
    </div>
  );
}
