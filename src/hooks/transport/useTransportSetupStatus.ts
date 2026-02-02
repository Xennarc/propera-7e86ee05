import { useEffect, useState } from 'react';
import { useBuggies } from './useBuggies';
import { useBuggyDrivers } from './useBuggyDrivers';
import { useTransportStops } from './useTransportStops';

export interface TransportSetupStatus {
  stopsCount: number;
  buggiesCount: number;
  driversCount: number;
  isComplete: boolean;
  isDismissed: boolean;
  isLoading: boolean;
  dismissSetup: () => void;
  resetDismiss: () => void;
}

const STORAGE_KEY_PREFIX = 'propera_transport_setup_dismissed_';

export function useTransportSetupStatus(resortId: string | undefined): TransportSetupStatus {
  const [isDismissed, setIsDismissed] = useState(true); // Default to true to prevent flash
  const storageKey = `${STORAGE_KEY_PREFIX}${resortId}`;
  
  const { data: stops = [], isLoading: stopsLoading } = useTransportStops(resortId);
  const { data: buggies = [], isLoading: buggiesLoading } = useBuggies(resortId);
  const { data: drivers = [], isLoading: driversLoading } = useBuggyDrivers(resortId);
  
  // Filter active buggies (not out_of_service)
  const activeBuggies = buggies.filter(b => b.status !== 'out_of_service');
  
  useEffect(() => {
    if (resortId) {
      const dismissed = localStorage.getItem(storageKey) === 'true';
      setIsDismissed(dismissed);
    }
  }, [storageKey, resortId]);
  
  const stopsCount = stops.length;
  const buggiesCount = activeBuggies.length;
  const driversCount = drivers.length;
  
  // Setup is complete when we have at least 2 stops, 1 buggy, and 1 driver
  const isComplete = stopsCount >= 2 && buggiesCount >= 1 && driversCount >= 1;
  
  const dismissSetup = () => {
    localStorage.setItem(storageKey, 'true');
    setIsDismissed(true);
  };
  
  const resetDismiss = () => {
    localStorage.removeItem(storageKey);
    setIsDismissed(false);
  };
  
  return {
    stopsCount,
    buggiesCount,
    driversCount,
    isComplete,
    isDismissed,
    isLoading: stopsLoading || buggiesLoading || driversLoading,
    dismissSetup,
    resetDismiss,
  };
}
