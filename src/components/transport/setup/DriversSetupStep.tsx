import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  User, 
  Plus, 
  Trash2, 
  Loader2,
  CheckCircle2,
  UserPlus,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBuggyDrivers } from '@/hooks/transport/useBuggyDrivers';
import { useEligibleDrivers } from '@/hooks/transport/useEligibleDrivers';
import { useTransportMutations } from '@/hooks/transport/useTransportMutations';

interface DriversSetupStepProps {
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

export function DriversSetupStep({ resortId }: DriversSetupStepProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  
  const { data: drivers = [], isLoading: driversLoading } = useBuggyDrivers(resortId);
  const { data: eligibleDrivers = [], isLoading: eligibleLoading } = useEligibleDrivers(resortId);
  const { registerDriver } = useTransportMutations(resortId);
  
  const selectedDriver = eligibleDrivers.find(d => d.user_id === selectedUserId);
  
  const handleAddDriver = () => {
    if (!selectedUserId || !selectedDriver) return;
    
    registerDriver.mutate(
      { userId: selectedUserId, fullName: selectedDriver.full_name },
      {
        onSuccess: () => {
          setSelectedUserId('');
        },
      }
    );
  };
  
  const meetsMinimum = drivers.length >= 1;
  const isLoading = driversLoading || eligibleLoading;
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10 mb-3">
          <UserPlus className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Assign Drivers</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Link staff members who will operate the buggies
        </p>
      </div>
      
      {/* Status indicator */}
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg mb-4 text-sm',
        meetsMinimum 
          ? 'bg-green-500/10 text-green-700 dark:text-green-400'
          : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
      )}>
        {meetsMinimum ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            <span>{drivers.length} {drivers.length === 1 ? 'driver' : 'drivers'} registered</span>
          </>
        ) : (
          <>
            <User className="h-4 w-4" />
            <span>Add at least 1 driver to continue</span>
          </>
        )}
      </div>
      
      {/* Add form */}
      {eligibleDrivers.length > 0 && (
        <div className="flex gap-2 mb-4">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a staff member..." />
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
          
          <Button
            onClick={handleAddDriver}
            disabled={!selectedUserId || registerDriver.isPending}
          >
            {registerDriver.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
      
      {/* Drivers list */}
      <ScrollArea className="flex-1 -mx-1 px-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : drivers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No drivers yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              {eligibleDrivers.length > 0
                ? 'Select a staff member above to register them as a driver'
                : 'All staff members are already registered as drivers'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {drivers.map((driver) => (
              <DriverCard key={driver.id} driver={driver} />
            ))}
          </div>
        )}
      </ScrollArea>
      
      {/* Info note */}
      <div className="pt-4 mt-4 border-t">
        <p className="text-xs text-muted-foreground">
          💡 Drivers will appear offline until they log into the driver app and go on shift.
        </p>
      </div>
    </div>
  );
}

function DriverCard({
  driver,
}: {
  driver: { id: string; full_name: string | null; status: string };
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
        <User className="h-5 w-5 text-primary" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">
          {driver.full_name || 'Unknown Driver'}
        </p>
        <p className="text-xs text-muted-foreground capitalize">
          {driver.status}
        </p>
      </div>
      
      <Badge variant="secondary" className="text-xs">
        Registered
      </Badge>
    </div>
  );
}
