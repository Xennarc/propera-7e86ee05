import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ResortSettings {
  id: string;
  resort_id: string;
  activities_enabled: boolean;
  dining_enabled: boolean;
  prearrival_enabled: boolean;
  loyalty_enabled: boolean;
  guest_booking_enabled: boolean;
  branding_version: number;
  seo_version: number;
  updated_at: string;
  updated_by: string | null;
}

export type ResortSettingKey = 
  | 'activities_enabled'
  | 'dining_enabled'
  | 'prearrival_enabled'
  | 'loyalty_enabled'
  | 'guest_booking_enabled'
  | 'branding_version'
  | 'seo_version';

export function useResortSettings(resortId: string | undefined) {
  return useQuery({
    queryKey: ['resort-settings', resortId],
    queryFn: async () => {
      if (!resortId) throw new Error('Resort ID required');
      
      const { data, error } = await supabase
        .from('resort_settings')
        .select('*')
        .eq('resort_id', resortId)
        .single();
      
      if (error) {
        // If no settings exist, return defaults
        if (error.code === 'PGRST116') {
          return {
            resort_id: resortId,
            activities_enabled: true,
            dining_enabled: true,
            prearrival_enabled: false,
            loyalty_enabled: false,
            guest_booking_enabled: true,
            branding_version: 1,
            seo_version: 1,
          } as ResortSettings;
        }
        throw error;
      }
      return data as ResortSettings;
    },
    enabled: !!resortId,
  });
}

interface UpdateSettingParams {
  resortId: string;
  key: ResortSettingKey;
  value: boolean | number;
  oldValue: boolean | number;
}

export function useUpdateResortSetting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ resortId, key, value, oldValue }: UpdateSettingParams) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (!userId) throw new Error('Not authenticated');
      
      // Update setting
      const { error } = await supabase
        .from('resort_settings')
        .update({ 
          [key]: value, 
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('resort_id', resortId);
      
      if (error) throw error;
      
      // Log to admin_audit_logs
      const requestId = crypto.randomUUID();
      await supabase.from('admin_audit_logs').insert({
        actor_id: userId,
        action: 'resort_setting_updated',
        resort_id: resortId,
        metadata_json: { 
          setting: key, 
          old_value: oldValue, 
          new_value: value,
          request_id: requestId
        }
      });
      
      // Log platform activity event
      await supabase.from('platform_activity_events').insert({
        event_type: 'setting_changed',
        target_type: 'resort',
        target_id: resortId,
        actor_user_id: userId,
        metadata: { setting: key, from: oldValue, to: value }
      });
      
      return { success: true };
    },
    onSuccess: (_, { resortId }) => {
      queryClient.invalidateQueries({ queryKey: ['resort-settings', resortId] });
      queryClient.invalidateQueries({ queryKey: ['resorts'] });
    },
    onError: (error) => {
      console.error('Failed to update resort setting:', error);
      toast.error('Failed to update setting');
    }
  });
}

// Hook for incrementing version numbers (branding, SEO)
export function useIncrementResortVersion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      resortId, 
      versionKey 
    }: { 
      resortId: string; 
      versionKey: 'branding_version' | 'seo_version';
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (!userId) throw new Error('Not authenticated');
      
      // Get current version
      const { data: current } = await supabase
        .from('resort_settings')
        .select(versionKey)
        .eq('resort_id', resortId)
        .single();
      
      const oldVersion = current?.[versionKey] ?? 1;
      const newVersion = oldVersion + 1;
      
      // Update version
      const { error } = await supabase
        .from('resort_settings')
        .update({ 
          [versionKey]: newVersion, 
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('resort_id', resortId);
      
      if (error) throw error;
      
      // Audit log
      await supabase.from('admin_audit_logs').insert({
        actor_id: userId,
        action: `${versionKey}_incremented`,
        resort_id: resortId,
        metadata_json: { 
          old_version: oldVersion, 
          new_version: newVersion,
          request_id: crypto.randomUUID()
        }
      });
      
      return { oldVersion, newVersion };
    },
    onSuccess: (_, { resortId }) => {
      queryClient.invalidateQueries({ queryKey: ['resort-settings', resortId] });
    }
  });
}
