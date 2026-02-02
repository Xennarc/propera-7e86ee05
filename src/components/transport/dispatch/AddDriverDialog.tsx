import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, Users } from 'lucide-react';
import { useEligibleDrivers } from '@/hooks/transport/useEligibleDrivers';
import { useTransportMutations } from '@/hooks/transport/useTransportMutations';

interface AddDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resortId: string | undefined;
}

const roleLabels: Record<string, string> = {
  RESORT_ADMIN: 'Admin',
  MANAGER: 'Manager',
  FRONT_OFFICE: 'Front Office',
  ACTIVITIES: 'Activities',
  F_AND_B: 'F&B',
  HOUSEKEEPING: 'Housekeeping',
  MAINTENANCE: 'Maintenance',
  TRANSPORT: 'Transport',
  SPA_WELLNESS: 'Spa',
};

export function AddDriverDialog({ open, onOpenChange, resortId }: AddDriverDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  
  const { data: eligibleDrivers = [], isLoading: loadingEligible } = useEligibleDrivers(resortId);
  const { registerDriver } = useTransportMutations(resortId);
  
  const selectedDriver = eligibleDrivers.find(d => d.user_id === selectedUserId);
  
  const handleSubmit = () => {
    if (!selectedUserId || !selectedDriver) return;
    
    registerDriver.mutate(
      { userId: selectedUserId, fullName: selectedDriver.full_name },
      {
        onSuccess: () => {
          setSelectedUserId('');
          onOpenChange(false);
        },
      }
    );
  };
  
  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedUserId('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Driver
          </DialogTitle>
          <DialogDescription>
            Register a staff member as a buggy driver. They will appear offline until they open the driver app.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {loadingEligible ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : eligibleDrivers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No eligible staff members</p>
              <p className="text-xs text-muted-foreground mt-1">
                All staff members are already registered as drivers
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Staff Member</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a staff member..." />
                </SelectTrigger>
                <SelectContent>
                  {eligibleDrivers.map((driver) => (
                    <SelectItem key={driver.user_id} value={driver.user_id}>
                      <div className="flex items-center gap-2">
                        <span>{driver.full_name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {roleLabels[driver.resort_role] || driver.resort_role}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedUserId || registerDriver.isPending}
          >
            {registerDriver.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Add Driver
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
