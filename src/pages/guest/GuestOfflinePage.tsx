import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProperaMark } from '@/components/icons/ProperaLogo';

export default function GuestOfflinePage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-6">
        <WifiOff className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-bold text-foreground mb-2">You're offline</h1>
      <p className="text-sm text-muted-foreground mb-8 max-w-xs leading-relaxed">
        Some features are unavailable without a connection. Check your connection and try again.
      </p>
      <Button
        onClick={() => window.location.reload()}
        className="gap-2 rounded-xl min-h-[44px] px-6"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Try Again
      </Button>
      <div className="mt-12 opacity-30">
        <ProperaMark size={32} />
      </div>
    </div>
  );
}
