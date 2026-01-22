import { memo, useState } from 'react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RequestStatusPill } from './RequestStatusPill';
import { categoryConfigs } from './RequestCategoryGrid';
import { ServiceRequestWithItems } from '@/hooks/useServiceRequests';
import { 
  Clock, 
  Calendar, 
  ChevronDown, 
  ChevronUp,
  Package,
  Building2,
  X,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface RequestSubmissionCardProps {
  requests: ServiceRequestWithItems[];
  submissionId: string;
  onCancel?: (requestId: string) => void;
  isCancelling?: boolean;
  slaMinutes?: number;
}

export const RequestSubmissionCard = memo(function RequestSubmissionCard({
  requests,
  submissionId,
  onCancel,
  isCancelling,
  slaMinutes = 15,
}: RequestSubmissionCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Use first request for shared metadata
  const firstRequest = requests[0];
  if (!firstRequest) return null;

  const createdAt = parseISO(firstRequest.created_at);
  const totalItems = requests.reduce((sum, r) => sum + (r.items?.length || 1), 0);
  
  // Get overall status (worst case wins)
  const statusPriority = ['NEW', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  const overallStatus = requests.reduce((worst, r) => {
    const worstIdx = statusPriority.indexOf(worst);
    const currentIdx = statusPriority.indexOf(r.status);
    return currentIdx < worstIdx ? r.status : worst;
  }, 'COMPLETED' as typeof firstRequest.status);

  // Check if any request can be cancelled
  const cancellableRequest = requests.find((r) => r.status === 'NEW');

  const scheduledTime = firstRequest.requested_for_at
    ? format(parseISO(firstRequest.requested_for_at), 'EEE, MMM d · h:mm a')
    : null;

  const getTimeDisplay = () => {
    const minutesAgo = Math.floor((Date.now() - createdAt.getTime()) / 60000);
    if (minutesAgo < 1) return 'Just now';
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    return formatDistanceToNow(createdAt, { addSuffix: true });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <Card className={cn(
        'overflow-hidden transition-all duration-300',
        overallStatus === 'CANCELLED' && 'opacity-60',
        overallStatus === 'COMPLETED' && 'bg-muted/30 border-emerald-500/20'
      )}>
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary to-primary/80 shadow-sm flex-shrink-0">
                <Package className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm text-foreground">
                  {totalItems} item{totalItems !== 1 ? 's' : ''} requested
                </h3>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Building2 className="h-3 w-3" />
                    {requests.length} department{requests.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
            </div>
            <RequestStatusPill 
              status={overallStatus}
              size="sm"
              createdAt={firstRequest.created_at}
              slaMinutes={slaMinutes}
            />
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-3">
            {firstRequest.is_asap ? (
              <span className="flex items-center gap-1 text-primary font-medium">
                <Clock className="h-3 w-3" />
                ASAP
              </span>
            ) : scheduledTime && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {scheduledTime}
              </span>
            )}
            
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 cursor-help hover:text-foreground transition-colors">
                    <Clock className="h-3 w-3" />
                    {getTimeDisplay()}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{format(createdAt, 'PPpp')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Expand/collapse for department details */}
          <div className="mt-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs w-full justify-between"
              onClick={() => setExpanded(!expanded)}
            >
              <span>View {requests.length > 1 ? 'department breakdown' : 'details'}</span>
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5 ml-1" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              )}
            </Button>
            
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 pt-3">
                    {requests.map((request) => {
                      const category = categoryConfigs.find(
                        (c) => c.key === request.category || c.key === request.department_key
                      ) || categoryConfigs[categoryConfigs.length - 1];
                      const CategoryIcon = category.icon;

                      return (
                        <div
                          key={request.id}
                          className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                        >
                          <div className={cn(
                            'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                            'border-2 bg-transparent',
                            category.ringColor
                          )}>
                            <CategoryIcon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs truncate">{request.title}</p>
                            {request.items && request.items.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {request.items.slice(0, 3).map((item, idx) => (
                                  <span 
                                    key={idx} 
                                    className="text-[10px] text-muted-foreground bg-background px-1.5 py-0.5 rounded"
                                  >
                                    {item.title}{item.quantity > 1 ? ` ×${item.quantity}` : ''}
                                  </span>
                                ))}
                                {request.items.length > 3 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    +{request.items.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <RequestStatusPill 
                            status={request.status}
                            size="sm"
                            createdAt={request.created_at}
                            slaMinutes={slaMinutes}
                          />
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Notes if present */}
                  {firstRequest.notes && (
                    <div className="mt-3 p-2 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Notes:</span> {firstRequest.notes}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Cancel button (only if any request is NEW) */}
          {cancellableRequest && onCancel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mt-3 pt-3 border-t border-border/50"
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onCancel(cancellableRequest.id)}
                disabled={isCancelling}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel Request
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
});
