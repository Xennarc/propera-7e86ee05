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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Accessibility, Car, User } from 'lucide-react';
import type { BuggyRow } from '@/hooks/transport/useBuggies';
import type { DriverRow } from '@/hooks/transport/useBuggyDrivers';
import type { TransportTrip } from '@/hooks/transport/useTransportTrips';

interface AssignTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: TransportTrip | null;
  buggies: BuggyRow[];
  drivers: DriverRow[];
  onAssign: (buggyId: string, driverUserId: string) => void;
  isAssigning: boolean;
}

export function AssignTripDialog({
  open,
  onOpenChange,
  trip,
  buggies,
  drivers,
  onAssign,
  isAssigning,
}: AssignTripDialogProps) {
  const [selectedBuggyId, setSelectedBuggyId] = useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  
  // Filter available buggies and online drivers
  const availableBuggies = buggies.filter(b => b.status === 'available');
  const onlineDrivers = drivers.filter(d => d.status === 'online');
  
  // Check if trip needs accessible buggy
  const needsAccessible = trip?.trip_requests.some(
    tr => tr.request && (tr.request as any).needs_accessible
  );
  
  const selectedBuggy = availableBuggies.find(b => b.id === selectedBuggyId);
  const selectedDriver = onlineDrivers.find(d => d.user_id === selectedDriverId);
  
  const handleAssign = () => {
    if (selectedBuggyId && selectedDriverId) {
      onAssign(selectedBuggyId, selectedDriverId);
    }
  };
  
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedBuggyId('');
      setSelectedDriverId('');
    }
    onOpenChange(newOpen);
  };
  
  // Validate assignment
  const capacityOk = selectedBuggy ? trip?.total_party_size! <= selectedBuggy.capacity : true;
  const accessibleOk = !needsAccessible || selectedBuggy?.is_accessible;
  const canAssign = selectedBuggyId && selectedDriverId && capacityOk && accessibleOk;
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Trip</DialogTitle>
          <DialogDescription>
            Select a buggy and driver to dispatch this trip.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Trip summary */}
          {trip && (
            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Requests</span>
                <span className="font-medium">{trip.request_count}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">Total passengers</span>
                <span className="font-medium">{trip.total_party_size}</span>
              </div>
              {needsAccessible && (
                <Badge variant="outline" className="mt-2 text-blue-600 border-blue-500/30">
                  <Accessibility className="h-3 w-3 mr-1" />
                  Accessible vehicle required
                </Badge>
              )}
            </div>
          )}
          
          {/* Buggy selection */}
          <div className="space-y-2">
            <Label>Buggy</Label>
            <Select value={selectedBuggyId} onValueChange={setSelectedBuggyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select buggy" />
              </SelectTrigger>
              <SelectContent>
                {availableBuggies.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No buggies available
                  </div>
                ) : (
                  availableBuggies.map((buggy) => (
                    <SelectItem key={buggy.id} value={buggy.id}>
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        <span>{buggy.name}</span>
                        <span className="text-muted-foreground">
                          ({buggy.capacity} seats)
                        </span>
                        {buggy.is_accessible && (
                          <Accessibility className="h-3.5 w-3.5 text-blue-500" />
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            
            {/* Validation messages */}
            {selectedBuggy && !capacityOk && (
              <p className="text-sm text-destructive">
                Buggy capacity ({selectedBuggy.capacity}) is less than party size ({trip?.total_party_size})
              </p>
            )}
            {selectedBuggy && !accessibleOk && (
              <p className="text-sm text-destructive">
                This trip requires an accessible vehicle
              </p>
            )}
          </div>
          
          {/* Driver selection */}
          <div className="space-y-2">
            <Label>Driver</Label>
            <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
              <SelectTrigger>
                <SelectValue placeholder="Select driver" />
              </SelectTrigger>
              <SelectContent>
                {onlineDrivers.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No drivers online
                  </div>
                ) : (
                  onlineDrivers.map((driver) => (
                    <SelectItem key={driver.user_id} value={driver.user_id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{driver.full_name || 'Driver'}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!canAssign || isAssigning}>
            {isAssigning ? 'Assigning...' : 'Assign & Dispatch'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
