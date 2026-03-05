/**
 * Hook that wraps the module permission config with live effective-permissions
 * data to provide module-level access state for the current user.
 */
import { useMemo } from 'react';
import { useEffectivePermissions, usePermissionsCatalog, useUserOverrides } from '@/hooks/useEffectivePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import {
  PERMISSION_MODULES,
  MODULE_CATEGORIES,
  ModuleConfig,
  ModuleCategory,
  getEffectiveModuleAccess,
  isModuleInheritedOrCustomized,
  getVisibleModules,
  getUncategorizedPermissions,
  canAdminGrantModule,
} from '@/config/permission-modules';

export interface ModuleAccessState {
  module: ModuleConfig;
  access: 'full' | 'partial' | 'none';
  inheritance: 'inherited' | 'customized';
  canGrant: boolean;
}

export interface ModuleCategoryGroup {
  category: ModuleCategory;
  modules: ModuleAccessState[];
}

interface UseModulePermissionsResult {
  /** All module access states for the target user, filtered by acting admin visibility */
  modules: ModuleAccessState[];
  /** Modules grouped by category */
  groupedModules: ModuleCategoryGroup[];
  /** Uncategorized permission keys (not in any module) */
  uncategorizedKeys: string[];
  /** Get access level for a specific module */
  getModuleAccess: (moduleId: string) => 'full' | 'partial' | 'none';
  /** Whether data is still loading */
  isLoading: boolean;
  /** Whether acting user can manage permissions (Edit Access gate) */
  canManagePermissions: boolean;
}

/**
 * @param targetUserId   – the user whose modules we're inspecting (optional,
 *                         defaults to acting user)
 * @param targetPermissions – pre-resolved permission keys for the target user
 *                            (pass when you already have them, e.g. from the
 *                            drawer's own queries)
 * @param overrideKeys   – permission keys that have user-level overrides
 */
export function useModulePermissions(
  targetPermissions?: string[],
  overrideKeys?: string[],
): UseModulePermissionsResult {
  const { isSuperAdmin } = useAuth();
  const superAdmin = isSuperAdmin();

  // Acting admin's own permissions (for grant eligibility)
  const { permissions: adminPermissions, hasPermission, isLoading: permLoading } = useEffectivePermissions();

  // All permission keys from the catalog (for uncategorized bucket)
  const { data: catalog = [], isLoading: catalogLoading } = usePermissionsCatalog();

  const canManagePermissions = superAdmin || hasPermission('access.permissions.manage');

  const effectiveTargetPerms = targetPermissions ?? adminPermissions;
  const effectiveOverrides = overrideKeys ?? [];

  const visibleModules = useMemo(
    () => getVisibleModules(superAdmin),
    [superAdmin],
  );

  const modules: ModuleAccessState[] = useMemo(() => {
    return visibleModules.map(mod => ({
      module: mod,
      access: getEffectiveModuleAccess(effectiveTargetPerms, mod.id),
      inheritance: isModuleInheritedOrCustomized(effectiveTargetPerms, effectiveOverrides, mod.id),
      canGrant: canAdminGrantModule(superAdmin, adminPermissions, mod.id),
    }));
  }, [visibleModules, effectiveTargetPerms, effectiveOverrides, superAdmin, adminPermissions]);

  const groupedModules: ModuleCategoryGroup[] = useMemo(() => {
    return MODULE_CATEGORIES
      .map(cat => ({
        category: cat,
        modules: modules.filter(m => m.module.category === cat),
      }))
      .filter(g => g.modules.length > 0);
  }, [modules]);

  const uncategorizedKeys = useMemo(() => {
    const allKeys = catalog.map(p => p.key);
    return getUncategorizedPermissions(allKeys);
  }, [catalog]);

  const getModuleAccess = (moduleId: string): 'full' | 'partial' | 'none' => {
    return getEffectiveModuleAccess(effectiveTargetPerms, moduleId);
  };

  return {
    modules,
    groupedModules,
    uncategorizedKeys,
    getModuleAccess,
    isLoading: permLoading || catalogLoading,
    canManagePermissions,
  };
}
