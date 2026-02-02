import { formatDistanceToNow, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { 
  CheckCircle2, 
  XCircle, 
  UserX, 
  MapPin, 
  Users, 
  Star,
  Inbox 
} from 'lucide-react';
import type { RequestHistoryRow } from '@/hooks/transport/useTransportHistory';

interface RequestHistoryListProps {
  requests: RequestHistoryRow[];
  isLoading: boolean;
  onSelectRequest: (request: RequestHistoryRow) => void;
  selectedId?: string;
}

const statusConfig: Record<string, { icon: React.ElementType; label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  completed: { icon: CheckCircle2, label: 'Completed', variant: 'default' },
  cancelled: { icon: XCircle, label: 'Cancelled', variant: 'destructive' },
  no_show: { icon: UserX, label: 'No Show', variant: 'secondary' },
};

export function RequestHistoryList({ 
  requests, 
  isLoading, 
  onSelectRequest,
  selectedId,
}: RequestHistoryListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }
  
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Inbox className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No requests found</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Adjust your filters or date range to find past buggy requests.
        </p>
      </div>
    );
  }
  
  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-4">
        {requests.map((request) => {
          const config = statusConfig[request.status] || statusConfig.completed;
          const StatusIcon = config.icon;
          const isVip = request.priority === 'vip';
          
          return (
            <button
              key={request.id}
              onClick={() => onSelectRequest(request)}
              className={cn(
                'w-full text-left p-4 rounded-xl border transition-all',
                'hover:bg-accent/50 hover:border-primary/20',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                selectedId === request.id && 'bg-accent border-primary/30'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Guest info */}
                  <div className="flex items-center gap-2 mb-1">
                    {isVip && (
                      <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    )}
                    <span className="font-medium truncate">
                      {request.guest_name || 'Unknown Guest'}
                    </span>
                    {request.room_number && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        Room {request.room_number}
                      </span>
                    )}
                  </div>
                  
                  {/* Route */}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {request.pickup_stop_name || request.pickup_text || 'Unknown'} → {request.dropoff_stop_name || request.dropoff_text || 'Unknown'}
                    </span>
                  </div>
                  
                  {/* Meta row */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {request.party_size}
                    </span>
                    <span>
                      {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                
                {/* Status badge */}
                <Badge variant={config.variant} className="shrink-0 gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {config.label}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
