import { memo, useState } from 'react';
import { format, formatDistanceToNow, parseISO, differenceInMinutes } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RequestStatusPill } from './RequestStatusPill';
import { categoryConfigs } from './RequestCategoryGrid';
import { ServiceRequest } from '@/hooks/useServiceRequests';
 import { Clock, Package, Calendar, X, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface RequestCardProps {
  request: ServiceRequest;
  onCancel?: (id: string) => void;
  isCancelling?: boolean;
  resortTimezone?: string;
  slaMinutes?: number;
}

export const RequestCard = memo(function RequestCard({
  request,
  onCancel,
  isCancelling,
  resortTimezone,
  slaMinutes = 15,
}: RequestCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  const category = categoryConfigs.find(
    (c) => c.key === request.category || c.key === request.department_key
  ) || categoryConfigs[categoryConfigs.length - 1]; // Default to OTHER
  
  const CategoryIcon = category.icon;
  const canCancel = request.status === 'NEW' && onCancel;
  
  const createdAt = parseISO(request.created_at);
  const minutesAgo = differenceInMinutes(new Date(), createdAt);
   const isCancelled = request.status === 'CANCELLED';
  
  // Smart time display: "Xm ago" for recent, otherwise relative
  const getTimeChip = () => {
    if (minutesAgo < 1) return 'Just now';
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    return formatDistanceToNow(createdAt, { addSuffix: true });
  };
  
  // Format scheduled time if not ASAP
  const scheduledTime = request.requested_for_at
    ? format(parseISO(request.requested_for_at), 'EEE, MMM d · h:mm a')
    : null;
    
  const exactTimestamp = format(createdAt, 'PPpp');

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
        request.status === 'CANCELLED' && 'opacity-60',
        request.status === 'COMPLETED' && 'bg-muted/30 border-emerald-500/20'
      )}>
        <CardContent className="p-4">
          <div className="flex gap-3">
            {/* Category Icon with animation */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                'border-2 bg-transparent',
                category.ringColor
              )}
            >
              <CategoryIcon className="h-5 w-5" />
            </motion.div>
            
            {/* Content */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                 <h3 className={cn(
                   'font-semibold text-sm truncate',
                   isCancelled ? 'text-muted-foreground line-through' : 'text-foreground'
                 )}>
                    {request.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {category.label}
                  </p>
                </div>
                <RequestStatusPill 
                  status={request.status} 
                  size="sm"
                  createdAt={request.created_at}
                  slaMinutes={slaMinutes}
                />
              </div>
              
              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {request.quantity > 1 && (
                  <span className="flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    Qty: {request.quantity}
                  </span>
                )}
                
               {request.notes && !expanded && (
                 <span className="flex items-center gap-1">
                   <MessageSquare className="h-3 w-3" />
                   Notes
                 </span>
               )}
 
                {request.is_asap ? (
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
                        {getTimeChip()}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{exactTimestamp}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
             {/* Notes section */}
              {request.notes && (
                <motion.div
                  initial={false}
                  animate={{ height: expanded ? 'auto' : '2rem' }}
                  className="relative overflow-hidden"
                >
                  <p className={cn(
                    'text-xs text-muted-foreground bg-muted/50 rounded-lg px-2 py-1.5',
                    !expanded && 'line-clamp-1'
                  )}>
                    {request.notes}
                  </p>
                  {request.notes.length > 60 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1 text-[10px] mt-0.5"
                      onClick={() => setExpanded(!expanded)}
                    >
                      {expanded ? (
                        <>
                          <ChevronUp className="h-3 w-3 mr-0.5" />
                          Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 mr-0.5" />
                          More
                        </>
                      )}
                    </Button>
                  )}
                </motion.div>
              )}
              
              {/* Status timestamps */}
              <AnimatePresence mode="wait">
               {isCancelled && request.cancelled_at && (
                 <motion.p
                   initial={{ opacity: 0, x: -10 }}
                   animate={{ opacity: 1, x: 0 }}
                   className="text-xs text-muted-foreground flex items-center gap-1"
                 >
                   <span className="text-base">✗</span>
                   Cancelled {formatDistanceToNow(parseISO(request.cancelled_at), { addSuffix: true })}
                 </motion.p>
               )}
 
               {!isCancelled && request.status === 'COMPLETED' && request.completed_at && (
                  <motion.p
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"
                  >
                    <span className="text-base">✓</span>
                    Completed {formatDistanceToNow(parseISO(request.completed_at), { addSuffix: true })}
                  </motion.p>
                )}
                
               {!isCancelled && request.status === 'ACKNOWLEDGED' && request.acknowledged_at && (
                  <motion.p
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xs text-blue-600 dark:text-blue-400"
                  >
                    Received {formatDistanceToNow(parseISO(request.acknowledged_at), { addSuffix: true })}
                  </motion.p>
                )}
              </AnimatePresence>
              
              {/* Cancel button */}
              {canCancel && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
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
                </motion.div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});
