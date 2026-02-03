import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useUnifiedGuestRealtime } from '@/hooks/sync/useUnifiedGuestRealtime';

interface GuestRealtimeContextValue {
  /** Whether the unified realtime subscription is active */
  unifiedActive: boolean;
  /** The guest ID for the current session */
  guestId: string | null;
  /** The resort ID for the current session */
  resortId: string | null;
  // Diagnostics for debug badge
  /** The channel name for the unified subscription */
  channelName: string | null;
  /** The most recent event received */
  lastEvent: { table: string; timestamp: Date } | null;
  /** Event counts per table in this session */
  eventCounts: Record<string, number>;
}

const GuestRealtimeContext = createContext<GuestRealtimeContextValue | null>(null);

interface GuestRealtimeProviderProps {
  guestId: string;
  resortId: string;
  enabled?: boolean;
  children: ReactNode;
}

/**
 * Provider that manages a single unified realtime subscription for the guest portal.
 * Wrap the guest layout with this provider to enable consolidated realtime updates.
 */
export function GuestRealtimeProvider({
  guestId,
  resortId,
  enabled = true,
  children,
}: GuestRealtimeProviderProps) {
  // Initialize the unified realtime subscription
  const { isActive, channelName, lastEvent, eventCounts } = useUnifiedGuestRealtime({
    guestId,
    resortId,
    enabled,
  });

  // Stable context value to prevent unnecessary re-renders
  const contextValue = useMemo<GuestRealtimeContextValue>(
    () => ({
      unifiedActive: isActive,
      guestId: guestId || null,
      resortId: resortId || null,
      channelName,
      lastEvent,
      eventCounts,
    }),
    [isActive, guestId, resortId, channelName, lastEvent, eventCounts]
  );

  return (
    <GuestRealtimeContext.Provider value={contextValue}>
      {children}
    </GuestRealtimeContext.Provider>
  );
}

/**
 * Hook to access the guest realtime context.
 * Returns null if used outside of GuestRealtimeProvider.
 * 
 * Use this in individual sync hooks to detect if unified realtime is active
 * and skip creating duplicate subscriptions.
 */
export function useGuestRealtimeContext(): GuestRealtimeContextValue | null {
  return useContext(GuestRealtimeContext);
}

/**
 * Helper hook that returns whether unified realtime is active.
 * Safe to use outside of provider context (returns false).
 */
export function useIsUnifiedRealtimeActive(): boolean {
  const context = useContext(GuestRealtimeContext);
  return context?.unifiedActive ?? false;
}
