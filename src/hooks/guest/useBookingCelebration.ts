import { useState, useCallback, useRef } from 'react';

/**
 * Hook to manage booking success celebration state.
 * Includes debounce to prevent stacking from rapid mutations.
 */
export function useBookingCelebration() {
  const [isCelebrating, setIsCelebrating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTriggerRef = useRef<number>(0);

  const triggerCelebration = useCallback(() => {
    const now = Date.now();
    
    // Debounce: ignore if triggered within last 2 seconds
    if (now - lastTriggerRef.current < 2000) {
      return;
    }

    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    lastTriggerRef.current = now;
    setIsCelebrating(true);
  }, []);

  const dismissCelebration = useCallback(() => {
    setIsCelebrating(false);
  }, []);

  return {
    isCelebrating,
    triggerCelebration,
    dismissCelebration,
  };
}
