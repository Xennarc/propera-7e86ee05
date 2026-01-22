import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useSubmitCooldown - Manages a client-side cooldown timer after submissions
 * 
 * Features:
 * - Configurable cooldown duration (default 30s)
 * - Persists to localStorage to survive page refresh
 * - Scoped per action type
 * - Countdown timer for UI feedback
 * 
 * @param actionKey - Unique key for this action type (e.g., 'request_submit')
 * @param defaultDuration - Default cooldown in seconds (default: 30)
 */
export function useSubmitCooldown(
  actionKey: string,
  defaultDuration: number = 30
) {
  const storageKey = `cooldown_${actionKey}`;
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Calculate remaining time from stored expiry
  const calculateRemaining = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return 0;
      
      const expiryTime = parseInt(stored, 10);
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((expiryTime - now) / 1000));
      
      // Clean up expired cooldown
      if (remaining <= 0) {
        localStorage.removeItem(storageKey);
        return 0;
      }
      
      return remaining;
    } catch {
      return 0;
    }
  }, [storageKey]);

  // Initialize and run countdown
  useEffect(() => {
    // Initial check
    setRemainingSeconds(calculateRemaining());

    // Set up interval to update countdown
    intervalRef.current = setInterval(() => {
      const remaining = calculateRemaining();
      setRemainingSeconds(remaining);
      
      // Stop interval when cooldown ends
      if (remaining <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [calculateRemaining]);

  // Start cooldown after successful submission
  const startCooldown = useCallback((durationSec?: number) => {
    const duration = durationSec ?? defaultDuration;
    const expiryTime = Date.now() + (duration * 1000);
    
    try {
      localStorage.setItem(storageKey, expiryTime.toString());
    } catch {
      // localStorage not available, still set in-memory state
    }
    
    setRemainingSeconds(duration);

    // Restart interval if not running
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        const remaining = calculateRemaining();
        setRemainingSeconds(remaining);
        
        if (remaining <= 0 && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }, 1000);
    }
  }, [defaultDuration, storageKey, calculateRemaining]);

  // Clear cooldown manually (admin override)
  const clearCooldown = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
    setRemainingSeconds(0);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [storageKey]);

  return {
    isOnCooldown: remainingSeconds > 0,
    remainingSeconds,
    startCooldown,
    clearCooldown,
  };
}

/**
 * Format remaining seconds for display
 * e.g., 27 -> "27s", 90 -> "1:30"
 */
export function formatCooldownTime(seconds: number): string {
  if (seconds <= 0) return '';
  if (seconds < 60) return `${seconds}s`;
  
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
