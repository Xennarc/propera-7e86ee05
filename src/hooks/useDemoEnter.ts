import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { GUEST_SESSION_KEY } from '@/contexts/GuestAuthContext';
import { setVirtualNow, clearVirtualNow } from '@/lib/virtual-clock';
import { toast } from 'sonner';

const DEMO_SLOT_KEY = 'propera_demo_slot';

interface EnterResult {
  success: boolean;
  error?: string;
}

/**
 * Single entry point for the Perfect Demo Resort.
 * - Calls demo-enter edge function (rotates slot, wipes data, rebases stay).
 * - For guest: writes session to localStorage and redirects to guest portal.
 * - For staff: signs in invisibly with rotated credentials and redirects to dashboard.
 */
export function useDemoEnter() {
  const [isEntering, setIsEntering] = useState(false);
  const navigate = useNavigate();

  const enter = useCallback(
    async (portal: 'guest' | 'staff'): Promise<EnterResult> => {
      setIsEntering(true);
      try {
        const { data, error } = await supabase.functions.invoke('demo-enter', {
          body: { portal },
        });
        if (error) throw error;
        if (!data?.success) {
          throw new Error(data?.error ?? 'Failed to enter demo');
        }

        // Track which slot we own so exit can target it.
        if (typeof data.slot === 'number') {
          localStorage.setItem(DEMO_SLOT_KEY, String(data.slot));
        }

        // Freeze the per-visitor virtual clock for the time-capsule effect.
        if (data.virtualNow) {
          setVirtualNow(data.virtualNow);
        }

        if (portal === 'guest' && data.guestSession) {
          localStorage.setItem(
            GUEST_SESSION_KEY,
            JSON.stringify(data.guestSession),
          );
          const code = data.resortCode ?? 'DEMO';
          // Hard navigation so AuthContext + GuestAuthContext re-init.
          window.location.href = `/resort/${code}/guest`;
          return { success: true };
        }

        if (portal === 'staff' && data.auth?.email && data.auth?.password) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: data.auth.email,
            password: data.auth.password,
          });
          if (signInErr) throw signInErr;
          // Hard navigation to ensure auth state propagates.
          window.location.href = '/staff/dashboard';
          return { success: true };
        }

        throw new Error('Unexpected response from demo-enter');
      } catch (err: any) {
        console.error('Demo enter failed:', err);
        const msg = err?.message ?? 'Failed to enter demo';
        toast.error(msg);
        return { success: false, error: msg };
      } finally {
        setIsEntering(false);
      }
    },
    [navigate],
  );

  return { enter, isEntering };
}

export function getStoredDemoSlot(): number | null {
  const raw = localStorage.getItem(DEMO_SLOT_KEY);
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
}

export function clearStoredDemoSlot() {
  localStorage.removeItem(DEMO_SLOT_KEY);
  clearVirtualNow();
}
