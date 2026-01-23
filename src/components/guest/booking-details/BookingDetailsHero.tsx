import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { Calendar, Clock, Users, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CategoryIcon } from '@/components/ui/category-badge';
import { IconRestaurants } from '@/components/icons/ProperaIcons';
import { cn } from '@/lib/utils';
import type { BookingDisplayModel, BookingStatus } from '@/types/booking-display';

interface BookingDetailsHeroProps {
  booking: BookingDisplayModel;
}

const statusConfig: Record<BookingStatus, {
  icon: typeof CheckCircle2;
  label: string;
  variant: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'noShow' | 'secondary';
  className: string;
  bgClass: string;
}> = {
  CONFIRMED: {
    icon: CheckCircle2,
    label: 'Confirmed',
    variant: 'confirmed',
    className: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  PENDING: {
    icon: AlertCircle,
    label: 'Pending',
    variant: 'pending',
    className: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-950/30',
  },
  CANCELLED: {
    icon: XCircle,
    label: 'Cancelled',
    variant: 'cancelled',
    className: 'text-red-500',
    bgClass: 'bg-red-50 dark:bg-red-950/30',
  },
  COMPLETED: {
    icon: CheckCircle2,
    label: 'Completed',
    variant: 'completed',
    className: 'text-muted-foreground',
    bgClass: 'bg-muted/50',
  },
  NO_SHOW: {
    icon: XCircle,
    label: 'No Show',
    variant: 'noShow',
    className: 'text-muted-foreground',
    bgClass: 'bg-muted/50',
  },
};

const mealPeriodConfig: Record<string, { colorClass: string; bgClass: string }> = {
  BREAKFAST: { colorClass: 'text-sunset', bgClass: 'bg-sunset/10' },
  LUNCH: { colorClass: 'text-lagoon', bgClass: 'bg-lagoon/10' },
  DINNER: { colorClass: 'text-orchid', bgClass: 'bg-orchid/10' },
  EVENT: { colorClass: 'text-coral', bgClass: 'bg-coral/10' },
};

function getDateLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEEE, MMMM d');
}

export function BookingDetailsHero({ booking }: BookingDetailsHeroProps) {
  const isActivity = booking.type === 'activity';
  const config = statusConfig[booking.status] || statusConfig.CONFIRMED;
  const StatusIcon = config.icon;
  const restaurantConfig = !isActivity && booking.mealPeriod 
    ? mealPeriodConfig[booking.mealPeriod] || mealPeriodConfig.DINNER 
    : null;

  const totalGuests = booking.numAdults + booking.numChildren;

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      <div className={cn(
        "flex items-center gap-3 p-4 rounded-xl",
        config.bgClass
      )}>
        <StatusIcon className={cn("h-6 w-6", config.className)} />
        <div className="flex-1">
          <p className={cn("font-semibold", config.className)}>{config.label}</p>
          {booking.statusMessage && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {booking.statusMessage}
            </p>
          )}
        </div>
      </div>

      {/* Main Header */}
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={cn(
          "flex h-16 w-16 items-center justify-center rounded-2xl shrink-0",
          booking.status === 'CANCELLED'
            ? "bg-muted"
            : isActivity
              ? "bg-lagoon/10"
              : restaurantConfig?.bgClass || "bg-sunset/10"
        )}>
          {isActivity ? (
            <CategoryIcon
              category={booking.category || 'OTHER'}
              size={32}
              className={booking.status === 'CANCELLED' ? "text-muted-foreground" : undefined}
            />
          ) : (
            <IconRestaurants className={cn(
              "h-8 w-8",
              booking.status === 'CANCELLED' 
                ? "text-muted-foreground" 
                : restaurantConfig?.colorClass || "text-sunset"
            )} />
          )}
        </div>

        {/* Title & Type */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-foreground leading-tight">
            {booking.title}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs font-normal">
              {isActivity ? booking.category || 'Activity' : booking.mealPeriod || 'Dining'}
            </Badge>
            {booking.imageUrl && (
              <span className="text-xs text-muted-foreground">• Photo available</span>
            )}
          </div>
        </div>
      </div>

      {/* Date & Time Card */}
      <div className="bg-muted/30 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">
              {getDateLabel(booking.date)}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(parseISO(booking.date), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono font-semibold text-foreground">
              {booking.startTime?.slice(0, 5)}
            </span>
            {booking.endTime && (
              <span className="text-muted-foreground">
                - {booking.endTime.slice(0, 5)}
              </span>
            )}
          </div>
          {booking.durationMinutes && (
            <span className="text-muted-foreground">
              {booking.durationMinutes} min
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground">
            {totalGuests} {totalGuests === 1 ? 'guest' : 'guests'}
          </span>
          {booking.numChildren > 0 && (
            <span className="text-muted-foreground">
              ({booking.numAdults} adult{booking.numAdults !== 1 ? 's' : ''}, {booking.numChildren} child{booking.numChildren !== 1 ? 'ren' : ''})
            </span>
          )}
        </div>
      </div>

      {/* Booked By (if not own booking) */}
      {!booking.isOwnBooking && booking.bookedBy && (
        <p className="text-sm text-muted-foreground px-1">
          Booked by {booking.bookedBy}
        </p>
      )}
    </div>
  );
}
