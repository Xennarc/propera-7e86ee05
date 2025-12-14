import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ConnectionHealth {
  isOnline: boolean;
  isConnected: boolean;
  lastChecked: Date | null;
  retryCount: number;
  error: string | null;
}

export function useConnectionHealth() {
  const [health, setHealth] = useState<ConnectionHealth>({
    isOnline: navigator.onLine,
    isConnected: true,
    lastChecked: null,
    retryCount: 0,
    error: null,
  });

  // Handle browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setHealth(prev => ({ ...prev, isOnline: true, error: null }));
    };
    
    const handleOffline = () => {
      setHealth(prev => ({ 
        ...prev, 
        isOnline: false, 
        isConnected: false,
        error: 'No internet connection' 
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Periodic health check when online
  const checkConnection = useCallback(async () => {
    if (!navigator.onLine) {
      setHealth(prev => ({
        ...prev,
        isOnline: false,
        isConnected: false,
        lastChecked: new Date(),
      }));
      return false;
    }

    try {
      // Simple health check - just verify we can reach the API
      const { error } = await supabase.from('resorts').select('id').limit(1).maybeSingle();
      
      if (error && error.message.includes('Failed to fetch')) {
        throw new Error('Connection failed');
      }

      setHealth(prev => ({
        ...prev,
        isOnline: true,
        isConnected: true,
        lastChecked: new Date(),
        retryCount: 0,
        error: null,
      }));
      return true;
    } catch (err) {
      setHealth(prev => ({
        ...prev,
        isConnected: false,
        lastChecked: new Date(),
        retryCount: prev.retryCount + 1,
        error: 'Unable to connect to server',
      }));
      return false;
    }
  }, []);

  // Auto-check connection when coming back online
  useEffect(() => {
    if (health.isOnline && !health.isConnected) {
      checkConnection();
    }
  }, [health.isOnline, health.isConnected, checkConnection]);

  const retry = useCallback(async () => {
    return checkConnection();
  }, [checkConnection]);

  return {
    ...health,
    retry,
    checkConnection,
  };
}
