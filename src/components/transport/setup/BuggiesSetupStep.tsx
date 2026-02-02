import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Car, 
  Plus, 
  Trash2, 
  Loader2,
  CheckCircle2,
  Accessibility,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBuggies } from '@/hooks/transport/useBuggies';
import { useTransportSetupMutations } from '@/hooks/transport/useTransportSetupMutations';

interface BuggiesSetupStepProps {
  resortId: string | undefined;
}

export function BuggiesSetupStep({ resortId }: BuggiesSetupStepProps) {
  const [newName, setNewName] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');
  const [newAccessible, setNewAccessible] = useState(false);
  
  const { data: allBuggies = [], isLoading } = useBuggies(resortId);
  // Filter out out_of_service buggies for display
  const buggies = allBuggies.filter(b => b.status !== 'out_of_service');
  
  const mutations = useTransportSetupMutations(resortId);
  
  const handleAddBuggy = () => {
    if (!newName.trim()) return;
    
    const capacity = parseInt(newCapacity, 10) || 4;
    
    mutations.addBuggy.mutate(
      { name: newName.trim(), capacity, isAccessible: newAccessible },
      {
        onSuccess: () => {
          setNewName('');
          setNewCapacity('4');
          setNewAccessible(false);
        },
      }
    );
  };
  
  const handleDeleteBuggy = (id: string) => {
    mutations.deleteBuggy.mutate({ id });
  };
  
  const meetsMinimum = buggies.length >= 1;
  const totalCapacity = buggies.reduce((sum, b) => sum + b.capacity, 0);
  const accessibleCount = buggies.filter(b => b.is_accessible).length;
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10 mb-3">
          <Car className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Add Your Fleet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Register the buggies/carts available for transport
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
            <span>{buggies.length} {buggies.length === 1 ? 'buggy' : 'buggies'} registered</span>
          </>
        ) : (
          <>
            <Car className="h-4 w-4" />
            <span>Add at least 1 buggy to continue</span>
          </>
        )}
      </div>
      
      {/* Add form */}
      <div className="space-y-3 mb-4 p-4 rounded-lg border bg-muted/30">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="buggyName" className="text-xs text-muted-foreground mb-1 block">Name</Label>
            <Input
              id="buggyName"
              placeholder="e.g., Buggy 1"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddBuggy()}
            />
          </div>
          <div className="w-20">
            <Label htmlFor="buggyCapacity" className="text-xs text-muted-foreground mb-1 block">Seats</Label>
            <Input
              id="buggyCapacity"
              type="number"
              min="1"
              max="20"
              value={newCapacity}
              onChange={(e) => setNewCapacity(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddBuggy()}
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="accessible"
              checked={newAccessible}
              onCheckedChange={setNewAccessible}
            />
            <Label htmlFor="accessible" className="text-sm flex items-center gap-1.5 cursor-pointer">
              <Accessibility className="h-4 w-4 text-blue-600" />
              Wheelchair accessible
            </Label>
          </div>
          
          <Button
            onClick={handleAddBuggy}
            disabled={!newName.trim() || mutations.addBuggy.isPending}
            size="sm"
          >
            {mutations.addBuggy.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add Buggy
          </Button>
        </div>
      </div>
      
      {/* Buggies list */}
      <ScrollArea className="flex-1 -mx-1 px-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : buggies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
              <Car className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No buggies yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add your first buggy above
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {buggies.map((buggy) => (
              <BuggyCard
                key={buggy.id}
                buggy={buggy}
                onDelete={() => handleDeleteBuggy(buggy.id)}
                isDeleting={mutations.deleteBuggy.isPending}
              />
            ))}
          </div>
        )}
      </ScrollArea>
      
      {/* Summary */}
      {buggies.length > 0 && (
        <div className="pt-4 mt-4 border-t">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Total capacity: {totalCapacity} seats</span>
            </div>
            {accessibleCount > 0 && (
              <div className="flex items-center gap-1.5 text-blue-600">
                <Accessibility className="h-4 w-4" />
                <span>{accessibleCount} accessible</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BuggyCard({
  buggy,
  onDelete,
  isDeleting,
}: {
  buggy: { id: string; name: string; capacity: number; is_accessible: boolean };
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card group">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Car className="h-5 w-5 text-primary" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{buggy.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {buggy.capacity} seats
          </span>
          {buggy.is_accessible && (
            <span className="flex items-center gap-1 text-blue-600">
              <Accessibility className="h-3 w-3" />
              Accessible
            </span>
          )}
        </div>
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
