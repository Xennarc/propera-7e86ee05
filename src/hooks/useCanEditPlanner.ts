/**
 * useCanEditPlanner
 *
 * Determines whether the current user can access planner editing controls.
 * Requires ALL of:
 *   1. enable_activities_ops flag ON
 *   2. ops_planner_edit_v1 flag ON
 *   3. User is Super Admin, Resort Admin, or Department Manager
 *   4. User has department module access for 'resources_shifts'
 *
 * Returns { canEdit, loading } for gating UI.
 */

import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { useDepartment } from '@/contexts/DepartmentContext';
import { useFeatureFlagAccessSafe } from '@/providers/FeatureFlagsProvider';

export function useCanEditPlanner(): { canEdit: boolean; loading: boolean } {
  const { isSuperAdmin, getResortRole } = useAuth();
  const { currentResort } = useResort();
  const { isManager, hasModule } = useDepartment();
  const flagContext = useFeatureFlagAccessSafe();

  // While flags are loading, block editing (safe default)
  if (!flagContext || flagContext.loading) {
    return { canEdit: false, loading: true };
  }

  const superAdmin = isSuperAdmin();

  // Super Admins bypass flag checks
  if (superAdmin) {
    return { canEdit: true, loading: false };
  }

  // Check both flags
  const opsEnabled = flagContext.isEnabledEffective('enable_activities_ops');
  const plannerEditEnabled = flagContext.isEnabledEffective('ops_planner_edit_v1');

  if (!opsEnabled || !plannerEditEnabled) {
    return { canEdit: false, loading: false };
  }

  // Role check: Resort Admin or Department Manager
  const resortRole = currentResort ? getResortRole(currentResort.id) : null;
  const isResortAdmin = resortRole === 'RESORT_ADMIN';
  const hasRole = isResortAdmin || isManager;

  if (!hasRole) {
    return { canEdit: false, loading: false };
  }

  // Module access check
  const hasShiftsModule = hasModule('resources_shifts');

  return { canEdit: hasShiftsModule, loading: false };
}
