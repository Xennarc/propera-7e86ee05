import { useMemo } from 'react';
import { useResort } from '@/contexts/ResortContext';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Creates stable query keys that include resort scoping for multi-tenant safety
 */
export function useResortQueryKey(baseKey: string | string[]): (string | undefined)[] {
  const { currentResort } = useResort();
  
  return useMemo(() => {
    const base = Array.isArray(baseKey) ? baseKey : [baseKey];
    return [...base, currentResort?.id];
  }, [baseKey, currentResort?.id]);
}

/**
 * Creates stable query keys for user-scoped data
 */
export function useUserQueryKey(baseKey: string | string[]): (string | undefined)[] {
  const { user } = useAuth();
  
  return useMemo(() => {
    const base = Array.isArray(baseKey) ? baseKey : [baseKey];
    return [...base, user?.id];
  }, [baseKey, user?.id]);
}

/**
 * Creates stable query keys for resort + user scoped data
 */
export function useResortUserQueryKey(baseKey: string | string[]): (string | undefined)[] {
  const { currentResort } = useResort();
  const { user } = useAuth();
  
  return useMemo(() => {
    const base = Array.isArray(baseKey) ? baseKey : [baseKey];
    return [...base, currentResort?.id, user?.id];
  }, [baseKey, currentResort?.id, user?.id]);
}
