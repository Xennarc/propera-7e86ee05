// Hook for guest notifications with realtime updates

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { useGuestRealtimeContext } from '@/contexts/GuestRealtimeContext';

// Debug flag for development
const DEBUG_REALTIME_DEPRECATION = false;

interface GuestNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export function useGuestNotifications() {
  const { guest } = useGuestAuth();
  const queryClient = useQueryClient();
  const guestId = guest?.guestId;
  
  // Check if unified realtime is active
  const unifiedContext = useGuestRealtimeContext();
  const skipLegacyChannel = unifiedContext?.unifiedActive ?? false;

  // Set up realtime subscription (skipped if unified realtime is active)
  useEffect(() => {
    if (!guestId) return;
    
    // Skip legacy channel if unified realtime is handling it
    if (skipLegacyChannel) {
      if (DEBUG_REALTIME_DEPRECATION) {
        console.debug('[useGuestNotifications] Skipping legacy channel - unified realtime active');
      }
      return;
    }

    const channel = supabase
      .channel(`guest-notifications-${guestId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `guest_id=eq.${guestId}`,
        },
        () => {
          // Invalidate queries to refetch on any change
          queryClient.invalidateQueries({ queryKey: ['guest-notifications', guestId] });
          queryClient.invalidateQueries({ queryKey: ['guest-notifications-count', guestId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [guestId, queryClient, skipLegacyChannel]);

  // Fetch notifications
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['guest-notifications', guestId],
    queryFn: async () => {
      if (!guestId) return [];
      
      const { data, error } = await supabase.rpc('guest_get_notifications', {
        p_guest_id: guestId,
      });

      if (error) throw error;
      return (data as unknown as GuestNotification[]) || [];
    },
    enabled: !!guestId,
    staleTime: Infinity, // Don't refetch automatically, rely on realtime
  });

  // Unread count query
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['guest-notifications-count', guestId],
    queryFn: async () => {
      if (!guestId) return 0;
      
      const { data, error } = await supabase.rpc('guest_get_unread_notification_count', {
        p_guest_id: guestId,
      });

      if (error) throw error;
      return data as number;
    },
    enabled: !!guestId,
    staleTime: Infinity, // Don't refetch automatically, rely on realtime
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!guestId) return;
      
      const { error } = await supabase.rpc('guest_mark_notification_read', {
        p_guest_id: guestId,
        p_notification_id: notificationId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-notifications', guestId] });
      queryClient.invalidateQueries({ queryKey: ['guest-notifications-count', guestId] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!guestId) return;
      
      const { error } = await supabase.rpc('guest_mark_all_notifications_read', {
        p_guest_id: guestId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-notifications', guestId] });
      queryClient.invalidateQueries({ queryKey: ['guest-notifications-count', guestId] });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingRead: markAsReadMutation.isPending,
    isMarkingAllRead: markAllAsReadMutation.isPending,
  };
}
