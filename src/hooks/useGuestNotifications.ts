// Hook for guest notifications

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGuestAuth } from '@/contexts/GuestAuthContext';

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
    refetchInterval: 30000, // Poll every 30 seconds
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
    refetchInterval: 30000,
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
