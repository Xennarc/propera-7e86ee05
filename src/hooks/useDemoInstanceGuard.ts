import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const DEMO_INSTANCE_KEY_GUEST = 'propera_guest_demo_instance_id';
const DEMO_INSTANCE_KEY_STAFF = 'propera_demo_instance_id';

interface DemoInstanceGuardResult {
  isStale: boolean;
  currentInstanceId: number | null;
  storedInstanceId: number | null;
  dismiss: () => void;
}

/**
 * Checks if the current demo session is stale (instance rotated).
 * Only active when the resort is a demo resort (code=DEMO or is_demo=true).
 */
export function useDemoInstanceGuard(
  resortId: string | undefined,
  variant: 'guest' | 'staff'
): DemoInstanceGuardResult {
  const [dismissed, setDismissed] = useState(false);
  const storageKey = variant === 'guest' ? DEMO_INSTANCE_KEY_GUEST : DEMO_INSTANCE_KEY_STAFF;

  const { data: resortData } = useQuery({
    queryKey: ['demo-instance-check', resortId],
    queryFn: async () => {
      if (!resortId) return null;
      const { data, error } = await supabase
        .from('resorts')
        .select('is_demo, code, demo_instance_id')
        .eq('id', resortId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!resortId,
    staleTime: 60_000, // Check every minute
    refetchInterval: 60_000,
  });

  const isDemoResort = resortData?.code === 'DEMO' || resortData?.is_demo === true;
  const currentInstanceId = resortData?.demo_instance_id ?? null;

  // Read stored instance from localStorage
  const storedInstanceId = (() => {
    if (typeof window === 'undefined') return null;
    
    if (variant === 'guest') {
      // For guests, also check the session object
      try {
        const session = localStorage.getItem('propera_guest_session');
        if (session) {
          const parsed = JSON.parse(session);
          if (parsed.demoInstanceId != null) return Number(parsed.demoInstanceId);
        }
      } catch { /* ignore */ }
    }
    
    const raw = localStorage.getItem(storageKey);
    return raw ? Number(raw) : null;
  })();

  const isStale = !dismissed
    && isDemoResort
    && currentInstanceId !== null
    && storedInstanceId !== null
    && currentInstanceId !== storedInstanceId;

  const dismiss = () => {
    setDismissed(true);
  };

  return {
    isStale,
    currentInstanceId,
    storedInstanceId,
    dismiss,
  };
}

/** Store the demo instance ID after login */
export function storeDemoInstanceId(instanceId: number, variant: 'guest' | 'staff') {
  const key = variant === 'guest' ? DEMO_INSTANCE_KEY_GUEST : DEMO_INSTANCE_KEY_STAFF;
  localStorage.setItem(key, String(instanceId));
}

/** Clear demo instance state (on logout or reset acknowledgement) */
export function clearDemoInstanceState(variant: 'guest' | 'staff') {
  const key = variant === 'guest' ? DEMO_INSTANCE_KEY_GUEST : DEMO_INSTANCE_KEY_STAFF;
  localStorage.removeItem(key);
}
