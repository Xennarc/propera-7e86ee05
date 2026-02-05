import { useEffect, useState, useCallback } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { useDriverSession } from '@/hooks/transport/useDriverSession';
import { useBuggyLocation, useDriverPresence } from '@/hooks/transport/useBuggyLocation';
import { useTransportSettings } from '@/hooks/transport/useTransportSettings';
import { ProperaLoader } from '@/components/icons/ProperaLogo';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldX, WifiOff, Wifi, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DriverLocation {
  lat: number;
  lng: number;
}

export function DriverLayout() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { currentResort, loading: resortLoading } = useResort();
  const resortId = currentResort?.id;

  // Driver session check
  const { data: driverSession, isLoading: sessionLoading, error: sessionError } = useDriverSession(resortId);

  // Transport settings
  const { data: settings } = useTransportSettings(resortId);

  // Driver location state (exposed to child pages)
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);

  // GPS tracking
  const { updateLocation } = useBuggyLocation({
    buggyId: driverSession?.assigned_buggy_id || undefined,
    debounceMs: (settings?.gps_throttle_seconds ?? 5) * 1000,
    enabled: !!driverSession?.assigned_buggy_id && driverSession?.status !== 'offline',
  });

  // Presence heartbeat
  useDriverPresence({
    driverUserId: user?.id,
    resortId,
    enabled: !!driverSession && driverSession.status !== 'offline',
    intervalMs: (settings?.presence_interval_seconds ?? 30) * 1000,
  });

  // Network status
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // GPS tracking effect - now also updates local state for child pages
  useEffect(() => {
    if (!driverSession?.assigned_buggy_id || driverSession?.status === 'offline') {
      // Clear location when offline or no buggy
      setDriverLocation(null);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        // Update server
        updateLocation(newLocation);
        // Update local state for child pages
        setDriverLocation(newLocation);
      },
      (error) => {
        console.warn('Geolocation error:', error);
        // Keep last known location on error, don't clear
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [driverSession?.assigned_buggy_id, driverSession?.status, updateLocation]);

  // Loading
  if (authLoading || resortLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <ProperaLoader size={64} text="Loading..." />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/staff/auth" replace />;
  }

  if (sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <ProperaLoader size={64} text="Loading driver session..." />
      </div>
    );
  }

  // Not a driver
  if (!driverSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
              <ShieldX className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Driver Access Required</CardTitle>
            <CardDescription>
              You need to be registered as a driver to access this portal.
              Contact your manager to be added as a driver.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground text-center">
              Logged in as: <span className="font-medium">{user.email}</span>
            </p>
            <Button variant="outline" onClick={() => signOut()}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Connectivity indicator */}
      <div className={cn(
        "fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-1.5 px-4 text-xs font-medium transition-all",
        isOnline 
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
          : "bg-destructive/10 text-destructive"
      )}>
        {isOnline ? (
          <>
            <Wifi className="h-3 w-3" />
            <span>Connected</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            <span>Offline - Actions will sync when reconnected</span>
          </>
        )}
      </div>

      {/* Main content with top padding for connectivity bar */}
      <main className="flex-1 pt-8">
        <Outlet context={{ driverSession, settings, isOnline, driverLocation }} />
      </main>
    </div>
  );
}

// Type for outlet context
export interface DriverOutletContext {
  driverSession: ReturnType<typeof useDriverSession>['data'];
  settings: ReturnType<typeof useTransportSettings>['data'];
  isOnline: boolean;
  driverLocation: DriverLocation | null;
}
