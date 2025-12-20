import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PermissionEffect } from '@/types/rbac';

// Assign a role to a user
export function useAssignRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, resortId, roleId }: { 
      userId: string; 
      resortId: string; 
      roleId: string;
    }) => {
      const { data, error } = await supabase
        .rpc('assign_user_role', {
          p_user_id: userId,
          p_resort_id: resortId,
          p_role_id: roleId
        });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', variables.userId, variables.resortId] });
      queryClient.invalidateQueries({ queryKey: ['effective-permissions', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-access-audit', variables.userId] });
      toast.success('Role assigned successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to assign role: ' + error.message);
    }
  });
}

// Remove a role from a user
export function useRemoveRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, resortId, roleId }: { 
      userId: string; 
      resortId: string; 
      roleId: string;
    }) => {
      const { data, error } = await supabase
        .rpc('remove_user_role', {
          p_user_id: userId,
          p_resort_id: resortId,
          p_role_id: roleId
        });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', variables.userId, variables.resortId] });
      queryClient.invalidateQueries({ queryKey: ['effective-permissions', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-access-audit', variables.userId] });
      toast.success('Role removed successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to remove role: ' + error.message);
    }
  });
}

// Set a permission override
export function useSetPermissionOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, resortId, permissionKey, effect }: { 
      userId: string; 
      resortId: string; 
      permissionKey: string;
      effect: PermissionEffect;
    }) => {
      const { data, error } = await supabase
        .rpc('set_permission_override', {
          p_user_id: userId,
          p_resort_id: resortId,
          p_permission_key: permissionKey,
          p_effect: effect
        });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to set override');
      }
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-overrides', variables.userId, variables.resortId] });
      queryClient.invalidateQueries({ queryKey: ['effective-permissions', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-access-audit', variables.userId] });
      toast.success(`Permission ${variables.effect === 'grant' ? 'granted' : 'revoked'}`);
    },
    onError: (error: Error) => {
      toast.error('Failed to set override: ' + error.message);
    }
  });
}

// Remove a permission override
export function useRemovePermissionOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, resortId, permissionKey }: { 
      userId: string; 
      resortId: string; 
      permissionKey: string;
    }) => {
      const { data, error } = await supabase
        .rpc('remove_permission_override', {
          p_user_id: userId,
          p_resort_id: resortId,
          p_permission_key: permissionKey
        });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-overrides', variables.userId, variables.resortId] });
      queryClient.invalidateQueries({ queryKey: ['effective-permissions', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-access-audit', variables.userId] });
      toast.success('Override removed');
    },
    onError: (error: Error) => {
      toast.error('Failed to remove override: ' + error.message);
    }
  });
}

// Log an access change manually (for actions not covered by functions)
export function useLogAccessChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ resortId, actionKey, targetUserId, details }: { 
      resortId: string; 
      actionKey: string;
      targetUserId?: string;
      details?: Record<string, string | number | boolean | null>;
    }) => {
      const { data, error } = await supabase
        .rpc('log_access_change', {
          p_resort_id: resortId,
          p_action_key: actionKey,
          p_target_user_id: targetUserId || null,
          p_details: details || {}
        });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      if (variables.targetUserId) {
        queryClient.invalidateQueries({ queryKey: ['user-access-audit', variables.targetUserId] });
      }
    }
  });
}
