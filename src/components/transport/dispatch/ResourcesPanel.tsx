import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Car, 
  User, 
  Accessibility, 
  CircleDot,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddDriverDialog } from './AddDriverDialog';
import type { BuggyRow } from '@/hooks/transport/useBuggies';
import type { DriverRow } from '@/hooks/transport/useBuggyDrivers';

interface ResourcesPanelProps {
  buggies: BuggyRow[];
  drivers: DriverRow[];
  isLoading: boolean;
  resortId?: string;
  canManageDrivers?: boolean;
}

const buggyStatusConfig: Record<string, { label: string; className: string }> = {
  available: { label: 'Available', className: 'bg-green-500' },
  in_use: { label: 'In Use', className: 'bg-amber-500' },
  on_trip: { label: 'On Trip', className: 'bg-blue-500' },
  maintenance: { label: 'Maintenance', className: 'bg-red-500' },
  offline: { label: 'Offline', className: 'bg-muted-foreground' },
};

const driverStatusConfig: Record<string, { label: string; className: string }> = {
  online: { label: 'Online', className: 'bg-green-500' },
  on_trip: { label: 'On Trip', className: 'bg-blue-500' },
  break: { label: 'On Break', className: 'bg-amber-500' },
  offline: { label: 'Offline', className: 'bg-muted-foreground' },
};

export function ResourcesPanel({ buggies, drivers, isLoading, resortId, canManageDrivers = true }: ResourcesPanelProps) {
  const [showAddDriver, setShowAddDriver] = useState(false);
  
  const availableBuggies = buggies.filter(b => b.status === 'available');
  const availableDrivers = drivers.filter(d => d.status === 'online');
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-1">Resources</h2>
        <p className="text-xs text-muted-foreground">
          {availableBuggies.length} buggies, {availableDrivers.length} drivers available
        </p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Buggies section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Car className="h-4 w-4 text-muted-foreground" />
                Buggies
              </h3>
              <Badge variant="secondary" className="h-5 text-xs">
                {buggies.length}
              </Badge>
            </div>
            
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : buggies.length === 0 ? (
              <EmptyState icon={Car} text="No buggies configured" />
            ) : (
              <div className="space-y-2">
                {buggies.map((buggy) => (
                  <BuggyCard key={buggy.id} buggy={buggy} />
                ))}
              </div>
            )}
          </div>
          
          {/* Drivers section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Drivers
              </h3>
              <div className="flex items-center gap-2">
                {canManageDrivers && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowAddDriver(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
                <Badge variant="secondary" className="h-5 text-xs">
                  {drivers.length}
                </Badge>
              </div>
            </div>
            
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : drivers.length === 0 ? (
              <EmptyState icon={User} text="No drivers on shift" />
            ) : (
              <div className="space-y-2">
                {drivers.map((driver) => (
                  <DriverCard key={driver.id} driver={driver} />
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
      
      {/* Add Driver Dialog */}
      <AddDriverDialog
        open={showAddDriver}
        onOpenChange={setShowAddDriver}
        resortId={resortId}
      />
    </div>
  );
}

function BuggyCard({ buggy }: { buggy: BuggyRow }) {
  const status = buggyStatusConfig[buggy.status] || buggyStatusConfig.offline;
  
  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-medium text-sm">{buggy.name}</span>
        <div className="flex items-center gap-1.5">
          <div className={cn('h-2 w-2 rounded-full', status.className)} />
          <span className="text-xs text-muted-foreground">{status.label}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <User className="h-3 w-3" />
          {buggy.capacity} seats
        </span>
        {buggy.is_accessible && (
          <span className="flex items-center gap-1 text-blue-600">
            <Accessibility className="h-3 w-3" />
            Accessible
          </span>
        )}
        {buggy.current_stop && (
          <span className="flex items-center gap-1">
            <CircleDot className="h-3 w-3" />
            {buggy.current_stop.name}
          </span>
        )}
      </div>
    </div>
  );
}

function DriverCard({ driver }: { driver: DriverRow }) {
  const status = driverStatusConfig[driver.status] || driverStatusConfig.offline;
  
  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <span className="font-medium text-sm block">
              {driver.full_name || `Driver (${driver.user_id.slice(0, 8)}...)`}
            </span>
            {driver.assigned_buggy?.name && (
              <span className="text-xs text-muted-foreground">
                On {driver.assigned_buggy.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={cn('h-2 w-2 rounded-full', status.className)} />
          <span className="text-xs text-muted-foreground">{status.label}</span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-2">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}
