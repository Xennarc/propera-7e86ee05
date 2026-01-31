import { useEffect, useState } from 'react';

/**
 * Hook to detect if user prefers reduced motion.
 * Returns true if the user has requested reduced motion in their OS/browser settings.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    // Check during SSR or initial render
    if (typeof window === 'undefined') return false;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    return mediaQuery.matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    
    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Returns animation variants that respect reduced motion preference.
 * When reduced motion is preferred, returns minimal/no animation variants.
 */
export function useReducedMotionVariants() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return {
    // Fade-only variant for reduced motion
    fadeIn: prefersReducedMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
      : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 } },
    
    // Scale variant
    scaleIn: prefersReducedMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
      : { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.95 } },
    
    // Slide variant  
    slideIn: prefersReducedMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
      : { initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 20 } },
    
    // Generic transition settings
    transition: prefersReducedMotion
      ? { duration: 0.15 }
      : { duration: 0.3, ease: 'easeOut' },
    
    // Whether to skip animations entirely
    shouldReduceMotion: prefersReducedMotion,
  };
}
