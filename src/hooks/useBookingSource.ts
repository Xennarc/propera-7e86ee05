import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { BookingSource } from '@/types/database';

export function useBookingSource(): BookingSource {
  const { profile, getResortRole } = useAuth();
  const { currentResort } = useResort();
  
  const resortRole = currentResort ? getResortRole(currentResort.id) : null;
  
  // Determine source based on resort role or department
  if (resortRole === 'ACTIVITIES' || profile?.department === 'DIVE') {
    return 'STAFF_DIVE';
  }
  if (resortRole === 'FNB' || profile?.department === 'FNB') {
    return 'STAFF_FNB';
  }
  
  // Default to front desk
  return 'STAFF_FRONT_DESK';
}
