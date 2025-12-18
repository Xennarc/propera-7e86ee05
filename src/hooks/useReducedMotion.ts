import { useState, useEffect } from 'react';

/**
 * Hook to detect user's reduced motion preference
 * Returns true if user prefers reduced motion, false otherwise
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() => {
    // SSR-safe initial value
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return reducedMotion;
}

/**
 * Hook to detect low-power device (battery saver, slow CPU)
 */
export function useLowPowerDevice(): boolean {
  const [isLowPower, setIsLowPower] = useState(false);

  useEffect(() => {
    // Check for low-end device indicators
    const checkDevice = () => {
      // Check hardware concurrency (CPU cores)
      const lowCores = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
      // Check device memory (Chrome only)
      const lowMemory = (navigator as any).deviceMemory && (navigator as any).deviceMemory < 4;
      // Check connection (slow network often correlates with older devices)
      const connection = (navigator as any).connection;
      const slowConnection = connection && (connection.saveData || connection.effectiveType === '2g');
      
      setIsLowPower(lowCores || lowMemory || slowConnection);
    };

    checkDevice();
  }, []);

  return isLowPower;
}

/**
 * Combined hook for animation preferences
 */
export function useAnimationPreference(): {
  shouldAnimate: boolean;
  reducedMotion: boolean;
  isLowPower: boolean;
} {
  const reducedMotion = useReducedMotion();
  const isLowPower = useLowPowerDevice();
  
  return {
    shouldAnimate: !reducedMotion && !isLowPower,
    reducedMotion,
    isLowPower,
  };
}
