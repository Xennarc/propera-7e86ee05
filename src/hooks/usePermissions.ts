import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { useEffectivePermissions } from '@/hooks/useEffectivePermissions';
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
  
  // Permission-based access (from RBAC)
  hasPermission: (key: string) => boolean;
  hasAnyPermission: (keys: string[]) => boolean;
  hasAllPermissions: (keys: string[]) => boolean;
  permissions: string[];
  permissionsLoading: boolean;
}

// Define which roles have what access (for backwards compatibility)
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
  const {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoading: permissionsLoading,
    isSuperAdmin: effectiveSuperAdmin,
  } = useEffectivePermissions();
  
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
    
    // Permission-based access
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions,
    permissionsLoading,
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

/**
 * Permission key constants for use with hasPermission
 */
export const PERMISSIONS = {
  // Guests
  GUESTS_VIEW: 'guests.view',
  GUESTS_CREATE: 'guests.create',
  GUESTS_EDIT: 'guests.edit',
  GUESTS_DELETE: 'guests.delete',
  
  // Activities
  ACTIVITIES_VIEW: 'activities.view',
  ACTIVITIES_CREATE: 'activities.create',
  ACTIVITIES_EDIT: 'activities.edit',
  ACTIVITIES_DELETE: 'activities.delete',
  SESSIONS_VIEW: 'sessions.view',
  SESSIONS_CREATE: 'sessions.create',
  SESSIONS_EDIT: 'sessions.edit',
  SESSIONS_CANCEL: 'sessions.cancel',
  
  // Bookings
  ACTIVITY_BOOKINGS_VIEW: 'bookings.activity.view',
  ACTIVITY_BOOKINGS_CREATE: 'bookings.activity.create',
  ACTIVITY_BOOKINGS_EDIT: 'bookings.activity.edit',
  ACTIVITY_BOOKINGS_CANCEL: 'bookings.activity.cancel',
  
  // Restaurants
  RESTAURANTS_VIEW: 'restaurants.view',
  RESTAURANTS_CREATE: 'restaurants.create',
  RESTAURANTS_EDIT: 'restaurants.edit',
  RESTAURANTS_DELETE: 'restaurants.delete',
  SLOTS_VIEW: 'slots.view',
  SLOTS_CREATE: 'slots.create',
  SLOTS_EDIT: 'slots.edit',
  SLOTS_CANCEL: 'slots.cancel',
  
  // Reservations
  RESTAURANT_RESERVATIONS_VIEW: 'bookings.restaurant.view',
  RESTAURANT_RESERVATIONS_CREATE: 'bookings.restaurant.create',
  RESTAURANT_RESERVATIONS_EDIT: 'bookings.restaurant.edit',
  RESTAURANT_RESERVATIONS_CANCEL: 'bookings.restaurant.cancel',
  
  // Access Management
  ACCESS_VIEW: 'access.view',
  ACCESS_USERS_VIEW: 'access.users.view',
  ACCESS_USERS_INVITE: 'access.users.invite',
  ACCESS_USERS_EDIT: 'access.users.edit',
  ACCESS_USERS_REMOVE: 'access.users.remove',
  ACCESS_USERS_ASSIGN_SUPERADMIN: 'access.users.assign_superadmin',
  
  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',
  
  // Billing
  BILLING_VIEW: 'billing.view',
  BILLING_MANAGE: 'billing.manage',
  
  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',
} as const;
