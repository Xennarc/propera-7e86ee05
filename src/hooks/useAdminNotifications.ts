import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AdminNotification {
  id: string;
  user_id: string;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  link_url: string | null;
  resort_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  resort_name?: string;
}

export function useAdminNotifications(
  resorts: { id: string; name: string }[] = []
) {
  return useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async (): Promise<AdminNotification[]> => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return [];

      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []).map(n => ({
        ...n,
        severity: n.severity as AdminNotification['severity'],
        resort_name: n.resort_id 
          ? resorts.find(r => r.id === n.resort_id)?.name || 'Unknown Resort'
          : null,
      }));
    },
    refetchInterval: 30000,
  });
}

export function useUnreadAdminNotificationCount() {
  return useQuery({
    queryKey: ['admin-notifications-unread-count'],
    queryFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return 0;

      const { count, error } = await supabase
        .from('admin_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });
}

export function useMarkAdminNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-unread-count'] });
    },
  });
}

export function useMarkAllAdminNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return;

      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-unread-count'] });
      toast.success('All notifications marked as read');
    },
  });
}
