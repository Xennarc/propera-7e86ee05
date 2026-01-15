import { useResort } from '@/contexts/ResortContext';
import { DEMO_RESORT_CODE } from '@/lib/demoSingleton';

/**
 * Hook to detect if currently in demo mode and should be read-only
 * Returns true if the current resort is the shared demo resort
 */
export function useDemoReadOnly(): { isDemoMode: boolean; isReadOnly: boolean } {
  const { currentResort } = useResort();
  
  const isDemoMode = currentResort?.code === DEMO_RESORT_CODE || currentResort?.is_demo === true;
  
  return {
    isDemoMode,
    isReadOnly: isDemoMode, // In demo mode, staff actions are read-only
  };
}
