import { useState } from 'react';
import { toast } from 'sonner';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { useServiceRequestMutations } from '@/hooks/useServiceRequests';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Send, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RequestQuickSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestQuickSheet({ open, onOpenChange }: RequestQuickSheetProps) {
  const { guest } = useGuestAuth();
  const [requestText, setRequestText] = useState('');
  const [isAsap, setIsAsap] = useState(true);

  const { createRequest, isCreating } = useServiceRequestMutations(
    guest?.guestId || '',
    guest?.resortId || ''
  );

  const handleSubmit = async () => {
    if (!guest || !requestText.trim()) return;

    try {
      await createRequest({
        guestId: guest.guestId,
        resortId: guest.resortId,
        title: requestText.trim(),
        isAsap,
        departmentKey: 'FRONT_OFFICE', // Default to front office for quick requests
      });

      setRequestText('');
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const canSubmit = requestText.trim().length > 0 && !isCreating;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>How can we help?</DrawerTitle>
          <DrawerDescription>
            Describe what you need and our team will take care of it
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 py-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="request-text">Your Request</Label>
            <Textarea
              id="request-text"
              placeholder="e.g., Extra towels, room service, wake-up call..."
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              rows={4}
              className="resize-none"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Be as specific as possible so we can assist you better
            </p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">As Soon As Possible</p>
                <p className="text-xs text-muted-foreground">
                  {isAsap ? "We'll get to this right away" : 'Standard timing'}
                </p>
              </div>
            </div>
            <Switch
              checked={isAsap}
              onCheckedChange={setIsAsap}
            />
          </div>
        </div>

        <DrawerFooter className="pt-4">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Request
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
