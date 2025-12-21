import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PrearrivalHistoryEvent {
  id: string;
  guest_id: string;
  resort_id: string;
  event_type: string;
  changed_fields: Record<string, [any, any]>;
  actor: 'guest' | 'staff' | 'system';
  actor_user_id: string | null;
  summary: string | null;
  created_at: string;
  actor_name?: string;
}

interface UsePrearrivalHistoryOptions {
  guestId: string;
  enabled?: boolean;
  limit?: number;
}

export function usePrearrivalHistory({ 
  guestId, 
  enabled = true, 
  limit = 10 
}: UsePrearrivalHistoryOptions) {
  return useQuery({
    queryKey: ['prearrival-history', guestId, limit],
    queryFn: async (): Promise<PrearrivalHistoryEvent[]> => {
      const { data, error } = await supabase
        .from('guest_profile_events')
        .select(`
          id, guest_id, resort_id, event_type, changed_fields, 
          actor, actor_user_id, summary, created_at
        `)
        .eq('guest_id', guestId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Fetch actor names for staff actions
      const staffIds = data
        .filter(e => e.actor === 'staff' && e.actor_user_id)
        .map(e => e.actor_user_id);

      let actorNames: Record<string, string> = {};
      if (staffIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', staffIds);
        
        if (profiles) {
          actorNames = profiles.reduce((acc, p) => {
            acc[p.id] = p.full_name || 'Staff';
            return acc;
          }, {} as Record<string, string>);
        }
      }

      return data.map(event => ({
        ...event,
        changed_fields: (event.changed_fields || {}) as Record<string, [any, any]>,
        actor: event.actor as 'guest' | 'staff' | 'system',
        actor_name: event.actor_user_id ? actorNames[event.actor_user_id] : undefined,
      }));
    },
    enabled: enabled && !!guestId,
    staleTime: 30000,
  });
}

export function formatFieldChange(field: string, values: [any, any]): string {
  const [oldVal, newVal] = values;
  const fieldLabels: Record<string, string> = {
    arrival_time: 'Arrival time',
    arrival_flight_number: 'Flight number',
    transfer_preference: 'Transfer',
    dietary_preferences: 'Dietary preferences',
    allergies: 'Allergies',
    special_occasions: 'Special occasions',
    special_requests: 'Special requests',
    prearrival_status: 'Status',
    checkin_completed_at: 'Check-in completed',
    policy_acknowledged_at: 'Policy acknowledged',
    staff_notes: 'Staff notes',
    staff_processed: 'Staff processed',
  };

  const label = fieldLabels[field] || field;
  
  // Format the values for display
  const formatValue = (val: any) => {
    if (val === null || val === undefined) return 'empty';
    if (Array.isArray(val)) return val.join(', ') || 'none';
    if (typeof val === 'boolean') return val ? 'yes' : 'no';
    return String(val);
  };

  return `${label}: ${formatValue(oldVal)} → ${formatValue(newVal)}`;
}

export function getEventIcon(eventType: string): string {
  switch (eventType) {
    case 'prearrival_completed':
      return '✅';
    case 'prearrival_created':
      return '📋';
    case 'prearrival_updated':
      return '✏️';
    default:
      return '📝';
  }
}

export function getActorLabel(actor: string, actorName?: string): string {
  switch (actor) {
    case 'guest':
      return 'Guest';
    case 'staff':
      return actorName || 'Staff';
    case 'system':
      return 'System';
    default:
      return actor;
  }
}
