import { useState, useEffect, useCallback } from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';

const STORAGE_KEY = 'propera-staff-compact-mode';

/**
 * Hook for managing mobile-only compact/density mode in Staff Portal.
 * - Only applies on mobile breakpoint (< md)
 * - Persists preference to localStorage
 * - Provides toggle function and current state
 */
export function useStaffMobileDensity() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isCompact, setIsCompact] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Persist to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isCompact));
    } catch {
      // Ignore storage errors
    }
  }, [isCompact]);

  const toggleCompact = useCallback(() => {
    setIsCompact(prev => !prev);
  }, []);

  const setCompact = useCallback((value: boolean) => {
    setIsCompact(value);
  }, []);

  // Only return compact state on mobile
  return {
    /** Whether compact mode is enabled (always false on desktop) */
    isCompact: isMobile && isCompact,
    /** Raw compact preference (ignores breakpoint) */
    compactPreference: isCompact,
    /** Toggle compact mode */
    toggleCompact,
    /** Set compact mode explicitly */
    setCompact,
    /** Whether we're on mobile breakpoint */
    isMobile,
  };
}
