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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Link2, Info } from 'lucide-react';

interface LinkRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLink: (data: {
    roomNumber: string;
    lastName: string;
    pin: string;
  }) => Promise<{ success: boolean; error?: string }>;
  isLoading?: boolean;
}

export function LinkRoomDialog({
  open,
  onOpenChange,
  onLink,
  isLoading,
}: LinkRoomDialogProps) {
  const [roomNumber, setRoomNumber] = useState('');
  const [lastName, setLastName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!roomNumber.trim()) {
      setError('Please enter a room number');
      return;
    }
    if (!lastName.trim()) {
      setError('Please enter the last name');
      return;
    }
    if (!pin.trim()) {
      setError('Please enter the PIN');
      return;
    }

    try {
      const result = await onLink({
        roomNumber: roomNumber.trim(),
        lastName: lastName.trim(),
        pin: pin.trim(),
      });
      
      if (result.success) {
        // Reset form
        setRoomNumber('');
        setLastName('');
        setPin('');
        onOpenChange(false);
      } else {
        setError(result.error || 'Could not link room. Please check the details.');
      }
    } catch (err) {
      setError('Failed to link room. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Link Another Room
            </DialogTitle>
            <DialogDescription>
              Connect another room to your travel party so you can book activities together.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="bg-muted/50 border-muted">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                You'll need the room number, guest's last name, and their portal PIN to link rooms.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="room">Room Number</Label>
              <Input
                id="room"
                placeholder="e.g., 102"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Guest's Last Name</Label>
              <Input
                id="lastName"
                placeholder="e.g., Smith"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pin">Guest's Portal PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                placeholder="Enter PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={6}
              />
              <p className="text-xs text-muted-foreground">
                The other guest can find their PIN in their profile settings.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Link Room
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
