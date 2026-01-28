import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useResortScope } from './sync/useResortScope';
import { useAuth } from '@/contexts/AuthContext';

export type StaffRequestStatus = 'NEW' | 'ACKNOWLEDGED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type StaffRequestPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface StaffRequestItem {
  id: string;
  catalog_id: string | null;
  title: string;
  quantity: number;
}

export interface StaffServiceRequest {
  id: string;
  guest_id: string;
  guest_name: string;
  room_number: string;
  catalog_id: string | null;
  catalog_title: string | null;
  catalog_icon_key: string | null;
  title: string;
  notes: string | null;
  internal_notes: string | null;
  quantity: number;
  is_asap: boolean;
  requested_for_at: string | null;
  department_key: string;
  category: string | null;
  priority: StaffRequestPriority;
  status: StaffRequestStatus;
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_at: string;
  acknowledged_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  // Multi-item support
  submission_id: string | null;
  item_count: number;
  item_preview: string | null; // First 2-3 item titles for inbox preview
}

export interface RequestEvent {
  id: string;
  event_type: string;
  actor_type: 'GUEST' | 'STAFF' | 'SYSTEM';
  actor_user_id: string | null;
  actor_name: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface StaffRequestFilters {
  status?: StaffRequestStatus | 'all';
  departments?: string[];
  priority?: StaffRequestPriority | 'all';
  assignedTo?: string | 'unassigned' | 'all';
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  includeArchived?: boolean;
  hasMultipleItems?: boolean;
}

interface UseStaffServiceRequestsOptions {
  filters?: StaffRequestFilters;
  enabled?: boolean;
}

/**
 * Hook for fetching staff service requests with filtering and live sync
 */
export function useStaffServiceRequests({ filters = {}, enabled = true }: UseStaffServiceRequestsOptions = {}) {
  const queryClient = useQueryClient();
  const { resortId, userId, isStaff } = useResortScope();
  const queryKey = ['staff-service-requests', resortId, filters];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!resortId) return [];

      // Fetch from the service_requests table
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

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Map to our interface with multi-item support
      let mappedData = (data || []).map((r: any) => {
        const items = r.items || [];
        const itemCount = items.length;
        
        // Build item preview (first 2 titles)
        let itemPreview: string | null = null;
        if (itemCount > 0) {
          const previewTitles = items.slice(0, 2).map((i: any) => i.title);
          if (itemCount > 2) {
            itemPreview = `${previewTitles.join(' • ')} …`;
          } else {
            itemPreview = previewTitles.join(' • ');
          }
        }

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
          submission_id: r.submission_id,
          item_count: itemCount,
          item_preview: itemPreview,
        };
      }) as StaffServiceRequest[];

      // Apply client-side filter for multiple items
      if (filters.hasMultipleItems) {
        mappedData = mappedData.filter((r) => r.item_count > 1);
      }

      return mappedData;
    },
    enabled: enabled && !!resortId && isStaff,
    staleTime: 2000, // Short stale time for aggressive updates
    refetchInterval: 5000, // Poll every 5 seconds as fallback
    refetchIntervalInBackground: false,
  });

  // Real-time subscription for service_requests
  useEffect(() => {
    if (!enabled || !resortId || !isStaff) return;

    const channel = supabase
      .channel(`staff-service-requests-${resortId}`)
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
          queryClient.invalidateQueries({ queryKey: ['staff-service-requests'] });
          // Also invalidate dashboard so both views stay in sync
          queryClient.invalidateQueries({ queryKey: ['requests-dashboard', resortId] });
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[StaffServiceRequests] Realtime channel error, relying on polling fallback');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, resortId, isStaff, queryClient]);

  // Apply client-side search filter
  const filteredData = useMemo(() => {
    if (!data || !filters.search) return data || [];
    const searchLower = filters.search.toLowerCase();
    return data.filter(
      (r) =>
        r.title.toLowerCase().includes(searchLower) ||
        r.guest_name.toLowerCase().includes(searchLower) ||
        r.room_number.toLowerCase().includes(searchLower)
    );
  }, [data, filters.search]);

  return {
    requests: filteredData,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for fetching request items (line items for multi-item requests)
 */
export function useRequestItems(requestId: string, enabled = true) {
  return useQuery({
    queryKey: ['request-items', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_request_items')
        .select('id, catalog_id, title, quantity')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        catalog_id: item.catalog_id,
        title: item.title,
        quantity: item.quantity,
      })) as StaffRequestItem[];
    },
    enabled: enabled && !!requestId,
    staleTime: 60000,
  });
}

/**
 * Hook for fetching request events (timeline)
 */
export function useRequestEvents(requestId: string, enabled = true) {
  const { resortId } = useResortScope();

  return useQuery({
    queryKey: ['request-events', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_request_events')
        .select(`
          id,
          event_type,
          actor_type,
          actor_user_id,
          notes,
          metadata,
          created_at,
          actor:profiles!service_request_events_actor_user_id_fkey(full_name)
        `)
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((e: any) => ({
        id: e.id,
        event_type: e.event_type,
        actor_type: e.actor_type,
        actor_user_id: e.actor_user_id,
        actor_name: e.actor?.full_name || null,
        notes: e.notes,
        metadata: e.metadata,
        created_at: e.created_at,
      })) as RequestEvent[];
    },
    enabled: enabled && !!requestId && !!resortId,
    staleTime: 30000,
  });
}

/**
 * Hook for staff department memberships (for filtering and assignment)
 */
export function useStaffDepartmentMembers(resortId: string, departmentKey?: string) {
  return useQuery({
    queryKey: ['department-members', resortId, departmentKey],
    queryFn: async () => {
      let query = supabase
        .from('department_memberships')
        .select(`
          id,
          user_id,
          department_key,
          dept_role,
          profile:profiles!department_memberships_user_id_fkey(id, full_name, username)
        `)
        .eq('resort_id', resortId);

      if (departmentKey) {
        query = query.eq('department_key', departmentKey);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        department_key: m.department_key,
        dept_role: m.dept_role as 'LINE' | 'SUPERVISOR' | 'MANAGER',
        name: m.profile?.full_name || m.profile?.username || 'Unknown',
      }));
    },
    enabled: !!resortId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for staff request mutations
 */
export function useStaffRequestMutations() {
  const queryClient = useQueryClient();
  const { resortId, userId } = useResortScope();

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

      // Log event
      await supabase.from('service_request_events').insert({
        request_id: requestId,
        resort_id: resortId,
        event_type: 'ACKNOWLEDGED',
        actor_type: 'STAFF',
        actor_user_id: userId,
      });
    },
    onSuccess: () => {
      toast.success('Request acknowledged');
      queryClient.invalidateQueries({ queryKey: ['staff-service-requests'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to acknowledge request');
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ requestId, assignTo }: { requestId: string; assignTo: string | null }) => {
      const updates: Record<string, unknown> = {
        assigned_to: assignTo,
        status: assignTo ? 'ASSIGNED' : 'NEW',
      };

      const { error } = await supabase
        .from('service_requests')
        .update(updates)
        .eq('id', requestId)
        .eq('resort_id', resortId);

      if (error) throw error;

      // Log event
      await supabase.from('service_request_events').insert({
        request_id: requestId,
        resort_id: resortId,
        event_type: assignTo ? 'ASSIGNED' : 'UNASSIGNED',
        actor_type: 'STAFF',
        actor_user_id: userId,
        metadata: assignTo ? { assigned_to: assignTo } : null,
      });
    },
    onSuccess: (_, { assignTo }) => {
      toast.success(assignTo ? 'Request assigned' : 'Assignment removed');
      queryClient.invalidateQueries({ queryKey: ['staff-service-requests'] });
      queryClient.invalidateQueries({ queryKey: ['request-events'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to assign request');
    },
  });

  const startMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('service_requests')
        .update({ status: 'IN_PROGRESS' })
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
    onSuccess: () => {
      toast.success('Request started');
      queryClient.invalidateQueries({ queryKey: ['staff-service-requests'] });
      queryClient.invalidateQueries({ queryKey: ['request-events'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to start request');
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
    onSuccess: () => {
      toast.success('Request completed');
      queryClient.invalidateQueries({ queryKey: ['staff-service-requests'] });
      queryClient.invalidateQueries({ queryKey: ['request-events'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to complete request');
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: async ({ requestId, priority }: { requestId: string; priority: StaffRequestPriority }) => {
      const { error } = await supabase
        .from('service_requests')
        .update({ priority })
        .eq('id', requestId)
        .eq('resort_id', resortId);

      if (error) throw error;

      await supabase.from('service_request_events').insert({
        request_id: requestId,
        resort_id: resortId,
        event_type: 'PRIORITY_CHANGED',
        actor_type: 'STAFF',
        actor_user_id: userId,
        metadata: { priority },
      });
    },
    onSuccess: () => {
      toast.success('Priority updated');
      queryClient.invalidateQueries({ queryKey: ['staff-service-requests'] });
      queryClient.invalidateQueries({ queryKey: ['request-events'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update priority');
    },
  });

  const addInternalNoteMutation = useMutation({
    mutationFn: async ({ requestId, note }: { requestId: string; note: string }) => {
      // Append to internal notes
      const { data: current, error: fetchError } = await supabase
        .from('service_requests')
        .select('internal_notes')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      const existingNotes = current?.internal_notes || '';
      const timestamp = new Date().toISOString();
      const newNote = `[${timestamp}] ${note}`;
      const updatedNotes = existingNotes ? `${existingNotes}\n${newNote}` : newNote;

      const { error } = await supabase
        .from('service_requests')
        .update({ internal_notes: updatedNotes })
        .eq('id', requestId)
        .eq('resort_id', resortId);

      if (error) throw error;

      await supabase.from('service_request_events').insert({
        request_id: requestId,
        resort_id: resortId,
        event_type: 'INTERNAL_NOTE_ADDED',
        actor_type: 'STAFF',
        actor_user_id: userId,
        notes: note,
      });
    },
    onSuccess: () => {
      toast.success('Note added');
      queryClient.invalidateQueries({ queryKey: ['staff-service-requests'] });
      queryClient.invalidateQueries({ queryKey: ['request-events'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to add note');
    },
  });

  return {
    acknowledge: acknowledgeMutation.mutateAsync,
    assign: assignMutation.mutateAsync,
    start: startMutation.mutateAsync,
    complete: completeMutation.mutateAsync,
    updatePriority: updatePriorityMutation.mutateAsync,
    addInternalNote: addInternalNoteMutation.mutateAsync,
    isAcknowledging: acknowledgeMutation.isPending,
    isAssigning: assignMutation.isPending,
    isStarting: startMutation.isPending,
    isCompleting: completeMutation.isPending,
    isUpdatingPriority: updatePriorityMutation.isPending,
    isAddingNote: addInternalNoteMutation.isPending,
  };
}

/**
 * Hook for checking staff request permissions
 */
export function useStaffRequestPermissions() {
  const { user, isSuperAdmin, getResortRole } = useAuth();
  const { resortId, resortRole } = useResortScope();

  // Query department memberships for the current user
  const { data: deptMemberships } = useQuery({
    queryKey: ['my-department-memberships', resortId, user?.id],
    queryFn: async () => {
      if (!resortId || !user?.id) return [];

      const { data, error } = await supabase
        .from('department_memberships')
        .select('department_key, dept_role')
        .eq('resort_id', resortId)
        .eq('user_id', user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!resortId && !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const superAdmin = isSuperAdmin();
  const isResortAdmin = resortRole === 'RESORT_ADMIN';
  const isManager = resortRole === 'MANAGER';

  // Get all departments user has access to
  const accessibleDepartments = useMemo(() => {
    if (superAdmin || isResortAdmin || isManager) {
      // These roles can see all departments
      return null; // null means all
    }
    return deptMemberships?.map((m) => m.department_key) || [];
  }, [superAdmin, isResortAdmin, isManager, deptMemberships]);

  // Get highest department role
  const highestDeptRole = useMemo(() => {
    if (!deptMemberships?.length) return null;
    if (deptMemberships.some((m) => m.dept_role === 'MANAGER')) return 'MANAGER';
    if (deptMemberships.some((m) => m.dept_role === 'SUPERVISOR')) return 'SUPERVISOR';
    return 'LINE';
  }, [deptMemberships]);

  const canViewAllDepartments = superAdmin || isResortAdmin || isManager;
  const canAssign = superAdmin || isResortAdmin || isManager || highestDeptRole === 'MANAGER';
  const canManage = superAdmin || isResortAdmin || isManager || ['MANAGER', 'SUPERVISOR'].includes(highestDeptRole || '');
  const canViewArchived = superAdmin || isResortAdmin || isManager;
  const canChangePriority = superAdmin || isResortAdmin || isManager || highestDeptRole === 'MANAGER';

  return {
    accessibleDepartments,
    canViewAllDepartments,
    canAssign,
    canManage,
    canViewArchived,
    canChangePriority,
    highestDeptRole,
    deptMemberships: deptMemberships || [],
  };
}
