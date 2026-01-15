import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, subHours, subMinutes } from 'date-fns';

export type ActionSeverity = 'P0' | 'P1' | 'P2' | 'P3';
export type ActionCategory = 'config' | 'invite' | 'data' | 'error' | 'security' | 'outbox';

export interface ActionQueueItem {
  id: string;
  severity: ActionSeverity;
  title: string;
  description: string;
  resort?: string;
  resortId?: string;
  category: ActionCategory;
  triggeredAt: Date;
  fixAction?: {
    label: string;
    type: 'navigate' | 'api' | 'dialog';
    target?: string;
  };
}

interface Resort {
  id: string;
  name: string;
  code: string;
  status: string;
  is_demo?: boolean;
}

export function useActionQueueDetectors(resorts: Resort[], filterSeverity?: ActionSeverity) {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['action-queue-detectors', resorts.map(r => r.id), filterSeverity],
    queryFn: async () => {
      const items: ActionQueueItem[] = [];
      const activeResorts = resorts.filter(r => r.status === 'ACTIVE');
      
      for (const resort of activeResorts) {
        try {
          // 1. No upcoming sessions
          const { count: activityCount } = await supabase
            .from('activities')
            .select('*', { count: 'exact', head: true })
            .eq('resort_id', resort.id)
            .eq('is_active', true);
          
          const { count: sessionCount } = await supabase
            .from('activity_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('resort_id', resort.id)
            .gte('date', today);
          
          if ((activityCount ?? 0) > 0 && !sessionCount) {
            items.push({
              id: `no-sessions-${resort.id}`,
              severity: 'P1',
              title: 'No upcoming sessions',
              description: `${activityCount} activities but no sessions`,
              resort: resort.name,
              resortId: resort.id,
              category: 'config',
              triggeredAt: new Date(),
              fixAction: { label: 'Create Sessions', type: 'navigate', target: `/activities/sessions` }
            });
          }
          
          // 2. No dining slots
          const { count: restaurantCount } = await supabase
            .from('restaurants')
            .select('*', { count: 'exact', head: true })
            .eq('resort_id', resort.id)
            .eq('is_active', true);
          
          const { count: slotCount } = await supabase
            .from('restaurant_time_slots')
            .select('*', { count: 'exact', head: true })
            .eq('resort_id', resort.id)
            .gte('date', today);
          
          if ((restaurantCount ?? 0) > 0 && !slotCount) {
            items.push({
              id: `no-slots-${resort.id}`,
              severity: 'P2',
              title: 'No dining slots',
              description: `${restaurantCount} restaurants but no slots`,
              resort: resort.name,
              resortId: resort.id,
              category: 'config',
              triggeredAt: new Date(),
              fixAction: { label: 'Create Slots', type: 'navigate', target: `/restaurants/slots` }
            });
          }
          
          // 3. Feature flag conflicts
          const { data: globalFlags } = await supabase
            .from('feature_flags')
            .select('key, is_enabled')
            .eq('scope', 'global');
          
          const { data: resortOverrides } = await supabase
            .from('feature_flags')
            .select('key, is_enabled')
            .eq('scope', 'resort')
            .eq('resort_id', resort.id);
          
          for (const override of resortOverrides || []) {
            const globalFlag = globalFlags?.find(f => f.key === override.key);
            if (globalFlag && globalFlag.is_enabled !== override.is_enabled) {
              items.push({
                id: `flag-conflict-${resort.id}-${override.key}`,
                severity: 'P1',
                title: 'Feature flag conflict',
                description: `"${override.key}" differs from global`,
                resort: resort.name,
                resortId: resort.id,
                category: 'config',
                triggeredAt: new Date(),
                fixAction: { label: 'View Flags', type: 'navigate', target: `/superadmin/flags` }
              });
            }
          }
          
          // 4. Expired guests
          const { count: expiredGuests } = await supabase
            .from('guests')
            .select('*', { count: 'exact', head: true })
            .eq('resort_id', resort.id)
            .lt('check_out_date', today);
          
          if ((expiredGuests ?? 0) > 5) {
            items.push({
              id: `expired-guests-${resort.id}`,
              severity: 'P2',
              title: 'Expired guest stays',
              description: `${expiredGuests} guests past checkout`,
              resort: resort.name,
              resortId: resort.id,
              category: 'data',
              triggeredAt: new Date(),
              fixAction: { label: 'Review Guests', type: 'navigate', target: `/guests` }
            });
          }
        } catch (error) {
          console.error(`Error for resort ${resort.id}:`, error);
        }
      }
      
      // Platform-wide checks
      const oneHourAgo = subHours(new Date(), 1).toISOString();
      const { count: recentErrors } = await supabase
        .from('platform_errors')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneHourAgo);
      
      if ((recentErrors ?? 0) > 10) {
        items.push({
          id: 'error-spike-global',
          severity: 'P0',
          title: 'Error spike detected',
          description: `${recentErrors} errors in the last hour`,
          category: 'error',
          triggeredAt: new Date(),
          fixAction: { label: 'Investigate', type: 'navigate', target: '/superadmin?mode=investigate' }
        });
      }
      
      // Sort by severity
      const severityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
      const sorted = items.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
      
      return filterSeverity ? sorted.filter(item => item.severity === filterSeverity) : sorted;
    },
    refetchInterval: 60000,
    enabled: resorts.length > 0,
  });
}
