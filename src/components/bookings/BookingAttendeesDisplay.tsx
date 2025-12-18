import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Baby } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Attendee {
  id: string;
  display_name: string;
  attendee_type: 'adult' | 'child';
  member_id: string | null;
  guest_id: string | null;
}

interface BookingAttendeesDisplayProps {
  activityBookingId?: string;
  restaurantReservationId?: string;
  fallbackAdults?: number;
  fallbackChildren?: number;
}

export function BookingAttendeesDisplay({
  activityBookingId,
  restaurantReservationId,
  fallbackAdults = 1,
  fallbackChildren = 0,
}: BookingAttendeesDisplayProps) {
  const { data: attendees, isLoading } = useQuery({
    queryKey: ['booking-attendees', activityBookingId, restaurantReservationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_booking_attendees', {
        p_activity_booking_id: activityBookingId || null,
        p_restaurant_reservation_id: restaurantReservationId || null,
      });
      
      if (error) throw error;
      return (data as unknown as Attendee[]) || [];
    },
    enabled: !!(activityBookingId || restaurantReservationId),
    staleTime: 60000,
  });

  if (isLoading) {
    return <Skeleton className="h-5 w-20" />;
  }

  // If no attendees found, show fallback
  if (!attendees || attendees.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        {fallbackAdults} adult{fallbackAdults !== 1 ? 's' : ''}
        {fallbackChildren > 0 && `, ${fallbackChildren} child${fallbackChildren !== 1 ? 'ren' : ''}`}
      </span>
    );
  }

  const adults = attendees.filter(a => a.attendee_type === 'adult');
  const children = attendees.filter(a => a.attendee_type === 'child');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 cursor-help">
          {adults.length > 0 && (
            <Badge variant="outline" className="text-xs gap-1 px-1.5">
              <User className="h-3 w-3" />
              {adults.length}
            </Badge>
          )}
          {children.length > 0 && (
            <Badge variant="outline" className="text-xs gap-1 px-1.5 text-amber-600 border-amber-200">
              <Baby className="h-3 w-3" />
              {children.length}
            </Badge>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="text-sm space-y-1">
          <p className="font-medium">Attendees:</p>
          <ul className="space-y-0.5">
            {attendees.map((a) => (
              <li key={a.id} className="flex items-center gap-1">
                {a.attendee_type === 'child' ? (
                  <Baby className="h-3 w-3 text-amber-500" />
                ) : (
                  <User className="h-3 w-3 text-muted-foreground" />
                )}
                <span>{a.display_name}</span>
                <span className="text-xs text-muted-foreground">
                  ({a.attendee_type})
                </span>
              </li>
            ))}
          </ul>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
