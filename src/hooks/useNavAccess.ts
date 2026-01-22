import { useTierAccess } from '@/hooks/useTierAccess';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { TierFeature } from '@/lib/tier-features';
import { ResortRole } from '@/types/database';

/**
 * Combined hook for navigation access control
 * Checks both role-based and tier-based access
 * Demo resorts bypass tier restrictions to enable full product showcase
 */
export function useNavAccess() {
  const { isSuperAdmin, getResortRole } = useAuth();
  const { currentResort } = useResort();
  const { hasFeature } = useTierAccess();

  const isDemo = currentResort?.is_demo === true;
  const currentRole = currentResort ? getResortRole(currentResort.id) : null;

  /**
   * Check if user can see a navigation item
   * Combines role-based and tier-based access
   * Demo resorts bypass tier restrictions
   */
  const canViewNavItem = (
    roles?: ResortRole[] | null,
    tierFeature?: TierFeature
  ): boolean => {
    // Super admins see everything
    if (isSuperAdmin()) return true;

    // Check role access first
    if (roles && roles.length > 0) {
      if (!currentRole || !roles.includes(currentRole)) {
        return false;
      }
    }

    // Check tier access (skip for demo resorts)
    if (tierFeature && !isDemo) {
      if (!hasFeature(tierFeature)) {
        return false;
      }
    }

    return true;
  };

  return {
    canViewNavItem,
    isDemo,
    currentRole,
  };
}
