import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subHours, subDays } from 'date-fns';

export interface PlatformActivityEvent {
  id: string;
  resort_id: string | null;
  event_type: string;
  actor_id: string | null;
  actor_type: 'staff' | 'guest' | 'system' | 'superadmin' | null;
  actor_name: string | null;
  target_type: string | null;
  target_id: string | null;
  target_name: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  resort_name?: string;
}

export const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  booking_created: { label: 'Booking Created', icon: 'Calendar', color: 'text-success' },
  booking_cancelled: { label: 'Booking Cancelled', icon: 'XCircle', color: 'text-destructive' },
  booking_confirmed: { label: 'Booking Confirmed', icon: 'CheckCircle', color: 'text-success' },
  booking_completed: { label: 'Booking Completed', icon: 'CheckCircle2', color: 'text-primary' },
  booking_updated: { label: 'Booking Updated', icon: 'Edit', color: 'text-warning' },
  guest_checked_in: { label: 'Guest Checked In', icon: 'LogIn', color: 'text-success' },
  guest_checked_out: { label: 'Guest Checked Out', icon: 'LogOut', color: 'text-muted-foreground' },
  session_created: { label: 'Session Created', icon: 'Plus', color: 'text-primary' },
  session_cancelled: { label: 'Session Cancelled', icon: 'XCircle', color: 'text-destructive' },
  staff_login: { label: 'Staff Login', icon: 'Shield', color: 'text-primary' },
  feature_flag_toggled: { label: 'Feature Flag Changed', icon: 'ToggleRight', color: 'text-warning' },
  resort_created: { label: 'Resort Created', icon: 'Building2', color: 'text-success' },
  rollout_executed: { label: 'Rollout Executed', icon: 'Rocket', color: 'text-primary' },
};

export function usePlatformActivity(
  resortFilter: string = 'all',
  limit: number = 50,
  resorts: { id: string; name: string }[] = []
) {
  return useQuery({
    queryKey: ['platform-activity', resortFilter, limit],
    queryFn: async (): Promise<PlatformActivityEvent[]> => {
      let query = supabase
        .from('platform_activity_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (resortFilter !== 'all') {
        query = query.eq('resort_id', resortFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with resort names
      return (data || []).map(e => ({
        ...e,
        actor_type: e.actor_type as PlatformActivityEvent['actor_type'],
        metadata_json: e.metadata_json as Record<string, unknown>,
        resort_name: e.resort_id 
          ? resorts.find(r => r.id === e.resort_id)?.name || 'Unknown Resort'
          : null
      }));
    },
    refetchInterval: 30000,
  });
}

export function usePlatformActivityRealtime(
  resortFilter: string = 'all',
  resorts: { id: string; name: string }[] = []
) {
  const [events, setEvents] = useState<PlatformActivityEvent[]>([]);

  // Initial fetch
  const { data: initialEvents, isLoading } = usePlatformActivity(resortFilter, 20, resorts);

  useEffect(() => {
    if (initialEvents) {
      setEvents(initialEvents);
    }
  }, [initialEvents]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('platform-activity-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'platform_activity_events',
        },
        (payload) => {
          const newEvent = payload.new as PlatformActivityEvent;
          
          // Filter by resort if needed
          if (resortFilter !== 'all' && newEvent.resort_id !== resortFilter) {
            return;
          }

          // Enrich with resort name
          const enrichedEvent = {
            ...newEvent,
            resort_name: newEvent.resort_id 
              ? resorts.find(r => r.id === newEvent.resort_id)?.name || 'Unknown Resort'
              : null
          };

          setEvents(prev => [enrichedEvent, ...prev.slice(0, 49)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resortFilter, resorts]);

  return { events, isLoading };
}

// Get activity counts for daily briefing
export function useDailyBriefing(resortIds: string[] = []) {
  return useQuery({
    queryKey: ['daily-briefing', resortIds],
    queryFn: async () => {
      const last24h = subHours(new Date(), 24);
      const last7d = subDays(new Date(), 7);
      const prev7d = subDays(new Date(), 14);

      // Count events in last 24h
      let eventsQuery = supabase
        .from('platform_activity_events')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last24h.toISOString());

      if (resortIds.length > 0) {
        eventsQuery = eventsQuery.in('resort_id', resortIds);
      }

      const { count: changes } = await eventsQuery;

      // Count errors in last 24h
      let errorsQuery = supabase
        .from('platform_errors')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last24h.toISOString());

      if (resortIds.length > 0) {
        errorsQuery = errorsQuery.in('resort_id', resortIds);
      }

      const { count: issues } = await errorsQuery;

      // Calculate growth (bookings this week vs last week)
      let thisWeekQuery = supabase
        .from('activity_bookings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last7d.toISOString());

      let lastWeekQuery = supabase
        .from('activity_bookings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', prev7d.toISOString())
        .lt('created_at', last7d.toISOString());

      if (resortIds.length > 0) {
        thisWeekQuery = thisWeekQuery.in('resort_id', resortIds);
        lastWeekQuery = lastWeekQuery.in('resort_id', resortIds);
      }

      const { count: thisWeek } = await thisWeekQuery;
      const { count: lastWeek } = await lastWeekQuery;

      const growth = lastWeek && lastWeek > 0 
        ? Math.round(((thisWeek || 0) - lastWeek) / lastWeek * 100)
        : 0;

      return {
        changes: changes || 0,
        issues: issues || 0,
        growth: growth >= 0 ? `+${growth}%` : `${growth}%`,
      };
    },
    refetchInterval: 60000,
  });
}
