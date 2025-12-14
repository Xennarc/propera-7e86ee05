import { QueryClient } from '@tanstack/react-query';

// Exponential backoff calculation
function calculateBackoff(attemptIndex: number): number {
  // Base delay of 1 second, max delay of 30 seconds
  const baseDelay = 1000;
  const maxDelay = 30000;
  
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (capped)
  const delay = Math.min(baseDelay * Math.pow(2, attemptIndex), maxDelay);
  
  // Add jitter (±20%) to prevent thundering herd
  const jitter = delay * 0.2 * (Math.random() - 0.5);
  
  return delay + jitter;
}

// Check if error is a connection/network error
function isConnectionError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('failed to fetch') ||
      message.includes('network') ||
      message.includes('err_tunnel') ||
      message.includes('err_connection') ||
      message.includes('net::') ||
      message.includes('load failed') ||
      message.includes('timeout') ||
      message.includes('aborted')
    );
  }
  return false;
}

// Retry logic - retry connection errors more aggressively
function shouldRetry(failureCount: number, error: unknown): boolean {
  // Don't retry more than 3 times
  if (failureCount >= 3) return false;
  
  // Always retry connection errors
  if (isConnectionError(error)) return true;
  
  // Don't retry 4xx errors (client errors)
  if (error instanceof Error) {
    const message = error.message;
    if (message.includes('400') || message.includes('401') || 
        message.includes('403') || message.includes('404')) {
      return false;
    }
  }
  
  // Retry other errors once
  return failureCount < 1;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Retry configuration
        retry: (failureCount, error) => shouldRetry(failureCount, error),
        retryDelay: (attemptIndex) => calculateBackoff(attemptIndex),
        
        // Stale time - data is fresh for 30 seconds
        staleTime: 30 * 1000,
        
        // Cache time - keep unused data for 5 minutes
        gcTime: 5 * 60 * 1000,
        
        // Refetch on window focus (helpful after connection restore)
        refetchOnWindowFocus: true,
        
        // Don't refetch on mount if data is fresh
        refetchOnMount: true,
        
        // Refetch when reconnecting
        refetchOnReconnect: true,
        
        // Network mode - allow offline access to cached data
        networkMode: 'offlineFirst',
      },
      mutations: {
        // Retry mutations for connection errors
        retry: (failureCount, error) => {
          if (failureCount >= 2) return false;
          return isConnectionError(error);
        },
        retryDelay: (attemptIndex) => calculateBackoff(attemptIndex),
        
        // Network mode
        networkMode: 'offlineFirst',
      },
    },
  });
}

export const queryClient = createQueryClient();
