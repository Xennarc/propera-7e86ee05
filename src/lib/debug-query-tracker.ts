import { QueryClient, QueryCache } from '@tanstack/react-query';

const SLOW_QUERY_THRESHOLD_MS = 500;
const MAX_HISTORY_SIZE = 20;

export interface TrackedQuery {
  queryKey: unknown[];
  keyString: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'success' | 'error';
  isSlow: boolean;
}

// In-memory storage
const pendingQueries: Map<string, TrackedQuery> = new Map();
let recentQueries: TrackedQuery[] = [];
let unsubscribe: (() => void) | null = null;

/**
 * Format a query key into a readable string, truncating UUIDs
 */
export function formatQueryKey(queryKey: unknown[]): string {
  return queryKey
    .map(part => {
      if (typeof part === 'string') {
        // Truncate UUIDs (typically 36 chars with dashes)
        if (part.length > 20 && part.includes('-')) {
          return part.slice(0, 8) + '...';
        }
        return part;
      }
      if (part === null || part === undefined) {
        return '';
      }
      if (typeof part === 'object') {
        try {
          const str = JSON.stringify(part);
          return str.length > 20 ? str.slice(0, 17) + '...' : str;
        } catch {
          return '[object]';
        }
      }
      return String(part);
    })
    .filter(Boolean)
    .join('.');
}

/**
 * Get a unique key for a query (for tracking purposes)
 */
function getQueryId(queryKey: unknown[]): string {
  try {
    return JSON.stringify(queryKey);
  } catch {
    return String(queryKey);
  }
}

/**
 * Initialize the query tracker by subscribing to the query cache
 */
export function initQueryTracker(queryClient: QueryClient): () => void {
  // Clean up any existing subscription
  if (unsubscribe) {
    unsubscribe();
  }

  const queryCache: QueryCache = queryClient.getQueryCache();

  unsubscribe = queryCache.subscribe((event) => {
    if (!event?.query) return;

    const query = event.query;
    const queryKey = query.queryKey;
    const queryId = getQueryId(queryKey);
    const keyString = formatQueryKey(queryKey);

    // Handle query state changes
    if (event.type === 'updated') {
      const isFetching = query.state.fetchStatus === 'fetching';
      const status = query.state.status;

      if (isFetching) {
        // Query started fetching
        if (!pendingQueries.has(queryId)) {
          pendingQueries.set(queryId, {
            queryKey,
            keyString,
            startTime: Date.now(),
            status: 'pending',
            isSlow: false,
          });
        }
      } else {
        // Query finished fetching
        const tracked = pendingQueries.get(queryId);
        if (tracked) {
          const endTime = Date.now();
          const duration = endTime - tracked.startTime;
          
          const completedQuery: TrackedQuery = {
            ...tracked,
            endTime,
            duration,
            status: status === 'error' ? 'error' : 'success',
            isSlow: duration > SLOW_QUERY_THRESHOLD_MS,
          };

          // Add to recent history
          recentQueries.unshift(completedQuery);
          if (recentQueries.length > MAX_HISTORY_SIZE) {
            recentQueries = recentQueries.slice(0, MAX_HISTORY_SIZE);
          }

          // Remove from pending
          pendingQueries.delete(queryId);
        }
      }
    }
  });

  return () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };
}

/**
 * Get all currently pending (fetching) queries
 */
export function getPendingQueries(): TrackedQuery[] {
  const now = Date.now();
  return Array.from(pendingQueries.values()).map(q => ({
    ...q,
    duration: now - q.startTime,
    isSlow: (now - q.startTime) > SLOW_QUERY_THRESHOLD_MS,
  }));
}

/**
 * Get recently completed queries
 */
export function getRecentQueries(): TrackedQuery[] {
  return [...recentQueries];
}

/**
 * Get only slow queries from history
 */
export function getSlowQueries(): TrackedQuery[] {
  return recentQueries.filter(q => q.isSlow);
}

/**
 * Get query performance stats
 */
export function getQueryStats(): {
  avgDuration: number;
  slowCount: number;
  totalCount: number;
} {
  const completedQueries = recentQueries.filter(q => q.duration !== undefined);
  const totalDuration = completedQueries.reduce((sum, q) => sum + (q.duration || 0), 0);
  
  return {
    avgDuration: completedQueries.length > 0 ? Math.round(totalDuration / completedQueries.length) : 0,
    slowCount: completedQueries.filter(q => q.isSlow).length,
    totalCount: completedQueries.length,
  };
}

/**
 * Clear query history
 */
export function clearQueryHistory(): void {
  recentQueries = [];
}

/**
 * Get timing color class based on duration
 */
export function getTimingColorClass(durationMs: number): string {
  if (durationMs < 300) return 'text-green-500';
  if (durationMs < 500) return 'text-amber-500';
  return 'text-red-500';
}

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}
