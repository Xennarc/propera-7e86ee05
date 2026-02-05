import { WifiOff, MapPinOff, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DriverStatusBannerProps {
  isOnline: boolean;
  hasGPS: boolean;
  className?: string;
}

/**
 * Contextual banners for offline state and GPS denied.
 * Non-blocking, dismissible for GPS warning.
 */
export function DriverStatusBanner({ isOnline, hasGPS, className }: DriverStatusBannerProps) {
  const [gpsDismissed, setGpsDismissed] = useState(false);

  // Offline banner takes priority
  if (!isOnline) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-lg",
        "bg-destructive/10 border border-destructive/30",
        "text-destructive text-sm",
        className
      )}>
        <WifiOff className="h-4 w-4 shrink-0" />
        <span className="flex-1">Offline — actions will fail until reconnected.</span>
      </div>
    );
  }

  // GPS warning (dismissible)
  if (!hasGPS && !gpsDismissed) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-lg",
        "bg-amber-500/10 border border-amber-500/30",
        "text-amber-700 dark:text-amber-400 text-sm",
        className
      )}>
        <MapPinOff className="h-4 w-4 shrink-0" />
        <span className="flex-1">Enable location for distance estimates</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
          onClick={() => setGpsDismissed(true)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return null;
}
