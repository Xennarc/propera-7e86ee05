import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { EffectivePermission, Permission, Role, UserResortRole, UserPermissionOverride } from '@/types/rbac';

interface UseEffectivePermissionsResult {
  permissions: string[];
  permissionDetails: EffectivePermission[];
  hasPermission: (key: string) => boolean;
  hasAnyPermission: (keys: string[]) => boolean;
  hasAllPermissions: (keys: string[]) => boolean;
  isLoading: boolean;
  isSuperAdmin: boolean;
}

export function useEffectivePermissions(): UseEffectivePermissionsResult {
  const { user, isSuperAdmin: checkSuperAdmin } = useAuth();
  const { currentResort } = useResort();
  const superAdmin = checkSuperAdmin();

  const { data: permissionDetails = [], isLoading } = useQuery({
    queryKey: ['effective-permissions', user?.id, currentResort?.id],
    queryFn: async () => {
      if (!user?.id || !currentResort?.id) return [];
      
      // Super admins get all permissions
      if (superAdmin) {
        const { data: allPerms } = await supabase
          .from('permissions')
          .select('key');
        return (allPerms || []).map(p => ({
          permission_key: p.key,
          source: 'super_admin' as const
        }));
      }

      // Get effective permissions from the function
      const { data, error } = await supabase
        .rpc('get_user_effective_permissions', {
          p_user_id: user.id,
          p_resort_id: currentResort.id
        });

      if (error) {
        console.error('Error fetching effective permissions:', error);
        return [];
      }

      return (data || []) as EffectivePermission[];
    },
    enabled: !!user?.id && !!currentResort?.id,
    staleTime: 30000, // 30 seconds
  });

  const permissions = permissionDetails.map(p => p.permission_key);

  const hasPermission = (key: string): boolean => {
    if (superAdmin) return true;
    return permissions.includes(key);
  };

  const hasAnyPermission = (keys: string[]): boolean => {
    if (superAdmin) return true;
    return keys.some(key => permissions.includes(key));
  };

  const hasAllPermissions = (keys: string[]): boolean => {
    if (superAdmin) return true;
    return keys.every(key => permissions.includes(key));
  };

  return {
    permissions,
    permissionDetails,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoading,
    isSuperAdmin: superAdmin,
  };
}

// Hook to get all permissions catalog
export function usePermissionsCatalog() {
  return useQuery({
    queryKey: ['permissions-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('category')
        .order('label');

      if (error) throw error;
      return data as Permission[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to get available roles (global + resort-specific)
export function useRoles(resortId?: string) {
  return useQuery({
    queryKey: ['roles', resortId],
    queryFn: async () => {
      let query = supabase
        .from('roles')
        .select('*')
        .order('is_system_role', { ascending: false })
        .order('name');

      if (resortId) {
        query = query.or(`resort_id.is.null,resort_id.eq.${resortId}`);
      } else {
        query = query.is('resort_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Role[];
    },
    enabled: true,
  });
}

// Hook to get role permissions
export function useRolePermissions(roleId?: string) {
  return useQuery({
    queryKey: ['role-permissions', roleId],
    queryFn: async () => {
      if (!roleId) return [];

      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_key')
        .eq('role_id', roleId);

      if (error) throw error;
      return data.map(rp => rp.permission_key);
    },
    enabled: !!roleId,
  });
}

// Hook to get user's assigned roles in a resort
export function useUserRoles(userId?: string, resortId?: string) {
  return useQuery({
    queryKey: ['user-roles', userId, resortId],
    queryFn: async () => {
      if (!userId || !resortId) return [];

      const { data, error } = await supabase
        .from('user_resort_roles')
        .select(`
          *,
          role:roles(*)
        `)
        .eq('user_id', userId)
        .eq('resort_id', resortId);

      if (error) throw error;
      return data as (UserResortRole & { role: Role })[];
    },
    enabled: !!userId && !!resortId,
  });
}

// Hook to get user's permission overrides
export function useUserOverrides(userId?: string, resortId?: string) {
  return useQuery({
    queryKey: ['user-overrides', userId, resortId],
    queryFn: async () => {
      if (!userId || !resortId) return [];

      const { data, error } = await supabase
        .from('user_permission_overrides')
        .select('*')
        .eq('user_id', userId)
        .eq('resort_id', resortId);

      if (error) throw error;
      return data as UserPermissionOverride[];
    },
    enabled: !!userId && !!resortId,
  });
}

// Hook to get access audit log for a user
export function useUserAccessAudit(userId?: string, resortId?: string, limit = 20) {
  return useQuery({
    queryKey: ['user-access-audit', userId, resortId, limit],
    queryFn: async () => {
      if (!userId || !resortId) return [];

      const { data, error } = await supabase
        .from('access_audit_log')
        .select(`
          *,
          actor:profiles!access_audit_log_actor_user_id_fkey(full_name, username),
          target:profiles!access_audit_log_target_user_id_fkey(full_name, username)
        `)
        .eq('target_user_id', userId)
        .eq('resort_id', resortId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        // If the join fails, try without it
        const { data: simpleData, error: simpleError } = await supabase
          .from('access_audit_log')
          .select('*')
          .eq('target_user_id', userId)
          .eq('resort_id', resortId)
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (simpleError) throw simpleError;
        return simpleData;
      }
      return data;
    },
    enabled: !!userId && !!resortId,
  });
}
