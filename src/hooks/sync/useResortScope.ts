import { useResort } from '@/contexts/ResortContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestAuth } from '@/contexts/GuestAuthContext';

/**
 * Returns the current resort scope for queries and subscriptions.
 * Works for both staff and guest contexts.
 */
export function useResortScope() {
  const { currentResort } = useResort();
  const { user, roles } = useAuth();
  
  return {
    resortId: currentResort?.id,
    userId: user?.id,
    roles,
    isStaff: !!user,
    resort: currentResort,
  };
}

/**
 * Returns the current guest scope for queries and subscriptions.
 * Only works in guest context.
 */
export function useGuestScope() {
  const { guest } = useGuestAuth();
  
  return {
    resortId: guest?.resortId,
    guestId: guest?.guestId,
    roomNumber: guest?.roomNumber,
    isGuest: !!guest,
    guest,
  };
}
