import { useState, useEffect, useCallback } from 'react';
import { calculateSLAStatus, SLAStatus } from '@/lib/request-sla-config';

/**
 * Hook for live SLA countdown updates
 * Recalculates SLA status every minute for accurate time display
 */
export function useRequestSLA(
  createdAt: string | null | undefined,
  priority: string,
  status: string
): SLAStatus | null {
  const [slaStatus, setSlaStatus] = useState<SLAStatus | null>(() => {
    if (!createdAt) return null;
    return calculateSLAStatus(createdAt, priority, status);
  });

  useEffect(() => {
    if (!createdAt || status === 'COMPLETED' || status === 'CANCELLED') {
      setSlaStatus(null);
      return;
    }

    // Initial calculation
    setSlaStatus(calculateSLAStatus(createdAt, priority, status));

    // Update every 30 seconds for accurate countdown
    const interval = setInterval(() => {
      setSlaStatus(calculateSLAStatus(createdAt, priority, status));
    }, 30000);

    return () => clearInterval(interval);
  }, [createdAt, priority, status]);

  return slaStatus;
}

/**
 * Hook for batch SLA updates (for dashboard list)
 */
export function useBatchRequestSLA(
  requests: Array<{ createdAt: string; priority: string; status: string }>
): Map<number, SLAStatus | null> {
  const [slaMap, setSlaMap] = useState<Map<number, SLAStatus | null>>(new Map());

  const recalculate = useCallback(() => {
    const newMap = new Map<number, SLAStatus | null>();
    requests.forEach((req, index) => {
      if (req.status === 'COMPLETED' || req.status === 'CANCELLED') {
        newMap.set(index, null);
      } else {
        newMap.set(index, calculateSLAStatus(req.createdAt, req.priority, req.status));
      }
    });
    setSlaMap(newMap);
  }, [requests]);

  useEffect(() => {
    recalculate();
    const interval = setInterval(recalculate, 30000);
    return () => clearInterval(interval);
  }, [recalculate]);

  return slaMap;
}
