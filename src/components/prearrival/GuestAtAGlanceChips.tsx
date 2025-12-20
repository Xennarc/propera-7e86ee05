import { Badge } from '@/components/ui/badge';
import { differenceInDays, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';
import { PrearrivalStatusBadge } from './PrearrivalStatusBadge';
import { Plane, Home, LogOut } from 'lucide-react';

interface GuestAtAGlanceChipsProps {
  checkInDate: string;
  checkOutDate: string;
  prearrivalStatus: 'not_started' | 'in_progress' | 'completed';
}

export function GuestAtAGlanceChips({ 
  checkInDate, 
  checkOutDate, 
  prearrivalStatus 
}: GuestAtAGlanceChipsProps) {
  const today = startOfDay(new Date());
  const checkIn = parseISO(checkInDate);
  const checkOut = parseISO(checkOutDate);

  const getStayStatus = () => {
    if (isBefore(today, checkIn)) {
      const daysUntil = differenceInDays(checkIn, today);
      return {
        label: daysUntil === 0 ? 'Arriving today' : daysUntil === 1 ? 'Arriving tomorrow' : `Arriving in ${daysUntil} days`,
        icon: Plane,
        className: 'bg-lagoon/10 text-lagoon border-lagoon/20',
      };
    } else if (isAfter(today, checkOut)) {
      return {
        label: 'Checked out',
        icon: LogOut,
        className: 'bg-muted text-muted-foreground border-muted-foreground/20',
      };
    } else {
      const daysLeft = differenceInDays(checkOut, today);
      return {
        label: daysLeft === 0 ? 'Departing today' : `In-house • ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`,
        icon: Home,
        className: 'bg-success/10 text-success border-success/20',
      };
    }
  };

  const stayStatus = getStayStatus();
  const StayIcon = stayStatus.icon;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="outline" className={stayStatus.className}>
        <StayIcon className="h-3 w-3 mr-1" />
        {stayStatus.label}
      </Badge>
      <PrearrivalStatusBadge status={prearrivalStatus} size="sm" />
    </div>
  );
}
