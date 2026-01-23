import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const DEMO_RESORT_CODE = 'DEMO';

interface GuestDebugMode {
  /** True if debug mode is active (via ?debug=1 or demo resort) */
  isDebugMode: boolean;
  /** True if debug panel should be shown (explicit ?debug=1 only) */
  showDebugPanel: boolean;
  /** True if console debug logs should be output */
  logDebug: boolean;
  /** Resort code if resolved */
  resortCode: string | undefined;
  /** Helper to log debug messages only when debug mode is active */
  debugLog: (message: string, data?: Record<string, unknown>) => void;
}

/**
 * Hook to detect and manage guest debug mode.
 * Debug mode is activated when:
 * - URL has ?debug=1 query param, OR
 * - Resort code is 'DEMO'
 * 
 * The debug panel is only shown with explicit ?debug=1.
 */
export function useGuestDebugMode(resortId?: string): GuestDebugMode {
  const [searchParams] = useSearchParams();
  const [resortCode, setResortCode] = useState<string | undefined>(undefined);
  
  // Fetch resort code if we have a resortId
  useEffect(() => {
    if (!resortId) {
      setResortCode(undefined);
      return;
    }
    
    supabase
      .from('resorts')
      .select('code')
      .eq('id', resortId)
      .single()
      .then(({ data }) => {
        setResortCode(data?.code || undefined);
      });
  }, [resortId]);
  
  return useMemo(() => {
    const isDebugParam = searchParams.get('debug') === '1';
    const isDemoResort = resortCode === DEMO_RESORT_CODE;
    
    const isDebugMode = isDebugParam || isDemoResort;
    const showDebugPanel = isDebugParam; // Only show panel with explicit param
    const logDebug = isDebugMode;
    
    const debugLog = (message: string, data?: Record<string, unknown>) => {
      if (logDebug) {
        console.log(`[MyBookings Debug] ${message}`, data ?? '');
      }
    };
    
    return {
      isDebugMode,
      showDebugPanel,
      logDebug,
      resortCode,
      debugLog,
    };
  }, [searchParams, resortCode]);
}
