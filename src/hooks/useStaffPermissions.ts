import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { ResortRole } from '@/types/database';

/**
 * Staff management permission helpers
 */
export function useStaffPermissions() {
  const { isSuperAdmin, getResortRole, memberships } = useAuth();
  const { currentResort } = useResort();

  const superAdmin = isSuperAdmin();
  const currentResortRole = currentResort ? getResortRole(currentResort.id) : null;

  /**
   * Check if current user can invite staff to a specific resort with a specific role
   */
  const canInviteStaff = (targetResortId: string, targetRole: ResortRole | 'SUPER_ADMIN'): boolean => {
    // SUPER_ADMIN can invite anyone anywhere
    if (superAdmin) return true;

    // SUPER_ADMIN role can only be assigned by SUPER_ADMIN
    if (targetRole === 'SUPER_ADMIN') return false;

    // Check if user is RESORT_ADMIN for target resort
    const membership = memberships.find(m => m.resort_id === targetResortId);
    if (membership?.resort_role === 'RESORT_ADMIN') return true;

    return false;
  };

  /**
   * Check if current user can create SUPER_ADMIN accounts
   */
  const canCreateSuperAdmin = (): boolean => {
    return superAdmin;
  };

  /**
   * Check if current user can manage staff for current resort
   */
  const canManageResortStaff = (): boolean => {
    if (superAdmin) return true;
    return currentResortRole === 'RESORT_ADMIN';
  };

  /**
   * Get available roles that the current user can assign
   */
  const getAvailableRoles = (includesSuperAdmin = false): (ResortRole | 'SUPER_ADMIN')[] => {
    const resortRoles: ResortRole[] = ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS', 'ACTIVITIES', 'FNB'];
    
    if (includesSuperAdmin && superAdmin) {
      return ['SUPER_ADMIN', ...resortRoles];
    }
    
    return resortRoles;
  };

  return {
    isSuperAdmin: superAdmin,
    currentResortRole,
    canInviteStaff,
    canCreateSuperAdmin,
    canManageResortStaff,
    getAvailableRoles,
  };
}
