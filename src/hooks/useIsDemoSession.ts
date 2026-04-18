import { useEffect, useState } from 'react';
import { getStoredDemoSlot } from './useDemoEnter';
import { hasFrozenClock } from '@/lib/virtual-clock';

/**
 * Single source of truth for "am I currently inside a demo session?"
 *
 * True when either a demo slot is stored locally (guest portal) OR a
 * frozen virtual clock is active (staff portal post-login). Both signals
 * are localStorage-backed and survive reloads but are cleared on exit.
 */
export function useIsDemoSession(): boolean {
  const [isDemo, setIsDemo] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return getStoredDemoSlot() != null || hasFrozenClock();
  });

  useEffect(() => {
    const recompute = () => {
      setIsDemo(getStoredDemoSlot() != null || hasFrozenClock());
    };
    window.addEventListener('storage', recompute);
    // Re-check on focus in case another tab cleared the slot.
    window.addEventListener('focus', recompute);
    return () => {
      window.removeEventListener('storage', recompute);
      window.removeEventListener('focus', recompute);
    };
  }, []);

  return isDemo;
}
