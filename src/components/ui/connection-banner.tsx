import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConnectionHealth } from '@/hooks/useConnectionHealth';
import { cn } from '@/lib/utils';

export function ConnectionBanner() {
  const { isOnline, isConnected, error, retry, retryCount } = useConnectionHealth();
  const [isRetrying, setIsRetrying] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  // Show banner when offline or disconnected
  useEffect(() => {
    if (!isOnline || !isConnected) {
      setShowBanner(true);
    } else {
      // Delay hiding to show success state briefly
      const timer = setTimeout(() => setShowBanner(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, isConnected]);

  const handleRetry = async () => {
    setIsRetrying(true);
    await retry();
    setIsRetrying(false);
  };

  if (!showBanner) return null;

  const isOffline = !isOnline;
  const hasConnectionError = isOnline && !isConnected;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-center gap-3 text-sm font-medium transition-all duration-300",
        isOffline && "bg-destructive text-destructive-foreground",
        hasConnectionError && "bg-warning text-warning-foreground",
        !isOffline && !hasConnectionError && "bg-green-500 text-white"
      )}
    >
      {isOffline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span>You're offline. Please check your internet connection.</span>
        </>
      ) : hasConnectionError ? (
        <>
          <AlertTriangle className="h-4 w-4" />
          <span>{error || 'Connection issue detected'}</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRetry}
            disabled={isRetrying}
            className="ml-2 h-7 px-3"
          >
            {isRetrying ? (
              <RefreshCw className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            {isRetrying ? 'Retrying...' : `Retry${retryCount > 0 ? ` (${retryCount})` : ''}`}
          </Button>
        </>
      ) : (
        <span>Connection restored</span>
      )}
    </div>
  );
}
