import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { ResortRole } from '@/types/database';

export type ModuleAccess = 'full' | 'read' | 'none';

interface PermissionResult {
  // User state
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  hasAnyResortAccess: boolean;
  currentResortRole: ResortRole | null;
  
  // Module access for current resort
  canAccessGuests: ModuleAccess;
  canAccessActivities: ModuleAccess;
  canAccessRestaurants: ModuleAccess;
  canAccessReports: ModuleAccess;
  canAccessSettings: boolean;
  canAccessGuestRequests: boolean;
  
  // Actions for current resort
  canManageResortStaff: boolean;
  canManageResorts: boolean;
  canManagePlatformUsers: boolean;
  canManageResources: boolean;
}

// Define which roles have what access
const MODULE_ACCESS: Record<ResortRole | 'SUPER_ADMIN', {
  guests: ModuleAccess;
  activities: ModuleAccess;
  restaurants: ModuleAccess;
  reports: ModuleAccess;
  settings: boolean;
  guestRequests: boolean;
}> = {
  SUPER_ADMIN: {
    guests: 'full',
    activities: 'full',
    restaurants: 'full',
    reports: 'full',
    settings: true,
    guestRequests: true,
  },
  RESORT_ADMIN: {
    guests: 'full',
    activities: 'full',
    restaurants: 'full',
    reports: 'full',
    settings: true,
    guestRequests: true,
  },
  MANAGER: {
    guests: 'full',
    activities: 'read',
    restaurants: 'read',
    reports: 'full',
    settings: false,
    guestRequests: true,
  },
  FRONT_OFFICE: {
    guests: 'full',
    activities: 'full',
    restaurants: 'full',
    reports: 'read',
    settings: false,
    guestRequests: true,
  },
  RESERVATIONS: {
    guests: 'full',
    activities: 'read',
    restaurants: 'read',
    reports: 'read',
    settings: false,
    guestRequests: true,
  },
  ACTIVITIES: {
    guests: 'read',
    activities: 'full',
    restaurants: 'none',
    reports: 'read',
    settings: false,
    guestRequests: true, // Only activity requests
  },
  FNB: {
    guests: 'read',
    activities: 'none',
    restaurants: 'full',
    reports: 'read',
    settings: false,
    guestRequests: true, // Only restaurant requests
  },
};

export function usePermissions(): PermissionResult {
  const { user, isSuperAdmin, getResortRole, memberships } = useAuth();
  const { currentResort } = useResort();
  
  const isAuthenticated = !!user;
  const superAdmin = isSuperAdmin();
  const hasAnyResortAccess = superAdmin || memberships.length > 0;
  const currentResortRole = currentResort ? getResortRole(currentResort.id) : null;
  
  // Get access level based on role
  const roleKey = superAdmin ? 'SUPER_ADMIN' : currentResortRole;
  const access = roleKey ? MODULE_ACCESS[roleKey] : null;
  
  return {
    isAuthenticated,
    isSuperAdmin: superAdmin,
    hasAnyResortAccess,
    currentResortRole,
    
    canAccessGuests: access?.guests || 'none',
    canAccessActivities: access?.activities || 'none',
    canAccessRestaurants: access?.restaurants || 'none',
    canAccessReports: access?.reports || 'none',
    canAccessSettings: access?.settings || false,
    canAccessGuestRequests: access?.guestRequests || false,
    
    canManageResortStaff: superAdmin || currentResortRole === 'RESORT_ADMIN',
    canManageResorts: superAdmin,
    canManagePlatformUsers: superAdmin,
    canManageResources: superAdmin || currentResortRole === 'RESORT_ADMIN',
  };
}

// Helper to check if user has at least read access to a module
export function hasAccess(access: ModuleAccess): boolean {
  return access !== 'none';
}

// Helper to check if user has write access to a module
export function hasWriteAccess(access: ModuleAccess): boolean {
  return access === 'full';
}
