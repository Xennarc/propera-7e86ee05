import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

export interface StaffDebugMode {
  isDebugMode: boolean;
  showDebugPanel: boolean;
  debugLog: (message: string, data?: Record<string, unknown>) => void;
}

export function useStaffDebugMode(): StaffDebugMode {
  const [searchParams] = useSearchParams();
  const { isSuperAdmin } = useAuth();
  const { currentResortRole } = usePermissions();

  const hasDebugParam = searchParams.get('debug') === '1';
  
  // Only Super Admins and Resort Admins can see debug panel
  const isAuthorized = isSuperAdmin() || currentResortRole === 'RESORT_ADMIN';
  
  const isDebugMode = hasDebugParam && isAuthorized;
  const showDebugPanel = isDebugMode;

  const debugLog = (message: string, data?: Record<string, unknown>) => {
    if (isDebugMode) {
      console.log(`[Staff Debug] ${message}`, data ?? '');
    }
  };

  return {
    isDebugMode,
    showDebugPanel,
    debugLog,
  };
}
