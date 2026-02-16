import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
import { useGuestPushNotifications } from '@/hooks/useGuestPushNotifications';
import { toast } from 'sonner';

const DISMISSED_KEY = 'propera_push_dismissed';

interface GuestPushOptInProps {
  guestId: string;
  resortId: string;
  hasBookings: boolean;
}

export function GuestPushOptIn({ guestId, resortId, hasBookings }: GuestPushOptInProps) {
  const { isSupported, isFlagEnabled, permission, isSubscribed, requestPermission } =
    useGuestPushNotifications(guestId, resortId);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === '1');
  const [loading, setLoading] = useState(false);

  // Don't show if: flag off, unsupported, already subscribed, already asked, dismissed, no bookings
  if (
    !isFlagEnabled ||
    !isSupported ||
    isSubscribed ||
    permission !== 'default' ||
    dismissed ||
    !hasBookings
  ) {
    return null;
  }

  const handleEnable = async () => {
    setLoading(true);
    const success = await requestPermission();
    setLoading(false);
    if (success) {
      toast.success('Notifications enabled!');
    } else {
      toast.error('Could not enable notifications');
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  return (
    <Card className="guest-card border-primary/15 bg-gradient-to-br from-primary/[0.05] to-transparent">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground mb-0.5">
              Get notified about your bookings
            </h3>
            <p className="text-xs text-muted-foreground">
              Receive updates on confirmations, reminders, and changes.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground p-1 -mt-1 -mr-1"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            className="flex-1"
            onClick={handleEnable}
            disabled={loading}
          >
            {loading ? 'Enabling...' : 'Enable'}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDismiss}>
            Not now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
