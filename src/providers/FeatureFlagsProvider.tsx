/**
 * Feature Flags Provider
 * 
 * Provides app-wide access to feature flag state with effective resolution.
 * Wrap each portal (Staff, Guest, etc.) with this provider passing the resortId.
 * 
 * Usage:
 *   <FeatureFlagsProvider resortId={currentResort?.id}>
 *     <App />
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
  isEnabledEffective as checkEffective,
} from '@/hooks/useFeatureFlags';

interface FeatureFlagsContextValue {
  /** Whether flags are still loading */
  loading: boolean;
  /** Quick lookup map: key → is_enabled (raw, not effective) */
  flagsMap: Record<string, boolean>;
  /** Check if a flag is effectively enabled (respects parent module deps) */
  isEnabledEffective: (key: string) => boolean;
  /** Raw flags array for advanced use cases */
  rawFlags: FeatureFlag[];
  /** The resort ID used for this context (undefined = global) */
  resortId: string | undefined;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

interface FeatureFlagsProviderProps {
  children: React.ReactNode;
  /** Resort ID for resort-scoped flag resolution. Omit for global-only. */
  resortId?: string;
}

export function FeatureFlagsProvider({ children, resortId }: FeatureFlagsProviderProps) {
  const { flags, flagsMap, isEnabled, isLoading } = useResolvedFeatureFlags(resortId);

  const contextValue = useMemo<FeatureFlagsContextValue>(() => ({
    loading: isLoading,
    flagsMap,
    isEnabledEffective: isEnabled,
    rawFlags: flags,
    resortId,
  }), [isLoading, flagsMap, isEnabled, flags, resortId]);

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
