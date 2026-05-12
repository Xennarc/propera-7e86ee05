import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Copy, Key, User, Home, Calendar, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { safeFormatDate } from '@/lib/safe-date-format';

interface GuestCreatedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: {
    id: string;
    full_name: string;
    room_number: string;
    check_in_date: string;
    check_out_date: string;
  };
  pin?: string;
  resortCode?: string;
}

export function GuestCreatedModal({
  open,
  onOpenChange,
  guest,
  pin,
  resortCode,
}: GuestCreatedModalProps) {
  const { toast } = useToast();
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const lastName = guest.full_name.split(' ').pop() || guest.full_name;

  const copyPin = async () => {
    if (!pin) return;
    try {
      await navigator.clipboard.writeText(pin);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
      toast({ title: 'PIN copied to clipboard' });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to copy' });
    }
  };

  const copyAllCredentials = async () => {
    const credentials = [
      `Guest: ${guest.full_name}`,
      `Room: ${guest.room_number}`,
      `Last Name: ${lastName}`,
      pin ? `PIN: ${pin}` : '',
      `Stay: ${safeFormatDate(guest.check_in_date, 'MMM d')} - ${safeFormatDate(guest.check_out_date, 'MMM d, yyyy')}`,
      resortCode ? `\nLogin: ${window.location.origin}/resort/${resortCode}/guest/login` : '',
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(credentials);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
      toast({ title: 'Credentials copied to clipboard' });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to copy' });
    }
  };

  const openGuestLogin = () => {
    if (resortCode) {
      window.open(`/resort/${encodeURIComponent(resortCode)}/guest/login?roomNumber=${encodeURIComponent(guest.room_number || '')}&lastName=${encodeURIComponent(lastName)}`, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-success">
            <Check className="h-5 w-5" />
            Guest Created Successfully
          </DialogTitle>
          <DialogDescription>
            Share these login details with {guest.full_name} so they can access the guest portal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Guest Details */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{guest.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  Last name for login: <span className="font-mono font-medium">{lastName}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Room</p>
                  <p className="font-mono font-semibold">{guest.room_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Stay</p>
                  <p className="text-sm font-medium">
                    {safeFormatDate(guest.check_in_date, 'MMM d')} - {safeFormatDate(guest.check_out_date, 'MMM d')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* PIN Display */}
          {pin && (
            <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Guest Portal PIN</span>
                </div>
                <Badge variant="outline" className="text-xs">One-time display</Badge>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-4xl font-mono font-bold tracking-widest text-primary">
                  {pin}
                </p>
                <Button
                  variant={copiedPin ? 'outline' : 'default'}
                  size="sm"
                  onClick={copyPin}
                  className="shrink-0"
                >
                  {copiedPin ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy PIN
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                This PIN will only be shown once. Make sure to share it with the guest now.
              </p>
            </div>
          )}

          {/* Warning if no PIN */}
          {!pin && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Note:</strong> No PIN was generated. You can generate one from the guest's detail page.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={copyAllCredentials}
            >
              {copiedAll ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All Details
                </>
              )}
            </Button>
            {resortCode && (
              <Button
                variant="outline"
                onClick={openGuestLogin}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Test Login
              </Button>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
