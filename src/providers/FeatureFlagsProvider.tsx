/**
 * Feature Flags Provider
 * 
 * Provides app-wide access to feature flag state with effective resolution.
 * Wrap each portal (Staff, Guest, etc.) with this provider passing the resortId.
 * 
 * For Guest Portal: Pass guestId to use the RLS-safe RPC fetch.
 * For Staff Portal: Uses direct table queries (RLS handles access).
 * 
 * Usage:
 *   <FeatureFlagsProvider resortId={currentResort?.id}>
 *     <App />
 *   </FeatureFlagsProvider>
 * 
 *   // Guest Portal with guest auth:
 *   <FeatureFlagsProvider resortId={guest?.resortId} guestId={guest?.guestId}>
 *     <GuestApp />
 *   </FeatureFlagsProvider>
 * 
 *   // In any child component:
 *   const { isEnabledEffective } = useFeatureFlagAccess();
 *   if (isEnabledEffective('enable_transport')) { ... }
 */

import React, { createContext, useContext, useMemo } from 'react';
import { 
  useResolvedFeatureFlags, 
  type FeatureFlag,
} from '@/hooks/useFeatureFlags';
import { useResolvedGuestFeatureFlags } from '@/hooks/useGuestFeatureFlags';

interface FeatureFlagsContextValue {
  /** Whether flags are still loading */
  loading: boolean;
  /** Quick lookup map: key → is_enabled (effective after parent resolution) */
  flagsMap: Record<string, boolean>;
  /** Check if a flag is effectively enabled (respects parent module deps) */
  isEnabledEffective: (key: string) => boolean;
  /** Raw flags array for advanced use cases */
  rawFlags: FeatureFlag[] | Array<{ key: string; is_enabled: boolean; label: string; category: string }>;
  /** The resort ID used for this context (undefined = global) */
  resortId: string | undefined;
  /** Whether this is a guest context */
  isGuestContext: boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

interface FeatureFlagsProviderProps {
  children: React.ReactNode;
  /** Resort ID for resort-scoped flag resolution. Omit for global-only. */
  resortId?: string;
  /** Guest ID for guest portal access (uses RPC-based fetch for RLS safety). */
  guestId?: string;
}

export function FeatureFlagsProvider({ children, resortId, guestId }: FeatureFlagsProviderProps) {
  // Determine if this is a guest context (uses RPC) or staff context (uses direct queries)
  const isGuestContext = !!guestId;
  
  // Use the appropriate hook based on context
  const staffFlags = useResolvedFeatureFlags(isGuestContext ? undefined : resortId);
  const guestFlags = useResolvedGuestFeatureFlags(
    isGuestContext ? resortId : undefined, 
    isGuestContext ? guestId : undefined
  );
  
  // Select the active result based on context
  const activeFlags = isGuestContext ? guestFlags : staffFlags;

  const contextValue = useMemo<FeatureFlagsContextValue>(() => ({
    loading: activeFlags.isLoading,
    flagsMap: activeFlags.flagsMap,
    isEnabledEffective: activeFlags.isEnabled,
    rawFlags: activeFlags.flags,
    resortId,
    isGuestContext,
  }), [activeFlags.isLoading, activeFlags.flagsMap, activeFlags.isEnabled, activeFlags.flags, resortId, isGuestContext]);

  return (
    <FeatureFlagsContext.Provider value={contextValue}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

/**
 * Hook to access feature flag context.
 * 
 * @throws Error if used outside of FeatureFlagsProvider
 * @returns FeatureFlagsContextValue
 */
export function useFeatureFlagAccess(): FeatureFlagsContextValue {
  const context = useContext(FeatureFlagsContext);
  
  if (!context) {
    throw new Error(
      'useFeatureFlagAccess must be used within a FeatureFlagsProvider. ' +
      'Wrap your component tree with <FeatureFlagsProvider resortId={...}>.'
    );
  }
  
  return context;
}

/**
 * Safe hook variant that returns null if provider is missing.
 * Useful for components that may or may not be inside the provider.
 */
export function useFeatureFlagAccessSafe(): FeatureFlagsContextValue | null {
  return useContext(FeatureFlagsContext);
}

/**
 * Convenience hook: Check a single flag's effective state.
 * 
 * @param key - The feature flag key to check
 * @returns boolean - true if effectively enabled
 * @throws Error if used outside provider
 */
export function useIsEffectivelyEnabled(key: string): boolean {
  const { isEnabledEffective, loading } = useFeatureFlagAccess();
  
  // While loading, default to false for safety
  if (loading) return false;
  
  return isEnabledEffective(key);
}
