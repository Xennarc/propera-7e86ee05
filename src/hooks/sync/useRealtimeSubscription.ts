import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface TableSubscription {
  table: string;
  filter?: string;
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
}

interface UseRealtimeSubscriptionOptions {
  channelKey: string;
  tables: TableSubscription[];
  onChange: (payload: any) => void;
  enabled?: boolean;
}

/**
 * Generic hook for subscribing to Supabase realtime changes.
 * Handles channel setup, cleanup, and error recovery.
 */
export function useRealtimeSubscription({
  channelKey,
  tables,
  onChange,
  enabled = true,
}: UseRealtimeSubscriptionOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onChangeRef = useRef(onChange);
  
  // Keep the callback ref updated
  onChangeRef.current = onChange;

  const stableOnChange = useCallback((payload: any) => {
    onChangeRef.current(payload);
  }, []);

  useEffect(() => {
    if (!enabled || tables.length === 0) return;

    // Create channel with unique key
    const channel = supabase.channel(channelKey);
    channelRef.current = channel;

    // Subscribe to each table
    tables.forEach(({ table, filter, event = '*' }) => {
      const subscriptionConfig: any = {
        event,
        schema: 'public',
        table,
      };

      if (filter) {
        subscriptionConfig.filter = filter;
      }

      channel.on('postgres_changes', subscriptionConfig, stableOnChange);
    });

    // Subscribe to the channel
    channel.subscribe((status, err) => {
      if (err) {
        console.error(`[Realtime] Error subscribing to ${channelKey}:`, err);
      }
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelKey, enabled, tables.length, stableOnChange]);

  return channelRef;
}

/**
 * Creates a filter string for resort-scoped subscriptions
 */
export function createResortFilter(resortId: string): string {
  return `resort_id=eq.${resortId}`;
}

/**
 * Creates a compound filter string
 */
export function createFilter(field: string, value: string): string {
  return `${field}=eq.${value}`;
}
