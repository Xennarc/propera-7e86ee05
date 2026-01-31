import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { toast } from 'sonner';

interface LocationUpdate {
  lat: number;
  lng: number;
}

interface UseBuggyLocationOptions {
  buggyId: string | undefined;
  /** Debounce interval in ms (default 5000 = 5s) */
  debounceMs?: number;
  /** Whether updates are enabled */
  enabled?: boolean;
}

/**
 * Hook for updating buggy location with debouncing.
 * Only staff/driver roles can update location under RLS.
 */
export function useBuggyLocation({
  buggyId,
  debounceMs = 5000,
  enabled = true,
}: UseBuggyLocationOptions) {
  const lastLocationRef = useRef<LocationUpdate | null>(null);
  const pendingUpdateRef = useRef<LocationUpdate | null>(null);

  // Actual update function
  const performUpdate = useCallback(async (location: LocationUpdate) => {
    if (!buggyId) return;

    try {
      const { error } = await supabase
        .from('buggies')
        .update({
          last_location: { lat: location.lat, lng: location.lng } as Record<string, number>,
          last_location_at: new Date().toISOString(),
        })
        .eq('id', buggyId);

      if (error) {
        console.error('[BuggyLocation] Update failed:', error);
      } else {
        lastLocationRef.current = location;
      }
    } catch (err) {
      console.error('[BuggyLocation] Update error:', err);
    }
  }, [buggyId]);

  // Debounced update
  const debouncedUpdate = useDebouncedCallback((location: LocationUpdate) => {
    performUpdate(location);
  }, debounceMs);

  // Public update function
  const updateLocation = useCallback((location: LocationUpdate) => {
    if (!enabled || !buggyId) return;

    // Skip if location hasn't changed significantly (within ~10m)
    if (lastLocationRef.current) {
      const latDiff = Math.abs(location.lat - lastLocationRef.current.lat);
      const lngDiff = Math.abs(location.lng - lastLocationRef.current.lng);
      // ~0.0001 degrees ≈ 11 meters
      if (latDiff < 0.0001 && lngDiff < 0.0001) {
        return;
      }
    }

    pendingUpdateRef.current = location;
    debouncedUpdate(location);
  }, [enabled, buggyId, debouncedUpdate]);

  // Cleanup: flush pending update on unmount
  useEffect(() => {
    return () => {
      if (pendingUpdateRef.current && buggyId) {
        // Fire immediately on unmount
        performUpdate(pendingUpdateRef.current);
      }
    };
  }, [buggyId, performUpdate]);

  return { updateLocation };
}

/**
 * Standalone function to update buggy location (for use outside React)
 */
export async function updateBuggyLocationDirect(
  buggyId: string,
  location: LocationUpdate
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('buggies')
      .update({
        last_location: { lat: location.lat, lng: location.lng } as Record<string, number>,
        last_location_at: new Date().toISOString(),
      })
      .eq('id', buggyId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Hook for updating driver's last_seen_at (presence simulation)
 */
export function useDriverPresence({
  driverUserId,
  resortId,
  enabled = true,
  intervalMs = 30000, // 30 seconds
}: {
  driverUserId: string | undefined;
  resortId: string | undefined;
  enabled?: boolean;
  intervalMs?: number;
}) {
  useEffect(() => {
    if (!enabled || !driverUserId || !resortId) return;

    // Update immediately on mount
    const updatePresence = async () => {
      try {
        const { error } = await supabase
          .from('buggy_drivers')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('user_id', driverUserId)
          .eq('resort_id', resortId);

        if (error) {
          console.error('[DriverPresence] Update failed:', error);
        }
      } catch (err) {
        console.error('[DriverPresence] Update error:', err);
      }
    };

    updatePresence();

    // Set up interval
    const interval = setInterval(updatePresence, intervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [driverUserId, resortId, enabled, intervalMs]);
}
