import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Car, User, CheckCircle2, RefreshCw } from 'lucide-react';
import type { BuggyRow } from '@/hooks/transport/useBuggies';
import type { DriverRow } from '@/hooks/transport/useBuggyDrivers';

interface QuickReassignProps {
  currentBuggyId: string | null;
  currentDriverId: string | null;
  buggies: BuggyRow[];
  drivers: DriverRow[];
  onReassign: (buggyId: string, driverId: string) => void;
  isReassigning: boolean;
}

export function QuickReassign({
  currentBuggyId,
  currentDriverId,
  buggies,
  drivers,
  onReassign,
  isReassigning,
}: QuickReassignProps) {
  const [open, setOpen] = useState(false);
  const [selectedBuggy, setSelectedBuggy] = useState(currentBuggyId || '');
  const [selectedDriver, setSelectedDriver] = useState(currentDriverId || '');
  
  const availableBuggies = buggies.filter(b => b.status === 'available' || b.id === currentBuggyId);
  const availableDrivers = drivers.filter(d => d.status === 'online' || d.user_id === currentDriverId);
  
  const hasChanges = selectedBuggy !== currentBuggyId || selectedDriver !== currentDriverId;
  
  const handleConfirm = () => {
    if (selectedBuggy && selectedDriver) {
      onReassign(selectedBuggy, selectedDriver);
      setOpen(false);
    }
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-muted-foreground">
          <RefreshCw className="h-3.5 w-3.5" />
          Reassign
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <Car className="h-3.5 w-3.5" />
              Buggy
            </label>
            <Select value={selectedBuggy} onValueChange={setSelectedBuggy}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select buggy" />
              </SelectTrigger>
              <SelectContent>
                {availableBuggies.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} ({b.capacity} seats)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <User className="h-3.5 w-3.5" />
              Driver
            </label>
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select driver" />
              </SelectTrigger>
              <SelectContent>
                {availableDrivers.map((d) => (
                  <SelectItem key={d.user_id} value={d.user_id}>
                    {d.full_name || `Driver (${d.user_id.slice(0, 8)}...)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            size="sm" 
            className="w-full"
            disabled={!hasChanges || !selectedBuggy || !selectedDriver || isReassigning}
            onClick={handleConfirm}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            {isReassigning ? 'Reassigning...' : 'Confirm Reassign'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
