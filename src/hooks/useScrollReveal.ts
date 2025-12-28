import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Shared scroll reveal hook using a single IntersectionObserver
 * Returns a ref to attach to the element and a revealed state
 */
export function useScrollReveal(options?: { threshold?: number; rootMargin?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect(); // Once revealed, stop observing
        }
      },
      {
        threshold: options?.threshold ?? 0.1,
        rootMargin: options?.rootMargin ?? '0px 0px -50px 0px',
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [options?.threshold, options?.rootMargin]);

  return { ref, revealed };
}

/**
 * Hook for sections that contain multiple children with staggered reveals
 * Applies revealed class to container, children animate via CSS stagger
 */
export function useSectionReveal() {
  const { ref, revealed } = useScrollReveal({ threshold: 0.05 });
  return { ref, className: revealed ? 'section-revealed' : '' };
}
