import { useLocation } from 'react-router-dom';
import { useResort } from '@/contexts/ResortContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { ResortRole } from '@/types/database';

export interface ResortScope {
  /** Current resort ID - undefined if not in a resort context */
  resortId: string | undefined;
  /** Current user ID */
  userId: string | undefined;
  /** Current resort's timezone (defaults to UTC) */
  timezone: string;
  /** Whether the scope is loading */
  isLoading: boolean;
  /** Source of the scope ('staff' | 'guest' | 'superadmin' | 'none') */
  scopeSource: 'staff' | 'guest' | 'superadmin' | 'none';
  /** Whether the current user is a super admin */
  isSuperAdmin: boolean;
  /** The full resort object (for staff) */
  resort: ReturnType<typeof useResort>['currentResort'];
  /** Whether this is a staff context */
  isStaff: boolean;
  /** Resort role from membership */
  resortRole: ResortRole | null;
}

/**
 * Returns the current resort scope for queries and subscriptions.
 * Works for both staff and guest contexts.
 * 
 * This is the single source of truth for multi-tenant scoping.
 */
export function useResortScope(): ResortScope {
  const { pathname } = useLocation();
  const resortContext = useResort();
  const guestAuth = useGuestAuth();
  const { user, profile, loading: authLoading, getResortRole } = useAuth();
  
  const isSuperAdmin = profile?.global_role === 'SUPER_ADMIN';
  
  // Route-aware context detection to prevent session collisions
  const isStaffRoute = pathname.startsWith('/staff');
  const isGuestRoute = pathname.startsWith('/guest');
  
  // On staff routes: prioritize staff context if user is authenticated
  // This prevents guest localStorage sessions from blocking staff data
  if (isStaffRoute && user && resortContext.currentResort) {
    return {
      resortId: resortContext.currentResort.id,
      userId: user.id,
      timezone: resortContext.currentResort.timezone || 'UTC',
      isLoading: resortContext.loading,
      scopeSource: isSuperAdmin ? 'superadmin' : 'staff',
      isSuperAdmin,
      resort: resortContext.currentResort,
      isStaff: true,
      resortRole: getResortRole(resortContext.currentResort.id),
    };
  }
  
  // Guest portal context - only on guest routes or when not on staff routes
  if (guestAuth.guest && (isGuestRoute || !isStaffRoute)) {
    return {
      resortId: guestAuth.guest.resortId,
      userId: undefined,
      timezone: guestAuth.guest.resortTimezone || 'UTC',
      isLoading: false,
      scopeSource: 'guest',
      isSuperAdmin: false,
      resort: null,
      isStaff: false,
      resortRole: null,
    };
  }
  
  // Staff/Admin context
  if (resortContext.currentResort) {
    return {
      resortId: resortContext.currentResort.id,
      userId: user?.id,
      timezone: resortContext.currentResort.timezone || 'UTC',
      isLoading: resortContext.loading,
      scopeSource: isSuperAdmin ? 'superadmin' : 'staff',
      isSuperAdmin,
      resort: resortContext.currentResort,
      isStaff: !!user,
      resortRole: getResortRole(resortContext.currentResort.id),
    };
  }
  
  // No resort context
  return {
    resortId: undefined,
    userId: user?.id,
    timezone: 'UTC',
    isLoading: authLoading || resortContext.loading,
    scopeSource: 'none',
    isSuperAdmin,
    resort: null,
    isStaff: !!user,
    resortRole: null,
  };
}

export interface GuestScope {
  resortId: string | undefined;
  guestId: string | undefined;
  roomNumber: string | undefined;
  timezone: string;
  isGuest: boolean;
  guest: ReturnType<typeof useGuestAuth>['guest'];
}

/**
 * Returns the current guest scope for queries and subscriptions.
 * Only works in guest context.
 */
export function useGuestScope(): GuestScope {
  const { guest } = useGuestAuth();
  
  return {
    resortId: guest?.resortId,
    guestId: guest?.guestId,
    roomNumber: guest?.roomNumber,
    timezone: guest?.resortTimezone || 'UTC',
    isGuest: !!guest,
    guest,
  };
}

/**
 * Get resort ID for use in query keys
 * Returns 'no-resort' if not available (prevents cache collisions)
 */
export function useResortQueryKey(): string {
  const { resortId } = useResortScope();
  return resortId || 'no-resort';
}
