import { useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GUEST_SESSION_KEY } from '@/contexts/GuestAuthContext';
import { getStoredDemoSlot, clearStoredDemoSlot } from './useDemoEnter';

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
const RESET_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/demo-reset`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

/**
 * Best-effort beacon reset on tab close / navigation away.
 * Only sends when we have an active demo slot stored.
 */
export function useDemoExitBeacon(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const handler = () => {
      const slot = getStoredDemoSlot();
      if (slot == null) return;
      try {
        const blob = new Blob(
          [JSON.stringify({ slot })],
          { type: 'application/json' },
        );
        navigator.sendBeacon?.(`${RESET_URL}?apikey=${ANON_KEY}`, blob);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('pagehide', handler);
    return () => window.removeEventListener('pagehide', handler);
  }, [active]);
}

/**
 * Manual exit: reset slot, clear all demo state, sign out.
 */
export function useDemoExit() {
  const exit = useCallback(async () => {
    const slot = getStoredDemoSlot();
    try {
      if (slot != null) {
        await supabase.functions.invoke('demo-reset', { body: { slot } });
      }
    } catch (err) {
      console.warn('Demo reset failed (non-blocking):', err);
    }

    // Clear all demo + session state.
    localStorage.removeItem(GUEST_SESSION_KEY);
    clearStoredDemoSlot();
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }

    // Hard navigate home so all contexts re-init clean.
    window.location.href = '/';
  }, []);

  return { exit };
}
