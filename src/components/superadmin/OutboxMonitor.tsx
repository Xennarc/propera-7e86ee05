import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  RefreshCw,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useOutboxEvents, useOutboxStats, useRetryFailedEvents, useTriggerOutboxProcessor } from '@/hooks/useOutboxEvents';
import { toast } from 'sonner';

const statusConfig = {
  PENDING: { icon: Clock, color: 'bg-warning/10 text-warning border-warning/30', label: 'Pending' },
  PROCESSING: { icon: Loader2, color: 'bg-info/10 text-info border-info/30', label: 'Processing' },
  DONE: { icon: CheckCircle2, color: 'bg-success/10 text-success border-success/30', label: 'Done' },
  FAILED: { icon: AlertTriangle, color: 'bg-destructive/10 text-destructive border-destructive/30', label: 'Failed' },
};

const eventTypeLabels: Record<string, string> = {
  ACTIVITY_BOOKING_CREATED: 'Activity Booked',
  ACTIVITY_BOOKING_CONFIRMED: 'Activity Confirmed',
  ACTIVITY_BOOKING_CANCELLED: 'Activity Cancelled',
  ACTIVITY_BOOKING_REJECTED: 'Activity Rejected',
  RESTAURANT_RESERVATION_CREATED: 'Reservation Made',
  RESTAURANT_RESERVATION_CONFIRMED: 'Reservation Confirmed',
  RESTAURANT_RESERVATION_CANCELLED: 'Reservation Cancelled',
  RESTAURANT_RESERVATION_REJECTED: 'Reservation Rejected',
  PREARRIVAL_SENT: 'Pre-Arrival Email Sent',
  DEMO_EXPIRING: 'Demo Expiring',
};

export default function OutboxMonitor() {
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [showFailed, setShowFailed] = useState(true);
  
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useOutboxStats();
  const { data: failedEvents, isLoading: loadingEvents, refetch: refetchEvents } = useOutboxEvents({ 
    status: 'FAILED', 
    limit: 50 
  });
  const { data: pendingEvents } = useOutboxEvents({ 
    status: 'PENDING', 
    limit: 10 
  });
  
  const retryMutation = useRetryFailedEvents();
  const triggerMutation = useTriggerOutboxProcessor();

  const handleRetrySelected = async () => {
    if (selectedEvents.length === 0) return;
    
    try {
      const count = await retryMutation.mutateAsync(selectedEvents);
      toast.success(`Retried ${count} events`);
      setSelectedEvents([]);
      refetchEvents();
      refetchStats();
    } catch (error) {
      toast.error('Failed to retry events');
    }
  };

  const handleTriggerProcessor = async () => {
    try {
      const result = await triggerMutation.mutateAsync();
      toast.success(`Processed ${result.processed || 0} events`);
      refetchEvents();
      refetchStats();
    } catch (error) {
      toast.error('Failed to trigger processor');
    }
  };

  const toggleEventSelection = (eventId: string) => {
    setSelectedEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const selectAll = () => {
    if (!failedEvents) return;
    if (selectedEvents.length === failedEvents.length) {
      setSelectedEvents([]);
    } else {
      setSelectedEvents(failedEvents.map(e => e.id));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Notification Outbox
            </CardTitle>
            <CardDescription>
              Reliable notification delivery with retry support
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchStats();
                refetchEvents();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleTriggerProcessor}
              disabled={triggerMutation.isPending}
            >
              {triggerMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Process Now
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        {loadingStats ? (
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-warning/10 rounded-xl text-center">
              <p className="text-2xl font-bold text-warning">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="p-4 bg-info/10 rounded-xl text-center">
              <p className="text-2xl font-bold text-info">{stats.processing}</p>
              <p className="text-xs text-muted-foreground">Processing</p>
            </div>
            <div className="p-4 bg-success/10 rounded-xl text-center">
              <p className="text-2xl font-bold text-success">{stats.done}</p>
              <p className="text-xs text-muted-foreground">Done (24h)</p>
            </div>
            <div className="p-4 bg-destructive/10 rounded-xl text-center">
              <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
          </div>
        ) : null}

        {/* Pending Queue (Quick View) */}
        {pendingEvents && pendingEvents.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />
              Next in Queue
            </h4>
            <div className="flex flex-wrap gap-2">
              {pendingEvents.slice(0, 5).map(event => (
                <Badge key={event.id} variant="outline" className="text-xs">
                  {eventTypeLabels[event.event_type] || event.event_type}
                </Badge>
              ))}
              {pendingEvents.length > 5 && (
                <Badge variant="secondary" className="text-xs">
                  +{pendingEvents.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Failed Events */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Failed Notifications
            </h4>
            {failedEvents && failedEvents.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                >
                  {selectedEvents.length === failedEvents.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetrySelected}
                  disabled={selectedEvents.length === 0 || retryMutation.isPending}
                >
                  {retryMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-2" />
                  )}
                  Retry Selected ({selectedEvents.length})
                </Button>
              </div>
            )}
          </div>

          {loadingEvents ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : failedEvents && failedEvents.length > 0 ? (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {failedEvents.map(event => {
                  const StatusIcon = statusConfig[event.status].icon;
                  return (
                    <div
                      key={event.id}
                      className={`p-3 rounded-lg border ${
                        selectedEvents.includes(event.id) 
                          ? 'bg-destructive/5 border-destructive/30' 
                          : 'bg-muted/30 border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedEvents.includes(event.id)}
                          onCheckedChange={() => toggleEventSelection(event.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={statusConfig[event.status].color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig[event.status].label}
                            </Badge>
                            <span className="text-sm font-medium">
                              {eventTypeLabels[event.event_type] || event.event_type}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {event.resort_name}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Attempts: {event.attempts} • 
                            {formatDistanceToNow(new Date(event.updated_at), { addSuffix: true })}
                          </p>
                          {event.last_error && (
                            <p className="text-xs text-destructive bg-destructive/5 rounded px-2 py-1 font-mono truncate">
                              {event.last_error}
                            </p>
                          )}
                          {event.payload?.guest_name && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Guest: {event.payload.guest_name} • 
                              {event.payload.activity_name || event.payload.restaurant_name || 'N/A'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-success/50 mb-2" />
              <p className="font-medium text-sm">No Failed Notifications</p>
              <p className="text-xs text-muted-foreground">All notifications delivered successfully</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
