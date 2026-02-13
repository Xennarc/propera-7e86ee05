import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTransportSetupMutations } from '@/hooks/transport/useTransportSetupMutations';
import { Car } from 'lucide-react';

interface AddBuggyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resortId?: string;
}

export function AddBuggyDialog({ open, onOpenChange, resortId }: AddBuggyDialogProps) {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [isAccessible, setIsAccessible] = useState(false);

  const { addBuggy } = useTransportSetupMutations(resortId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !resortId) return;

    addBuggy.mutate(
      { name: name.trim(), capacity, isAccessible },
      {
        onSuccess: () => {
          setName('');
          setCapacity(4);
          setIsAccessible(false);
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            Add Buggy
          </DialogTitle>
          <DialogDescription>
            Add a new buggy to your fleet.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="buggy-name">Name</Label>
            <Input
              id="buggy-name"
              placeholder="e.g. Buggy 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="buggy-capacity">Capacity (seats)</Label>
            <Input
              id="buggy-capacity"
              type="number"
              min={1}
              max={20}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="buggy-accessible">Wheelchair Accessible</Label>
            <Switch
              id="buggy-accessible"
              checked={isAccessible}
              onCheckedChange={setIsAccessible}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || addBuggy.isPending}>
              {addBuggy.isPending ? 'Adding…' : 'Add Buggy'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
