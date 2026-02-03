import { useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Car, 
  User, 
  Users, 
  MapPin,
  ChevronDown,
  ChevronUp,
  Plus,
  UserPlus,
  Settings2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { TransportTrip, TripRequestSummary } from '@/hooks/transport/useTransportTrips';

interface TripCardProps {
  trip: TransportTrip;
  onAssign: () => void;
  onAddRequest: () => void;
  onViewDetails: () => void;
  onRemoveRequest: (requestId: string) => void;
}

const statusConfig = {
  planning: { label: 'Planning', className: 'bg-blue-500/20 text-blue-600' },
  assigned: { label: 'Assigned', className: 'bg-purple-500/20 text-purple-600' },
  en_route: { label: 'En Route', className: 'bg-amber-500/20 text-amber-600' },
  active: { label: 'Active', className: 'bg-green-500/20 text-green-600' },
};

export function TripCard({
  trip,
  onAssign,
  onAddRequest,
  onViewDetails,
  onRemoveRequest,
}: TripCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const status = statusConfig[trip.status as keyof typeof statusConfig] || statusConfig.planning;
  const capacity = trip.buggy_capacity || trip.capacity_total || 6;
  const capacityPercent = Math.min((trip.total_party_size / capacity) * 100, 100);
  const isOverCapacity = trip.total_party_size > capacity;
  const needsAssignment = trip.status === 'planning';
  
  // Get active requests (not cancelled/dropped)
  const activeRequests = trip.trip_requests.filter(
    tr => tr.state === 'queued' || tr.state === 'picked_up'
  );
  
  return (
    <motion.div 
      layout
      className="group rounded-xl border bg-card overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge className={cn('text-xs', status.className)}>
              {status.label}
            </Badge>
            {needsAssignment && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-500/30">
                Needs Assignment
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-11 w-11 min-w-[44px] min-h-[44px] shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Assignment info */}
        <div className="flex items-center gap-4 text-sm mb-3">
          <div className="flex items-center gap-1.5">
            <Car className="h-4 w-4 text-muted-foreground" />
            <span>{trip.buggy_name || 'No buggy'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{trip.driver_name || 'No driver'}</span>
          </div>
        </div>
        
        {/* Capacity meter */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Capacity</span>
            <span className={cn(
              'font-medium',
              isOverCapacity && 'text-destructive'
            )}>
              {trip.total_party_size} / {capacity} passengers
            </span>
          </div>
          <Progress 
            value={capacityPercent} 
            className={cn('h-2', isOverCapacity && '[&>div]:bg-destructive')}
          />
        </div>
      </div>
      
      {/* Expanded content */}
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t"
        >
          {/* Request list */}
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Requests ({activeRequests.length})</span>
              <Button size="sm" variant="outline" className="h-7" onClick={onAddRequest}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            </div>
            
            {activeRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No requests in this trip
              </p>
            ) : (
              <div className="space-y-2">
                {activeRequests.map((tr) => (
                  <TripRequestRow 
                    key={tr.id} 
                    tripRequest={tr}
                    onRemove={() => tr.request && onRemoveRequest(tr.request.id)}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="p-4 border-t bg-muted/30 flex gap-2">
            {needsAssignment && (
              <Button size="sm" onClick={onAssign} className="flex-1">
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Buggy & Driver
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onViewDetails}>
              <Settings2 className="h-4 w-4 mr-2" />
              Details
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

interface TripRequestRowProps {
  tripRequest: TripRequestSummary;
  onRemove: () => void;
}

function TripRequestRow({ tripRequest, onRemove }: TripRequestRowProps) {
  const req = tripRequest.request;
  if (!req) return null;
  
  const stateConfig = {
    queued: { label: 'Waiting', className: 'bg-muted text-muted-foreground' },
    picked_up: { label: 'Picked Up', className: 'bg-green-500/20 text-green-600' },
  };
  const state = stateConfig[tripRequest.state as keyof typeof stateConfig] || stateConfig.queued;
  
  return (
    <div className="group flex items-center gap-3 p-2 rounded-lg bg-background border">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium truncate">
            {req.guest_name || 'Guest'} • Room {req.room_number || '—'}
          </span>
          <Badge variant="secondary" className={cn('text-2xs shrink-0', state.className)}>
            {state.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 text-green-500" />
          <span className="truncate">{req.pickup_stop_name || req.pickup_text || '—'}</span>
          <span>→</span>
          <MapPin className="h-3 w-3 text-red-500" />
          <span className="truncate">{req.dropoff_stop_name || req.dropoff_text || '—'}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {tripRequest.party_size}
        </div>
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-11 w-11 min-w-[44px] min-h-[44px] text-muted-foreground hover:text-destructive opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
        >
          <span className="sr-only">Remove</span>
          ×
        </Button>
      </div>
    </div>
  );
}
