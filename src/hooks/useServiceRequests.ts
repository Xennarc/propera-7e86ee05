import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ServiceRequest {
  id: string;
  title: string;
  notes: string | null;
  quantity: number;
  is_asap: boolean;
  requested_for_at: string | null;
  department_key: string;
  category: string | null;
  priority: string;
  status: 'NEW' | 'ACKNOWLEDGED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  acknowledged_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  catalog_icon_key?: string | null;
}

export interface CatalogItem {
  id: string;
  code: string;
  title: string;
  category: string;
  department_key: string;
  icon_key: string | null;
  is_billable: boolean;
  default_priority: string;
}

interface UseGuestServiceRequestsOptions {
  guestId: string;
  resortId: string;
  enabled?: boolean;
}

/**
 * Hook for fetching guest's service requests with live sync
 */
export function useGuestServiceRequests({ guestId, resortId, enabled = true }: UseGuestServiceRequestsOptions) {
  const queryClient = useQueryClient();
  const queryKey = ['guest-service-requests', resortId, guestId];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('guest_get_service_requests', {
        p_guest_id: guestId,
        p_resort_id: resortId,
      });

      if (error) throw error;
      // Map the RPC response to our interface
      return ((data || []) as unknown[]).map((r: any) => ({
        id: r.id,
        title: r.title,
        notes: r.notes,
        quantity: r.quantity,
        is_asap: r.is_asap,
        requested_for_at: r.requested_for_at,
        department_key: r.department_key,
        category: r.category,
        priority: r.priority,
        status: r.status,
        created_at: r.created_at,
        acknowledged_at: r.acknowledged_at,
        completed_at: r.completed_at,
        cancelled_at: r.cancelled_at,
        catalog_icon_key: r.catalog_icon_key,
      })) as ServiceRequest[];
    },
    enabled: enabled && !!guestId && !!resortId,
    staleTime: 30000,
  });

  // Real-time subscription
  useEffect(() => {
    if (!enabled || !guestId || !resortId) return;

    const channel = supabase
      .channel(`guest-service-requests-${guestId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_requests',
          filter: `guest_id=eq.${guestId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, guestId, resortId, queryClient, queryKey]);

  return {
    requests: data || [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for fetching request catalog
 */
export function useRequestCatalog(resortId: string, enabled = true) {
  return useQuery({
    queryKey: ['request-catalog', resortId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('guest_get_request_catalog', {
        p_resort_id: resortId,
      });

      if (error) throw error;
      return (data || []) as CatalogItem[];
    },
    enabled: enabled && !!resortId,
    staleTime: 5 * 60 * 1000, // Cache catalog for 5 minutes
  });
}

interface CreateServiceRequestParams {
  guestId: string;
  resortId: string;
  catalogId?: string;
  title: string;
  notes?: string;
  quantity?: number;
  isAsap?: boolean;
  requestedForAt?: string;
  departmentKey: string;
  category?: string;
}

/**
 * Hook for service request mutations
 */
export function useServiceRequestMutations(guestId: string, resortId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['guest-service-requests', resortId, guestId];

  const createMutation = useMutation({
    mutationFn: async (params: CreateServiceRequestParams) => {
      const { data, error } = await supabase.rpc('guest_create_service_request', {
        p_guest_id: params.guestId,
        p_resort_id: params.resortId,
        p_catalog_id: params.catalogId || null,
        p_title: params.title,
        p_notes: params.notes || null,
        p_quantity: params.quantity || 1,
        p_is_asap: params.isAsap ?? true,
        p_requested_for_at: params.requestedForAt || null,
        p_department_key: params.departmentKey,
        p_category: params.category || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Your request has been submitted!');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit request');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.rpc('guest_cancel_service_request', {
        p_guest_id: guestId,
        p_request_id: requestId,
        p_resort_id: resortId,
      });

      if (error) throw error;
      if (!data) throw new Error('Failed to cancel request');
      return data;
    },
    onMutate: async (requestId: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ServiceRequest[]>(queryKey);
      
      // Optimistic update
      queryClient.setQueryData<ServiceRequest[]>(queryKey, (old) =>
        old?.map((r) => (r.id === requestId ? { ...r, status: 'CANCELLED' as const } : r))
      );
      
      return { previous };
    },
    onSuccess: () => {
      toast.success('Request cancelled');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error(error.message || 'Failed to cancel request');
    },
  });

  return {
    createRequest: createMutation.mutateAsync,
    cancelRequest: cancelMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isCancelling: cancelMutation.isPending,
  };
}
