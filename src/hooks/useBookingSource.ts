import { useAuth } from '@/contexts/AuthContext';
import { BookingSource } from '@/types/database';

export function useBookingSource(): BookingSource {
  const { roles, profile } = useAuth();
  
  // Determine source based on user's department/role
  if (roles.includes('ACTIVITIES') || profile?.department === 'DIVE') {
    return 'STAFF_DIVE';
  }
  if (roles.includes('FNB') || profile?.department === 'FNB') {
    return 'STAFF_FNB';
  }
  
  // Default to front desk
  return 'STAFF_FRONT_DESK';
}
