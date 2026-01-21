import { memo } from 'react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RequestStatusPill } from './RequestStatusPill';
import { categoryConfigs } from './RequestCategoryGrid';
import { ServiceRequest } from '@/hooks/useServiceRequests';
import { Clock, Package, Calendar, X } from 'lucide-react';

interface RequestCardProps {
  request: ServiceRequest;
  onCancel?: (id: string) => void;
  isCancelling?: boolean;
  resortTimezone?: string;
}

export const RequestCard = memo(function RequestCard({
  request,
  onCancel,
  isCancelling,
  resortTimezone,
}: RequestCardProps) {
  const category = categoryConfigs.find(
    (c) => c.key === request.category || c.key === request.department_key
  ) || categoryConfigs[categoryConfigs.length - 1]; // Default to OTHER
  
  const CategoryIcon = category.icon;
  const canCancel = request.status === 'NEW' && onCancel;
  
  const createdAt = parseISO(request.created_at);
  const relativeTime = formatDistanceToNow(createdAt, { addSuffix: true });
  
  // Format scheduled time if not ASAP
  const scheduledTime = request.requested_for_at
    ? format(parseISO(request.requested_for_at), 'EEE, MMM d · h:mm a')
    : null;

  return (
    <Card className={cn(
      'overflow-hidden transition-all duration-200',
      request.status === 'CANCELLED' && 'opacity-60',
      request.status === 'COMPLETED' && 'bg-muted/30'
    )}>
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Category Icon */}
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            'bg-gradient-to-br',
            category.color
          )}>
            <CategoryIcon className="h-5 w-5 text-white" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm text-foreground truncate">
                  {request.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {category.label}
                </p>
              </div>
              <RequestStatusPill status={request.status} size="sm" />
            </div>
            
            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {request.quantity > 1 && (
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  Qty: {request.quantity}
                </span>
              )}
              
              {request.is_asap ? (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  ASAP
                </span>
              ) : scheduledTime && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {scheduledTime}
                </span>
              )}
              
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {relativeTime}
              </span>
            </div>
            
            {/* Notes */}
            {request.notes && (
              <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 rounded-lg px-2 py-1.5">
                {request.notes}
              </p>
            )}
            
            {/* Timestamps for completed/acknowledged */}
            {request.status === 'COMPLETED' && request.completed_at && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                ✓ Completed {formatDistanceToNow(parseISO(request.completed_at), { addSuffix: true })}
              </p>
            )}
            
            {request.status === 'ACKNOWLEDGED' && request.acknowledged_at && (
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Received {formatDistanceToNow(parseISO(request.acknowledged_at), { addSuffix: true })}
              </p>
            )}
            
            {/* Cancel button */}
            {canCancel && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 -ml-2"
                onClick={() => onCancel(request.id)}
                disabled={isCancelling}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel Request
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
