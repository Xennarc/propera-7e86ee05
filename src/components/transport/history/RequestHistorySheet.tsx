import { format, formatDistanceToNow } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle2, 
  XCircle, 
  UserX,
  MapPin,
  Users,
  Star,
  Clock,
  User,
  Car,
  ArrowRight,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { useRequestEvents } from '@/hooks/transport/useTransportHistory';
import type { RequestHistoryRow, RequestEventRow } from '@/hooks/transport/useTransportHistory';

interface RequestHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: RequestHistoryRow | null;
}

const statusConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  completed: { icon: CheckCircle2, label: 'Completed', color: 'text-green-500' },
  cancelled: { icon: XCircle, label: 'Cancelled', color: 'text-red-500' },
  no_show: { icon: UserX, label: 'No Show', color: 'text-amber-500' },
};

const eventLabels: Record<string, string> = {
  created: 'Request Created',
  assigned_to_trip: 'Added to Trip',
  added_to_trip: 'Added to Trip',
  removed_from_trip: 'Removed from Trip',
  driver_assigned: 'Driver Assigned',
  driver_en_route: 'Driver En Route',
  arrived: 'Driver Arrived',
  picked_up: 'Guest Picked Up',
  completed: 'Ride Completed',
  cancelled: 'Request Cancelled',
  no_show: 'Marked No Show',
};

function EventTimeline({ events, isLoading }: { events: RequestEventRow[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }
  
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No events recorded for this request.
      </p>
    );
  }
  
  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
      
      <div className="space-y-4">
        {events.map((event, index) => (
          <div key={event.id} className="relative pl-8">
            {/* Timeline dot */}
            <div className="absolute left-1.5 top-1.5 h-3 w-3 rounded-full bg-primary border-2 border-background" />
            
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-medium text-sm">
                  {eventLabels[event.event_type] || event.event_type}
                </span>
                <Badge variant="outline" className="text-xs h-5">
                  {event.actor_type}
                </Badge>
              </div>
              
              <p className="text-xs text-muted-foreground">
                {format(new Date(event.created_at), 'MMM d, h:mm:ss a')}
              </p>
              
              {/* Show payload details for certain events */}
              {event.event_type === 'cancelled' && event.payload?.reason && (
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {String(event.payload.reason)}
                </p>
              )}
              
              {event.payload?.trip_id && (
                <p className="text-xs text-muted-foreground mt-1">
                  Trip: {String(event.payload.trip_id).slice(0, 8)}...
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RequestHistorySheet({ open, onOpenChange, request }: RequestHistorySheetProps) {
  const { data: events = [], isLoading: eventsLoading } = useRequestEvents(request?.id);
  
  if (!request) return null;
  
  const config = statusConfig[request.status] || statusConfig.completed;
  const StatusIcon = config.icon;
  const isVip = request.priority === 'vip';
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2">
            {isVip && (
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            )}
            <SheetTitle>Request Details</SheetTitle>
          </div>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-120px)] pr-4">
          {/* Status banner */}
          <div className={`flex items-center gap-2 p-3 rounded-lg bg-muted mb-4`}>
            <StatusIcon className={`h-5 w-5 ${config.color}`} />
            <span className="font-medium">{config.label}</span>
            <span className="text-muted-foreground text-sm ml-auto">
              {formatDistanceToNow(new Date(request.updated_at), { addSuffix: true })}
            </span>
          </div>
          
          {/* Guest info */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{request.guest_name || 'Unknown Guest'}</p>
                {request.room_number && (
                  <p className="text-sm text-muted-foreground">Room {request.room_number}</p>
                )}
              </div>
              <div className="ml-auto text-right">
                <div className="flex items-center gap-1 text-sm">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  {request.party_size} passenger{request.party_size !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
          
          {/* Route */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Route</h4>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <MapPin className="h-3.5 w-3.5 text-green-500" />
                  <span className="font-medium text-sm">
                    {request.pickup_stop_name || request.pickup_text || 'Unknown pickup'}
                  </span>
                </div>
                {request.pickup_zone && (
                  <p className="text-xs text-muted-foreground ml-5">{request.pickup_zone}</p>
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <MapPin className="h-3.5 w-3.5 text-red-500" />
                  <span className="font-medium text-sm">
                    {request.dropoff_stop_name || request.dropoff_text || 'Unknown dropoff'}
                  </span>
                </div>
                {request.dropoff_zone && (
                  <p className="text-xs text-muted-foreground ml-5">{request.dropoff_zone}</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Request details */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Created</p>
              <p className="text-sm font-medium">
                {format(new Date(request.created_at), 'MMM d, h:mm a')}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Source</p>
              <p className="text-sm font-medium capitalize">
                {request.request_source.replace(/_/g, ' ')}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Type</p>
              <p className="text-sm font-medium capitalize">
                {request.request_type.replace(/_/g, ' ')}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Priority</p>
              <div className="flex items-center gap-1">
                {isVip && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
                <span className="text-sm font-medium capitalize">{request.priority}</span>
              </div>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          {/* Event timeline */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Event Timeline
            </h4>
            <EventTimeline events={events} isLoading={eventsLoading} />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
