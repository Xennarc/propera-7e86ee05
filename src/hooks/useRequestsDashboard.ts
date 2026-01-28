import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useResortScope } from './sync/useResortScope';
import type { StaffServiceRequest, StaffRequestStatus, StaffRequestPriority, StaffRequestFilters } from './useStaffServiceRequests';
import { calculateSLAStatus, SLAStatus } from '@/lib/request-sla-config';

export type RequestWithSLA = StaffServiceRequest & {
  slaStatus: SLAStatus | null;
};

export interface DashboardCounts {
  new: number;
  acknowledged: number;
  inProgress: number;
  completed: number;
  urgent: number;
  overdue: number;
}

interface UseRequestsDashboardOptions {
  filters?: StaffRequestFilters;
  enabled?: boolean;
}

/**
 * Optimized hook for the Requests Dashboard with aggressive real-time updates
 */
export function useRequestsDashboard({ filters = {}, enabled = true }: UseRequestsDashboardOptions = {}) {
  const queryClient = useQueryClient();
  const { resortId, userId, isStaff } = useResortScope();
  const queryKey = ['requests-dashboard', resortId, filters];
  const lastSyncedRef = useRef<Date>(new Date());
  const previousCountRef = useRef<number>(0);

  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!resortId) return [];

      let query = supabase
        .from('service_requests')
        .select(`
          id,
          guest_id,
          catalog_id,
          title,
          notes,
          internal_notes,
          quantity,
          is_asap,
          requested_for_at,
          department_key,
          category,
          priority,
          status,
          assigned_to,
          created_at,
          acknowledged_at,
          completed_at,
          cancelled_at,
          updated_at,
          submission_id,
          guest:guests!service_requests_guest_id_fkey(full_name, room_number),
          catalog:request_catalog(title, icon_key),
          assignee:profiles!service_requests_assigned_to_fkey(full_name),
          items:service_request_items(id, catalog_id, title, quantity)
        `)
        .eq('resort_id', resortId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.departments && filters.departments.length > 0) {
        query = query.in('department_key', filters.departments);
      }

      if (filters.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }

      if (filters.assignedTo && filters.assignedTo !== 'all') {
        if (filters.assignedTo === 'unassigned') {
          query = query.is('assigned_to', null);
        } else {
          query = query.eq('assigned_to', filters.assignedTo);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      lastSyncedRef.current = new Date();

      // Map to our interface with SLA calculations
      return (data || []).map((r: any) => {
        const items = r.items || [];
        const itemCount = items.length;

        let itemPreview: string | null = null;
        if (itemCount > 0) {
          const previewTitles = items.slice(0, 2).map((i: any) => i.title);
          if (itemCount > 2) {
            itemPreview = `${previewTitles.join(' • ')} …`;
          } else {
            itemPreview = previewTitles.join(' • ');
          }
        }

        const slaStatus = calculateSLAStatus(r.created_at, r.priority, r.status);

        return {
          id: r.id,
          guest_id: r.guest_id,
          guest_name: r.guest?.full_name || 'Unknown',
          room_number: r.guest?.room_number || '',
          catalog_id: r.catalog_id,
          catalog_title: r.catalog?.title || null,
          catalog_icon_key: r.catalog?.icon_key || null,
          title: r.title,
          notes: r.notes,
          internal_notes: r.internal_notes,
          quantity: r.quantity,
          is_asap: r.is_asap,
          requested_for_at: r.requested_for_at,
          department_key: r.department_key,
          category: r.category,
          priority: r.priority,
          status: r.status,
          assigned_to: r.assigned_to,
          assigned_to_name: r.assignee?.full_name || null,
          created_at: r.created_at,
          acknowledged_at: r.acknowledged_at,
          completed_at: r.completed_at,
          cancelled_at: r.cancelled_at,
          updated_at: r.updated_at,
          submission_id: r.submission_id,
          item_count: itemCount,
          item_preview: itemPreview,
          slaStatus,
        } as RequestWithSLA;
      });
    },
    enabled: enabled && !!resortId && isStaff,
    staleTime: 2000, // Consider stale after 2 seconds for aggressive updates
    refetchInterval: 5000, // Poll every 5 seconds
    refetchIntervalInBackground: false,
  });

  // Real-time subscription for instant updates
  useEffect(() => {
    if (!enabled || !resortId || !isStaff) return;

    const channel = supabase
      .channel(`requests-dashboard-realtime-${resortId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_requests',
          filter: `resort_id=eq.${resortId}`,
        },
        () => {
          // Broad invalidation to cover all filter variants
          queryClient.invalidateQueries({ queryKey: ['requests-dashboard'] });
          // Also invalidate inbox so both views stay in sync
          queryClient.invalidateQueries({ queryKey: ['staff-service-requests'] });
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[RequestsDashboard] Realtime channel error, relying on polling fallback');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, resortId, isStaff, queryClient]);

  // Compute counts
  const counts = useMemo<DashboardCounts>(() => {
    const requests = data || [];
    return {
      new: requests.filter((r) => r.status === 'NEW').length,
      acknowledged: requests.filter((r) => r.status === 'ACKNOWLEDGED' || r.status === 'ASSIGNED').length,
      inProgress: requests.filter((r) => r.status === 'IN_PROGRESS').length,
      completed: requests.filter((r) => r.status === 'COMPLETED').length,
      urgent: requests.filter((r) => r.priority === 'URGENT' && r.status !== 'COMPLETED' && r.status !== 'CANCELLED').length,
      overdue: requests.filter((r) => r.slaStatus?.isOverdue).length,
    };
  }, [data]);

  // Check for new requests (for notifications)
  const hasNewRequests = useMemo(() => {
    const currentNewCount = counts.new;
    const hadNew = previousCountRef.current < currentNewCount;
    previousCountRef.current = currentNewCount;
    return hadNew;
  }, [counts.new]);

  // Filter by status lane
  const getRequestsByStatus = useCallback((statuses: StaffRequestStatus[]) => {
    return (data || []).filter((r) => statuses.includes(r.status as StaffRequestStatus));
  }, [data]);

  // Mutations
  const acknowledgeMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('service_requests')
        .update({
          status: 'ACKNOWLEDGED',
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('resort_id', resortId);

      if (error) throw error;

      await supabase.from('service_request_events').insert({
        request_id: requestId,
        resort_id: resortId,
        event_type: 'ACKNOWLEDGED',
        actor_type: 'STAFF',
        actor_user_id: userId,
      });
    },
    onMutate: async (requestId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<RequestWithSLA[]>(queryKey);
      
      queryClient.setQueryData<RequestWithSLA[]>(queryKey, (old) =>
        old?.map((r) => r.id === requestId ? { ...r, status: 'ACKNOWLEDGED' as const, acknowledged_at: new Date().toISOString() } : r)
      );
      
      return { previous };
    },
    onSuccess: () => {
      toast.success('Request acknowledged');
    },
    onError: (err: Error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error(err.message || 'Failed to acknowledge request');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const startMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('service_requests')
        .update({
          status: 'IN_PROGRESS',
          assigned_to: userId,
        })
        .eq('id', requestId)
        .eq('resort_id', resortId);

      if (error) throw error;

      await supabase.from('service_request_events').insert({
        request_id: requestId,
        resort_id: resortId,
        event_type: 'STARTED',
        actor_type: 'STAFF',
        actor_user_id: userId,
      });
    },
    onMutate: async (requestId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<RequestWithSLA[]>(queryKey);
      
      queryClient.setQueryData<RequestWithSLA[]>(queryKey, (old) =>
        old?.map((r) => r.id === requestId ? { ...r, status: 'IN_PROGRESS' as const, assigned_to: userId } : r)
      );
      
      return { previous };
    },
    onSuccess: () => {
      toast.success('Request started');
    },
    onError: (err: Error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error(err.message || 'Failed to start request');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async ({ requestId, notes }: { requestId: string; notes?: string }) => {
      const { error } = await supabase
        .from('service_requests')
        .update({
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('resort_id', resortId);

      if (error) throw error;

      await supabase.from('service_request_events').insert({
        request_id: requestId,
        resort_id: resortId,
        event_type: 'COMPLETED',
        actor_type: 'STAFF',
        actor_user_id: userId,
        notes,
      });
    },
    onMutate: async ({ requestId }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<RequestWithSLA[]>(queryKey);
      
      queryClient.setQueryData<RequestWithSLA[]>(queryKey, (old) =>
        old?.map((r) => r.id === requestId ? { ...r, status: 'COMPLETED' as const, completed_at: new Date().toISOString() } : r)
      );
      
      return { previous };
    },
    onSuccess: () => {
      toast.success('Request completed');
    },
    onError: (err: Error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error(err.message || 'Failed to complete request');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const assignToMeMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('service_requests')
        .update({
          assigned_to: userId,
          status: 'ASSIGNED',
        })
        .eq('id', requestId)
        .eq('resort_id', resortId);

      if (error) throw error;

      await supabase.from('service_request_events').insert({
        request_id: requestId,
        resort_id: resortId,
        event_type: 'ASSIGNED',
        actor_type: 'STAFF',
        actor_user_id: userId,
        metadata: { assigned_to: userId },
      });
    },
    onSuccess: () => {
      toast.success('Request assigned to you');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to assign request');
    },
  });

  return {
    requests: data || [],
    counts,
    hasNewRequests,
    lastSyncedAt: lastSyncedRef.current,
    dataUpdatedAt,
    isLoading,
    error,
    refetch,
    getRequestsByStatus,
    mutations: {
      acknowledge: acknowledgeMutation.mutate,
      start: startMutation.mutate,
      complete: completeMutation.mutate,
      assignToMe: assignToMeMutation.mutate,
      isAcknowledging: acknowledgeMutation.isPending,
      isStarting: startMutation.isPending,
      isCompleting: completeMutation.isPending,
      isAssigning: assignToMeMutation.isPending,
    },
  };
}
