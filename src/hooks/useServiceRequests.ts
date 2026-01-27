import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isBefore, parseISO } from 'date-fns';
import { useDebouncedCallback } from './useDebouncedCallback';

export interface ServiceRequestItem {
  id: string;
  catalog_id: string | null;
  title: string;
  quantity: number;
}

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
  submission_id?: string | null;
  items?: ServiceRequestItem[];
}

export type ServiceRequestWithItems = ServiceRequest & {
  items?: ServiceRequestItem[];
};

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
      const requests = ((data || []) as unknown[]).map((r: any) => ({
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
        submission_id: r.submission_id || null,
      })) as ServiceRequest[];

      // Fetch items for requests that have submission_id (multi-item requests)
      const requestsWithSubmissions = requests.filter((r) => r.submission_id);
      if (requestsWithSubmissions.length > 0) {
        const requestIds = requestsWithSubmissions.map((r) => r.id);
        const { data: itemsData } = await supabase
          .from('service_request_items')
          .select('request_id, id, catalog_id, title, quantity')
          .in('request_id', requestIds);

        if (itemsData) {
          const itemsByRequest = new Map<string, ServiceRequestItem[]>();
          itemsData.forEach((item) => {
            const existing = itemsByRequest.get(item.request_id) || [];
            existing.push({
              id: item.id,
              catalog_id: item.catalog_id,
              title: item.title,
              quantity: item.quantity,
            });
            itemsByRequest.set(item.request_id, existing);
          });

          requests.forEach((r) => {
            if (itemsByRequest.has(r.id)) {
              r.items = itemsByRequest.get(r.id);
            }
          });
        }
      }

      return requests;
    },
    enabled: enabled && !!guestId && !!resortId,
    staleTime: 30000,
  });

  // Debounced invalidation for realtime updates
  const debouncedInvalidate = useDebouncedCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, 500);

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
          // Use debounced invalidation to prevent rapid refetches
          debouncedInvalidate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, guestId, resortId, debouncedInvalidate]);

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

export interface CreateServiceRequestParams {
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
 * Validate scheduled time is not in the past
 */
export function validateScheduledTime(requestedForAt: string | undefined, isAsap: boolean): string | null {
  if (isAsap || !requestedForAt) return null;
  
  const scheduled = parseISO(requestedForAt);
  const now = new Date();
  
  // Add 5 minute buffer
  now.setMinutes(now.getMinutes() - 5);
  
  if (isBefore(scheduled, now)) {
    return 'Scheduled time cannot be in the past. Please select a future time.';
  }
  
  return null;
}

/**
 * Hook for service request mutations with optimistic UI
 */
export function useServiceRequestMutations(guestId: string, resortId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['guest-service-requests', resortId, guestId];
  
  // Track pending mutations to prevent double-submit
  const pendingMutations = useRef(new Set<string>());

  const createMutation = useMutation({
    mutationFn: async (params: CreateServiceRequestParams) => {
      // Validate scheduled time
      const validationError = validateScheduledTime(params.requestedForAt, params.isAsap ?? true);
      if (validationError) {
        throw new Error(validationError);
      }
      
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
    onMutate: async (params: CreateServiceRequestParams) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });
      
      // Snapshot previous state
      const previous = queryClient.getQueryData<ServiceRequest[]>(queryKey);
      
      // Create optimistic request
      const optimisticRequest: ServiceRequest = {
        id: `optimistic-${Date.now()}`,
        title: params.title,
        notes: params.notes || null,
        quantity: params.quantity || 1,
        is_asap: params.isAsap ?? true,
        requested_for_at: params.requestedForAt || null,
        department_key: params.departmentKey,
        category: params.category || null,
        priority: 'NORMAL',
        status: 'NEW',
        created_at: new Date().toISOString(),
        acknowledged_at: null,
        completed_at: null,
        cancelled_at: null,
      };
      
      // Optimistically update the cache
      queryClient.setQueryData<ServiceRequest[]>(queryKey, (old) => 
        [optimisticRequest, ...(old || [])]
      );
      
      return { previous, optimisticId: optimisticRequest.id };
    },
    onSuccess: (_, __, context) => {
      toast.success('Your request has been submitted!', {
        description: "We'll get to it as soon as possible.",
      });
      // Invalidate guest queries
      queryClient.invalidateQueries({ queryKey });
      // Also invalidate staff dashboard for cross-portal sync
      queryClient.invalidateQueries({ queryKey: ['requests-dashboard', resortId] });
      queryClient.invalidateQueries({ queryKey: ['staff-requests', resortId] });
    },
    onError: (error: Error, _, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error('Failed to submit request', {
        description: error.message || 'Please try again.',
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (requestId: string) => {
      // Prevent double-cancel
      if (pendingMutations.current.has(requestId)) {
        throw new Error('Cancel already in progress');
      }
      pendingMutations.current.add(requestId);
      
      try {
        const { data, error } = await supabase.rpc('guest_cancel_service_request', {
          p_guest_id: guestId,
          p_request_id: requestId,
          p_resort_id: resortId,
        });

        if (error) throw error;
        if (!data) throw new Error('Failed to cancel request - it may have already been processed');
        return data;
      } finally {
        pendingMutations.current.delete(requestId);
      }
    },
    onMutate: async (requestId: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ServiceRequest[]>(queryKey);
      
      // Optimistic update
      queryClient.setQueryData<ServiceRequest[]>(queryKey, (old) =>
        old?.map((r) => (r.id === requestId ? { 
          ...r, 
          status: 'CANCELLED' as const,
          cancelled_at: new Date().toISOString(),
        } : r))
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
      toast.error('Failed to cancel request', {
        description: error.message || 'Please try again.',
      });
    },
  });

  // Bundle mutation for multi-item requests
  const bundleMutation = useMutation({
    mutationFn: async (params: {
      items: Array<{ catalogId: string; quantity: number }>;
      isAsap: boolean;
      requestedForAt?: string;
      guestNotes?: string;
    }) => {
      // Validate scheduled time
      const validationError = validateScheduledTime(params.requestedForAt, params.isAsap);
      if (validationError) {
        throw new Error(validationError);
      }

      const payload = {
        room_number: null,
        is_asap: params.isAsap,
        requested_for_at: params.requestedForAt || null,
        guest_notes: params.guestNotes || null,
        items: params.items.map((item) => ({
          catalog_id: item.catalogId,
          quantity: item.quantity,
        })),
      };

      const { data, error } = await supabase.rpc('create_service_request_bundle', {
        payload,
      });

      if (error) throw error;
      return data as { submission_id: string; request_ids: string[]; split_by_department: boolean };
    },
    onSuccess: (data) => {
      const itemCount = data.request_ids?.length || 1;
      toast.success(
        itemCount > 1 
          ? `Requests submitted to ${itemCount} departments!`
          : 'Your request has been submitted!',
        {
          description: "We'll get to it as soon as possible.",
        }
      );
      // Invalidate guest queries
      queryClient.invalidateQueries({ queryKey });
      // Also invalidate staff dashboard for cross-portal sync
      queryClient.invalidateQueries({ queryKey: ['requests-dashboard', resortId] });
      queryClient.invalidateQueries({ queryKey: ['staff-requests', resortId] });
    },
    onError: (error: Error) => {
      toast.error('Failed to submit request', {
        description: error.message || 'Please try again.',
      });
    },
  });

  return {
    createRequest: createMutation.mutateAsync,
    createBundle: bundleMutation.mutateAsync,
    cancelRequest: cancelMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isCreatingBundle: bundleMutation.isPending,
    isCancelling: cancelMutation.isPending,
  };
}
