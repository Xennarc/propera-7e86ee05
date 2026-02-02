import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Plus, 
  Trash2, 
  GripVertical,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuickAddStops } from './QuickAddStops';
import { useTransportStops } from '@/hooks/transport/useTransportStops';
import { useTransportSetupMutations } from '@/hooks/transport/useTransportSetupMutations';
import type { BuggyStop } from '@/types/database';

interface StopsSetupStepProps {
  resortId: string | undefined;
}

export function StopsSetupStep({ resortId }: StopsSetupStepProps) {
  const [newStopName, setNewStopName] = useState('');
  const [newStopZone, setNewStopZone] = useState('');
  
  const { data: stops = [], isLoading } = useTransportStops(resortId);
  const mutations = useTransportSetupMutations(resortId);
  
  const handleAddStop = () => {
    if (!newStopName.trim()) return;
    
    mutations.addStop.mutate(
      { name: newStopName.trim(), zone: newStopZone.trim() || undefined },
      {
        onSuccess: () => {
          setNewStopName('');
          setNewStopZone('');
        },
      }
    );
  };
  
  const handleQuickAdd = (stop: { name: string; zone?: string }) => {
    mutations.addStop.mutate({ name: stop.name, zone: stop.zone });
  };
  
  const handleDeleteStop = (id: string) => {
    mutations.deleteStop.mutate({ id });
  };
  
  const meetsMinimum = stops.length >= 2;
  const uniqueZones = [...new Set(stops.map(s => s.zone).filter(Boolean))];
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10 mb-3">
          <MapPin className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Define Pickup & Dropoff Locations</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Add the key locations where guests can request buggy pickups
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
            <span>{stops.length} stops configured</span>
          </>
        ) : (
          <>
            <MapPin className="h-4 w-4" />
            <span>Add at least 2 stops to continue ({stops.length}/2)</span>
          </>
        )}
      </div>
      
      {/* Add form */}
      <div className="space-y-3 mb-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="stopName" className="sr-only">Stop Name</Label>
            <Input
              id="stopName"
              placeholder="Stop name (e.g., Reception)"
              value={newStopName}
              onChange={(e) => setNewStopName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddStop()}
            />
          </div>
          <div className="w-32">
            <Label htmlFor="stopZone" className="sr-only">Zone</Label>
            <Input
              id="stopZone"
              placeholder="Zone"
              value={newStopZone}
              onChange={(e) => setNewStopZone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddStop()}
            />
          </div>
          <Button
            onClick={handleAddStop}
            disabled={!newStopName.trim() || mutations.addStop.isPending}
          >
            {mutations.addStop.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Quick add */}
        <QuickAddStops
          existingStopNames={stops.map(s => s.name)}
          onAdd={handleQuickAdd}
          disabled={mutations.addStop.isPending}
        />
      </div>
      
      {/* Stops list */}
      <ScrollArea className="flex-1 -mx-1 px-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : stops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
              <MapPin className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No stops yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add your first pickup location above
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {stops.map((stop, index) => (
              <StopCard
                key={stop.id}
                stop={stop}
                index={index}
                onDelete={() => handleDeleteStop(stop.id)}
                isDeleting={mutations.deleteStop.isPending}
              />
            ))}
          </div>
        )}
      </ScrollArea>
      
      {/* Summary */}
      {stops.length > 0 && (
        <div className="pt-4 mt-4 border-t">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Zones:</span>
            {uniqueZones.length > 0 ? (
              uniqueZones.map(zone => (
                <Badge key={zone} variant="secondary" className="text-xs">
                  {zone}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground italic">No zones assigned</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StopCard({
  stop,
  index,
  onDelete,
  isDeleting,
}: {
  stop: BuggyStop;
  index: number;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card group">
      <div className="flex items-center gap-2 text-muted-foreground">
        <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
        <span className="text-xs font-medium w-5">{index + 1}</span>
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{stop.name}</p>
        {stop.zone && (
          <p className="text-xs text-muted-foreground">{stop.zone}</p>
        )}
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
        onClick={onDelete}
        disabled={isDeleting}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
