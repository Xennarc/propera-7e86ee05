import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium">
      <WifiOff className="h-4 w-4" />
      <span>You're offline. Please check your internet connection.</span>
    </div>
  );
}
