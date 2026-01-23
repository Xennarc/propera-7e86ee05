import { Calendar, MapPin, Phone, X, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  downloadICSFile, 
  getGoogleCalendarUrl, 
  createCalendarEventFromBooking 
} from '@/lib/calendar-utils';
import type { BookingDisplayModel } from '@/types/booking-display';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BookingDetailsQuickActionsProps {
  booking: BookingDisplayModel;
  onCancel?: () => void;
  onEdit?: () => void;
  isCancelling?: boolean;
}

export function BookingDetailsQuickActions({
  booking,
  onCancel,
  onEdit,
  isCancelling = false,
}: BookingDetailsQuickActionsProps) {
  const isPast = booking.status === 'COMPLETED' || booking.status === 'CANCELLED' || booking.status === 'NO_SHOW';
  const showCalendar = !isPast && (booking.status === 'CONFIRMED' || booking.status === 'PENDING');
  const showCancel = booking.canCancel && onCancel && !isPast;
  const showEdit = booking.canEdit && onEdit && !isPast;

  const handleAddToCalendar = () => {
    try {
      const event = createCalendarEventFromBooking(booking);
      downloadICSFile(event);
      toast.success('Calendar event downloaded');
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      toast.error('Failed to create calendar event');
    }
  };

  const handleOpenGoogleCalendar = () => {
    try {
      const event = createCalendarEventFromBooking(booking);
      const url = getGoogleCalendarUrl(event);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Failed to open Google Calendar:', error);
      toast.error('Failed to open Google Calendar');
    }
  };

  const handleGetDirections = () => {
    if (booking.coordinates) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${booking.coordinates.lat},${booking.coordinates.lng}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (booking.venueName || booking.meetingPoint) {
      const query = encodeURIComponent(booking.meetingPoint || booking.venueName || '');
      const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const hasLocation = booking.coordinates || booking.venueName || booking.meetingPoint;

  if (!showCalendar && !showCancel && !showEdit && !hasLocation) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* Add to Calendar */}
      {showCalendar && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 flex-1 min-w-[120px] h-11"
            >
              <Calendar className="h-4 w-4" />
              Add to Calendar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={handleAddToCalendar}>
              <Calendar className="h-4 w-4 mr-2" />
              Download .ics file
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleOpenGoogleCalendar}>
              <Calendar className="h-4 w-4 mr-2" />
              Open in Google Calendar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Get Directions */}
      {hasLocation && !isPast && (
        <Button
          variant="outline"
          size="sm"
          className="gap-2 flex-1 min-w-[120px] h-11"
          onClick={handleGetDirections}
        >
          <MapPin className="h-4 w-4" />
          Directions
        </Button>
      )}

      {/* Edit */}
      {showEdit && (
        <Button
          variant="outline"
          size="sm"
          className="gap-2 h-11"
          onClick={onEdit}
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      )}

      {/* Cancel */}
      {showCancel && (
        <Button
          variant="outline"
          size="sm"
          className="gap-2 h-11 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
          onClick={onCancel}
          disabled={isCancelling}
        >
          <X className="h-4 w-4" />
          Cancel Booking
        </Button>
      )}
    </div>
  );
}
