import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/query-keys';
import { toast } from 'sonner';

// Types
export type PreferenceCategory = 'room' | 'dining' | 'activity' | 'general';
export type PreferencePriority = 1 | 2 | 3;
export type PreferenceSource = 'staff' | 'prearrival' | 'system';

export interface StaffGuestPreference {
  id: string;
  category: PreferenceCategory;
  value: string;
  priority: PreferencePriority;
  source: PreferenceSource;
  createdAt: string;
}

export interface StaffPreferencesGrouped {
  room: StaffGuestPreference[];
  dining: StaffGuestPreference[];
  activity: StaffGuestPreference[];
  general: StaffGuestPreference[];
}

interface UseStaffGuestPreferencesOptions {
  guestId: string;
  resortId: string;
  enabled?: boolean;
}

// Predefined suggestions for quick add
export const PREFERENCE_SUGGESTIONS: Record<PreferenceCategory, string[]> = {
  room: [
    'High Floor',
    'Low Floor', 
    'Near Elevator',
    'Quiet Room',
    'Extra Pillows',
    'Hypoallergenic Bedding',
    'Extra Towels',
    'King Bed',
    'Twin Beds',
  ],
  dining: [
    'Vegetarian',
    'Vegan',
    'Gluten-Free',
    'Halal',
    'Kosher',
    'No Shellfish',
    'No Nuts',
    'Window Seat',
    'Private Table',
    'Early Seating',
  ],
  activity: [
    'Prefers Morning',
    'Prefers Afternoon',
    'Prefers Private',
    'Group Activities OK',
    'No Strenuous Activities',
    'Water Activities',
    'Land Activities',
  ],
  general: [
    'Early Check-in',
    'Late Check-out',
    'Celebration',
    'Honeymoon',
    'Anniversary',
    'Birthday',
    'VIP Treatment',
    'Privacy Preferred',
  ],
};

export const CATEGORY_LABELS: Record<PreferenceCategory, string> = {
  room: 'Room',
  dining: 'Dining',
  activity: 'Activity',
  general: 'General',
};

export function useStaffGuestPreferences({
  guestId,
  resortId,
  enabled = true,
}: UseStaffGuestPreferencesOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = queryKeys.preferences.staffPreferences(resortId, guestId);

  // Fetch preferences
  const {
    data: rawPreferences = [],
    isLoading,
    error,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guest_preferences')
        .select('*')
        .eq('guest_id', guestId)
        .eq('resort_id', resortId)
        .order('category')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: enabled && !!guestId && !!resortId && !!user,
  });

  // Transform to grouped structure
  const preferences: StaffPreferencesGrouped = {
    room: [],
    dining: [],
    activity: [],
    general: [],
  };

  rawPreferences.forEach((pref) => {
    const category = pref.category as PreferenceCategory;
    if (preferences[category]) {
      preferences[category].push({
        id: pref.id,
        category,
        value: pref.value,
        priority: pref.priority as PreferencePriority,
        source: pref.source as PreferenceSource,
        createdAt: pref.created_at,
      });
    }
  });

  const hasPreferences = rawPreferences.length > 0;

  // Add preference mutation
  const addMutation = useMutation({
    mutationFn: async ({
      category,
      value,
      priority = 1,
    }: {
      category: PreferenceCategory;
      value: string;
      priority?: PreferencePriority;
    }) => {
      const { data, error } = await supabase
        .from('guest_preferences')
        .insert({
          guest_id: guestId,
          resort_id: resortId,
          category,
          value: value.trim(),
          priority,
          source: 'staff',
          created_by_user_id: user?.id,
        })
        .select()
        .single();

      if (error) {
        // Handle duplicate constraint
        if (error.code === '23505') {
          throw new Error('This preference already exists');
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Preference added');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to add preference');
    },
  });

  // Remove preference mutation
  const removeMutation = useMutation({
    mutationFn: async (preferenceId: string) => {
      const { error } = await supabase
        .from('guest_preferences')
        .delete()
        .eq('id', preferenceId)
        .eq('resort_id', resortId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Preference removed');
    },
    onError: () => {
      toast.error('Failed to remove preference');
    },
  });

  return {
    preferences,
    hasPreferences,
    isLoading,
    error,
    addPreference: addMutation.mutateAsync,
    removePreference: removeMutation.mutateAsync,
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
}
