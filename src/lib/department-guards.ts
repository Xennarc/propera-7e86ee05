/**
 * Department Guard Utilities
 *
 * Shared imperative guard helpers that wrap DepartmentContext.
 * Use these for programmatic checks in hooks/handlers.
 * For route-level guards, continue using <DepartmentGuard />.
 */

import { useDepartment } from '@/contexts/DepartmentContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCanEditPlanner } from '@/hooks/useCanEditPlanner';
import type { DepartmentModuleKey } from '@/types/database';

export interface DepartmentGuardResult {
  allowed: boolean;
  reason: string | null;
  loading: boolean;
}

/**
 * Check if the current user has membership in the active department.
 */
export function useDepartmentMembershipGuard(): DepartmentGuardResult {
  const { currentDepartment, currentMembership, loading } = useDepartment();
  const { isSuperAdmin } = useAuth();

  if (loading) return { allowed: false, reason: null, loading: true };
  if (isSuperAdmin()) return { allowed: true, reason: null, loading: false };
  if (!currentDepartment || !currentMembership) {
    return { allowed: false, reason: 'No membership in this department', loading: false };
  }
  return { allowed: true, reason: null, loading: false };
}

/**
 * Check if the current user has access to a specific module in the active department.
 */
export function useDepartmentModuleGuard(moduleKey: DepartmentModuleKey): DepartmentGuardResult {
  const membership = useDepartmentMembershipGuard();
  const { hasModule, loading } = useDepartment();

  if (membership.loading || loading) return { allowed: false, reason: null, loading: true };
  if (!membership.allowed) return membership;
  if (!hasModule(moduleKey)) {
    return { allowed: false, reason: `Missing module: ${moduleKey.replace(/_/g, ' ')}`, loading: false };
  }
  return { allowed: true, reason: null, loading: false };
}

/**
 * Check if the current user can use planner editing controls.
 * Combines: flag check + role check + module access check.
 */
export function usePlannerEditGuard(): DepartmentGuardResult {
  const membership = useDepartmentMembershipGuard();
  const { canEdit, loading } = useCanEditPlanner();

  if (membership.loading || loading) return { allowed: false, reason: null, loading: true };
  if (!membership.allowed) return membership;
  if (!canEdit) {
    return { allowed: false, reason: 'Planner editing not available', loading: false };
  }
  return { allowed: true, reason: null, loading: false };
}
