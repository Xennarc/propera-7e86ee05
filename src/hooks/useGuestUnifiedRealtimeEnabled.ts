import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useFeatureFlagAccessSafe } from '@/providers/FeatureFlagsProvider';

/**
 * Determines if unified guest realtime should be enabled.
 * 
 * Resolution order:
 * 1. Query param override: ?unifiedRealtime=1 (for superadmin testing)
 * 2. Feature flag: enable_unified_guest_realtime
 * 3. Default: false (legacy per-hook channels)
 */
export function useGuestUnifiedRealtimeEnabled(): boolean {
  const location = useLocation();
  const flagContext = useFeatureFlagAccessSafe();

  return useMemo(() => {
    // Query param override for superadmin testing
    const searchParams = new URLSearchParams(location.search);
    const queryOverride = searchParams.get('unifiedRealtime');
    
    if (queryOverride === '1') {
      return true;
    }
    if (queryOverride === '0') {
      return false;
    }

    // Check feature flag if context is available
    if (flagContext && !flagContext.loading) {
      return flagContext.isEnabledEffective('enable_unified_guest_realtime');
    }

    // Default to false (legacy behavior)
    return false;
  }, [location.search, flagContext]);
}
