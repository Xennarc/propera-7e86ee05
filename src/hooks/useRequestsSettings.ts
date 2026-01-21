import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface RetentionPolicy {
  id: string;
  resort_id: string;
  default_archive_after_days: number;
  default_delete_after_days: number;
  department_visibility_policy: 'ASSIGNED_ONLY' | 'DEPARTMENT_QUEUE';
}

export interface DepartmentRetentionOverride {
  id: string;
  resort_id: string;
  department_key: string;
  archive_after_days: number | null;
  delete_after_days: number | null;
}

export interface Department {
  id: string;
  resort_id: string;
  key: string;
  name: string;
  is_active: boolean;
}

export interface CatalogItem {
  id: string;
  resort_id: string | null;
  code: string;
  title: string;
  category: string;
  department_key: string;
  icon_key: string | null;
  is_active: boolean;
  is_billable: boolean;
  default_priority: string;
}

// ==================== RETENTION POLICY ====================

export function useRetentionPolicy(resortId: string) {
  return useQuery({
    queryKey: ['retention-policy', resortId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resort_retention_policies')
        .select('*')
        .eq('resort_id', resortId)
        .maybeSingle();

      if (error) throw error;
      return data as RetentionPolicy | null;
    },
    enabled: !!resortId,
  });
}

export function useRetentionPolicyMutation(resortId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<RetentionPolicy>) => {
      const { data: existing } = await supabase
        .from('resort_retention_policies')
        .select('id')
        .eq('resort_id', resortId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('resort_retention_policies')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('resort_id', resortId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('resort_retention_policies')
          .insert({
            resort_id: resortId,
            default_archive_after_days: updates.default_archive_after_days ?? 30,
            default_delete_after_days: updates.default_delete_after_days ?? 365,
            department_visibility_policy: updates.department_visibility_policy ?? 'ASSIGNED_ONLY',
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retention-policy', resortId] });
    },
  });
}

// ==================== DEPARTMENT RETENTION OVERRIDES ====================

export function useDepartmentRetentionOverrides(resortId: string) {
  return useQuery({
    queryKey: ['department-retention-overrides', resortId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('department_retention_overrides')
        .select('*')
        .eq('resort_id', resortId)
        .order('department_key');

      if (error) throw error;
      return (data || []) as DepartmentRetentionOverride[];
    },
    enabled: !!resortId,
  });
}

export function useDepartmentRetentionOverrideMutations(resortId: string) {
  const queryClient = useQueryClient();

  const upsert = useMutation({
    mutationFn: async (override: Omit<DepartmentRetentionOverride, 'id'>) => {
      const { data: existing } = await supabase
        .from('department_retention_overrides')
        .select('id')
        .eq('resort_id', resortId)
        .eq('department_key', override.department_key)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('department_retention_overrides')
          .update({
            archive_after_days: override.archive_after_days,
            delete_after_days: override.delete_after_days,
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('department_retention_overrides')
          .insert({
            resort_id: resortId,
            department_key: override.department_key,
            archive_after_days: override.archive_after_days,
            delete_after_days: override.delete_after_days,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-retention-overrides', resortId] });
    },
  });

  const remove = useMutation({
    mutationFn: async (departmentKey: string) => {
      const { error } = await supabase
        .from('department_retention_overrides')
        .delete()
        .eq('resort_id', resortId)
        .eq('department_key', departmentKey);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-retention-overrides', resortId] });
    },
  });

  return { upsert, remove };
}

// ==================== DEPARTMENTS ====================

export function useDepartments(resortId: string) {
  return useQuery({
    queryKey: ['departments', resortId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('resort_id', resortId)
        .order('name');

      if (error) throw error;
      return (data || []) as Department[];
    },
    enabled: !!resortId,
  });
}

export function useDepartmentMutations(resortId: string) {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: async (dept: { key: string; name: string }) => {
      const { error } = await supabase
        .from('departments')
        .insert({
          resort_id: resortId,
          key: dept.key.toUpperCase().replace(/\s+/g, '_'),
          name: dept.name,
          is_active: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments', resortId] });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Department> }) => {
      const { error } = await supabase
        .from('departments')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments', resortId] });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('departments')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments', resortId] });
    },
  });

  return { create, update, toggleActive };
}

// ==================== REQUEST CATALOG ====================

export function useRequestCatalogItems(resortId: string) {
  return useQuery({
    queryKey: ['request-catalog-admin', resortId],
    queryFn: async () => {
      // Get all items: global (resort_id IS NULL) + resort-specific
      const { data, error } = await supabase
        .from('request_catalog')
        .select('*')
        .or(`resort_id.is.null,resort_id.eq.${resortId}`)
        .order('category')
        .order('title');

      if (error) throw error;
      return (data || []) as CatalogItem[];
    },
    enabled: !!resortId,
  });
}

export function useRequestCatalogMutations(resortId: string) {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: async (item: Omit<CatalogItem, 'id' | 'resort_id'>) => {
      const { error } = await supabase
        .from('request_catalog')
        .insert({
          ...item,
          resort_id: resortId,
          code: item.code || `CUSTOM_${Date.now()}`,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request-catalog-admin', resortId] });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CatalogItem> }) => {
      const { error } = await supabase
        .from('request_catalog')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request-catalog-admin', resortId] });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('request_catalog')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request-catalog-admin', resortId] });
    },
  });

  return { create, update, toggleActive };
}
