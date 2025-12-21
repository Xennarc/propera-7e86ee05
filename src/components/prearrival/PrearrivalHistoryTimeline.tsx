import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { ChevronDown, ChevronUp, Clock, User, Bot, UserCheck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  usePrearrivalHistory, 
  formatFieldChange, 
  getEventIcon, 
  getActorLabel,
  PrearrivalHistoryEvent 
} from '@/hooks/usePrearrivalHistory';
import { cn } from '@/lib/utils';

interface PrearrivalHistoryTimelineProps {
  guestId: string;
  initialLimit?: number;
  showExpandButton?: boolean;
}

export function PrearrivalHistoryTimeline({
  guestId,
  initialLimit = 3,
  showExpandButton = true,
}: PrearrivalHistoryTimelineProps) {
  const [expanded, setExpanded] = useState(false);
  const limit = expanded ? 50 : initialLimit;
  
  const { data: events, isLoading, error } = usePrearrivalHistory({
    guestId,
    limit,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-muted-foreground p-2 rounded bg-muted/50">
        Couldn't load history
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-2">
        No history yet
      </div>
    );
  }

  const displayedEvents = expanded ? events : events.slice(0, initialLimit);
  const hasMore = events.length > initialLimit;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {displayedEvents.map((event, index) => (
          <HistoryEventItem 
            key={event.id} 
            event={event} 
            isLast={index === displayedEvents.length - 1}
          />
        ))}
      </div>
      
      {showExpandButton && hasMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="w-full text-xs"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Show all ({events.length} events)
            </>
          )}
        </Button>
      )}
    </div>
  );
}

interface HistoryEventItemProps {
  event: PrearrivalHistoryEvent;
  isLast: boolean;
}

function HistoryEventItem({ event, isLast }: HistoryEventItemProps) {
  const ActorIcon = event.actor === 'staff' ? UserCheck : 
                    event.actor === 'system' ? Bot : User;
  
  const eventTime = parseISO(event.created_at);
  const changedFieldsList = Object.entries(event.changed_fields);

  return (
    <div className={cn(
      "relative pl-6 pb-3",
      !isLast && "border-l border-border ml-2"
    )}>
      {/* Timeline dot */}
      <div className="absolute left-0 -translate-x-1/2 top-0 w-4 h-4 rounded-full bg-background border-2 border-primary flex items-center justify-center text-[10px]">
        {getEventIcon(event.event_type)}
      </div>
      
      <div className="space-y-1">
        {/* Header */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">
            {event.event_type === 'prearrival_completed' 
              ? 'Pre-arrival completed' 
              : event.event_type === 'prearrival_created'
              ? 'Profile created'
              : 'Details updated'}
          </span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            <ActorIcon className="h-2.5 w-2.5 mr-1" />
            {getActorLabel(event.actor, event.actor_name)}
          </Badge>
        </div>
        
        {/* Changed fields */}
        {changedFieldsList.length > 0 && (
          <div className="text-xs text-muted-foreground space-y-0.5">
            {changedFieldsList.slice(0, 3).map(([field, values]) => (
              <div key={field} className="truncate">
                {formatFieldChange(field, values)}
              </div>
            ))}
            {changedFieldsList.length > 3 && (
              <div className="text-muted-foreground/70">
                +{changedFieldsList.length - 3} more changes
              </div>
            )}
          </div>
        )}
        
        {/* Timestamp */}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          {formatDistanceToNow(eventTime, { addSuffix: true })}
          <span className="text-muted-foreground/50">•</span>
          {format(eventTime, 'MMM d, h:mm a')}
        </div>
      </div>
    </div>
  );
}
