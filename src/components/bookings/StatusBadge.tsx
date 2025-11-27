import { Badge } from '@/components/ui/badge';
import { BookingStatus, SessionStatus, SlotStatus } from '@/types/database';

interface StatusBadgeProps {
  status: BookingStatus | SessionStatus | SlotStatus;
}

const bookingStatusMap: Record<BookingStatus, { variant: 'pending' | 'confirmed' | 'cancelled' | 'noShow' | 'completed', label: string }> = {
  PENDING: { variant: 'pending', label: 'Pending' },
  CONFIRMED: { variant: 'confirmed', label: 'Confirmed' },
  CANCELLED: { variant: 'cancelled', label: 'Cancelled' },
  NO_SHOW: { variant: 'noShow', label: 'No Show' },
  COMPLETED: { variant: 'completed', label: 'Completed' },
};

const sessionStatusMap: Record<SessionStatus, { variant: 'pending' | 'confirmed' | 'cancelled' | 'completed', label: string }> = {
  SCHEDULED: { variant: 'confirmed', label: 'Scheduled' },
  CANCELLED: { variant: 'cancelled', label: 'Cancelled' },
  COMPLETED: { variant: 'completed', label: 'Completed' },
};

const slotStatusMap: Record<SlotStatus, { variant: 'confirmed' | 'cancelled' | 'warning', label: string }> = {
  OPEN: { variant: 'confirmed', label: 'Open' },
  CLOSED: { variant: 'cancelled', label: 'Closed' },
  FULL: { variant: 'warning', label: 'Full' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  // Check booking status
  if (status in bookingStatusMap) {
    const config = bookingStatusMap[status as BookingStatus];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  }
  
  // Check session status
  if (status in sessionStatusMap) {
    const config = sessionStatusMap[status as SessionStatus];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  }
  
  // Check slot status
  if (status in slotStatusMap) {
    const config = slotStatusMap[status as SlotStatus];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  }
  
  return <Badge variant="secondary">{status}</Badge>;
}
