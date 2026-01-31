import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, Users, Star, Accessibility, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TransportQueueRequest } from '@/hooks/transport/useTransportQueue';

interface AddRequestToTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string | null;
  queuedRequests: TransportQueueRequest[];
  onAdd: (requestIds: string[]) => void;
  isAdding: boolean;
}

export function AddRequestToTripDialog({
  open,
  onOpenChange,
  tripId,
  queuedRequests,
  onAdd,
  isAdding,
}: AddRequestToTripDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Filter to only show requests not already in a trip
  const eligibleRequests = queuedRequests.filter(
    r => r.status === 'requested' || r.status === 'queued'
  );
  
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  const handleAdd = () => {
    if (selectedIds.size > 0) {
      onAdd(Array.from(selectedIds));
    }
  };
  
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedIds(new Set());
    }
    onOpenChange(newOpen);
  };
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Requests to Trip</DialogTitle>
          <DialogDescription>
            Select one or more requests from the queue to add to this trip.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[400px] -mx-6 px-6">
          {eligibleRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                <Inbox className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No eligible requests in queue
              </p>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {eligibleRequests.map((request) => {
                const isSelected = selectedIds.has(request.id);
                const pickupName = request.pickup_stop?.name || request.pickup_text || 'Unknown';
                const dropoffName = request.dropoff_stop?.name || request.dropoff_text || 'Unknown';
                
                return (
                  <div
                    key={request.id}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    )}
                    onClick={() => toggleSelect(request.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(request.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {request.guest_name || 'Guest'} • Room {request.room_number || '—'}
                        </span>
                        {request.priority === 'vip' && (
                          <Badge variant="outline" className="text-2xs bg-amber-500/20 text-amber-600 border-amber-500/30">
                            <Star className="h-2.5 w-2.5 mr-0.5" />
                            VIP
                          </Badge>
                        )}
                        {request.needs_accessible && (
                          <Accessibility className="h-3.5 w-3.5 text-blue-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 text-green-500 shrink-0" />
                        <span className="truncate">{pickupName}</span>
                        <span>→</span>
                        <MapPin className="h-3 w-3 text-red-500 shrink-0" />
                        <span className="truncate">{dropoffName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Users className="h-3.5 w-3.5" />
                      {request.party_size}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAdd} 
            disabled={selectedIds.size === 0 || isAdding}
          >
            {isAdding ? 'Adding...' : `Add ${selectedIds.size} Request${selectedIds.size !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
