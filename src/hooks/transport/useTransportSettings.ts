import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ServiceHours {
  [day: string]: {
    open: string;
    close: string;
    enabled?: boolean;
  };
}

export interface TransportSettings {
  id: string;
  resort_id: string;
  service_enabled: boolean;
  guest_booking_enabled: boolean;
  service_hours: ServiceHours;
  pooling_enabled: boolean;
  pooling_window_minutes: number;
  max_stops_per_trip: number;
  max_pickup_detour_meters: number;
  max_wait_minutes: number;
  max_party_size: number;
  location_required: boolean;
  gps_throttle_seconds: number;
  presence_interval_seconds: number;
  notify_guest_on_assigned: boolean;
  notify_guest_on_driver_en_route: boolean;
  notify_guest_on_arrived: boolean;
  notify_guest_eta_minutes: number;
  created_at: string;
  updated_at: string;
}

export type TransportSettingsInput = Partial<Omit<TransportSettings, 'id' | 'resort_id' | 'created_at' | 'updated_at'>>;

const DEFAULT_SETTINGS: TransportSettingsInput = {
  service_enabled: true,
  guest_booking_enabled: true,
  service_hours: {},
  pooling_enabled: true,
  pooling_window_minutes: 10,
  max_stops_per_trip: 6,
  max_pickup_detour_meters: 500,
  max_wait_minutes: 15,
  max_party_size: 6,
  location_required: false,
  gps_throttle_seconds: 5,
  presence_interval_seconds: 30,
  notify_guest_on_assigned: true,
  notify_guest_on_driver_en_route: true,
  notify_guest_on_arrived: true,
  notify_guest_eta_minutes: 5,
};

async function fetchTransportSettings(resortId: string): Promise<TransportSettings> {
  // Use raw query since types aren't generated yet for new table
  const { data, error } = await supabase
    .from('transport_settings' as 'access_audit_log')
    .select('*')
    .eq('resort_id', resortId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching transport settings:', error);
    throw error;
  }

  // If no settings exist, return defaults with resort_id
  if (!data) {
    return {
      ...DEFAULT_SETTINGS,
      id: '',
      resort_id: resortId,
      created_at: '',
      updated_at: '',
    } as TransportSettings;
  }

  const row = data as unknown as Record<string, unknown>;
  return {
    id: row.id as string,
    resort_id: row.resort_id as string,
    service_enabled: row.service_enabled as boolean,
    guest_booking_enabled: row.guest_booking_enabled as boolean,
    service_hours: (row.service_hours as ServiceHours) || {},
    pooling_enabled: row.pooling_enabled as boolean,
    pooling_window_minutes: row.pooling_window_minutes as number,
    max_stops_per_trip: row.max_stops_per_trip as number,
    max_pickup_detour_meters: row.max_pickup_detour_meters as number,
    max_wait_minutes: row.max_wait_minutes as number,
    max_party_size: row.max_party_size as number,
    location_required: row.location_required as boolean,
    gps_throttle_seconds: row.gps_throttle_seconds as number,
    presence_interval_seconds: row.presence_interval_seconds as number,
    notify_guest_on_assigned: row.notify_guest_on_assigned as boolean,
    notify_guest_on_driver_en_route: row.notify_guest_on_driver_en_route as boolean,
    notify_guest_on_arrived: row.notify_guest_on_arrived as boolean,
    notify_guest_eta_minutes: row.notify_guest_eta_minutes as number,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function useTransportSettings(resortId: string | undefined) {
  return useQuery({
    queryKey: ['transport-settings', resortId],
    queryFn: () => fetchTransportSettings(resortId!),
    enabled: !!resortId,
    staleTime: 30_000,
  });
}

export function useUpdateTransportSettings(resortId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: TransportSettingsInput) => {
      if (!resortId) throw new Error('No resort selected');

      // Use type assertion since RPC isn't in generated types yet
      const { data, error } = await (supabase.rpc as Function)(
        'upsert_transport_settings_atomic',
        {
          p_resort_id: resortId,
          p_settings: settings,
        }
      );

      if (error) {
        console.error('Error updating transport settings:', error);
        throw error;
      }

      const result = data as { ok: boolean; error?: string; settings?: TransportSettings };
      
      if (!result.ok) {
        throw new Error(result.error || 'Failed to save settings');
      }

      return result.settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-settings', resortId] });
      toast.success('Transport settings saved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save settings');
    },
  });
}

export function useResetTransportSettings(resortId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!resortId) throw new Error('No resort selected');

      const { data, error } = await (supabase.rpc as Function)(
        'upsert_transport_settings_atomic',
        {
          p_resort_id: resortId,
          p_settings: DEFAULT_SETTINGS,
        }
      );

      if (error) throw error;

      const result = data as { ok: boolean; error?: string; settings?: TransportSettings };
      if (!result.ok) throw new Error(result.error || 'Failed to reset settings');

      return result.settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-settings', resortId] });
      toast.success('Settings reset to defaults');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reset settings');
    },
  });
}

export { DEFAULT_SETTINGS as DEFAULT_TRANSPORT_SETTINGS };
