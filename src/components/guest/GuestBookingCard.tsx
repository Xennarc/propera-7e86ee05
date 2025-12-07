import { format, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CategoryIcon } from '@/components/ui/category-badge';
import { getCategoryConfig } from '@/lib/activity-category-config';
import { IconRestaurants } from '@/components/icons/ProperaIcons';
import { Clock, Users, ChevronRight, X, Pencil, MapPin } from 'lucide-react';

interface GuestBookingCardProps {
  booking: {
    id: string;
    type: 'activity' | 'restaurant';
    title: string;
    date: string;
    start_time: string;
    end_time?: string;
    status: string;
    num_adults: number;
    num_children: number;
    category?: string;
    meal_period?: string;
    duration_minutes?: number;
    is_own_booking?: boolean;
    booked_by?: string;
    image_url?: string;
  };
  onCancel?: () => void;
  onEdit?: () => void;
  canCancel?: boolean;
  canEdit?: boolean;
  showDate?: boolean;
  compact?: boolean;
}

const mealPeriodConfig: Record<string, { colorClass: string; bgClass: string }> = {
  BREAKFAST: { colorClass: 'text-sunset', bgClass: 'bg-sunset/10' },
  LUNCH: { colorClass: 'text-lagoon', bgClass: 'bg-lagoon/10' },
  DINNER: { colorClass: 'text-orchid', bgClass: 'bg-orchid/10' },
  EVENT: { colorClass: 'text-coral', bgClass: 'bg-coral/10' },
};

export function GuestBookingCard({
  booking,
  onCancel,
  onEdit,
  canCancel = false,
  canEdit = false,
  showDate = true,
  compact = false,
}: GuestBookingCardProps) {
  const isActivity = booking.type === 'activity';
  const config = isActivity ? getCategoryConfig(booking.category || 'OTHER') : null;
  const restaurantConfig = !isActivity ? (mealPeriodConfig[booking.meal_period || 'DINNER'] || mealPeriodConfig.DINNER) : null;
  const isCancelled = booking.status === 'CANCELLED';
  const totalGuests = booking.num_adults + booking.num_children;

  const getStatusBadge = () => {
    switch (booking.status) {
      case 'CONFIRMED':
        return <Badge variant="confirmed" className="text-[10px]">Confirmed</Badge>;
      case 'PENDING':
        return <Badge variant="pending" className="text-[10px]">Pending</Badge>;
      case 'CANCELLED':
        return <Badge variant="cancelled" className="text-[10px]">Cancelled</Badge>;
      case 'COMPLETED':
        return <Badge variant="completed" className="text-[10px]">Completed</Badge>;
      case 'NO_SHOW':
        return <Badge variant="noShow" className="text-[10px]">No show</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{booking.status}</Badge>;
    }
  };

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card",
        isCancelled && "opacity-60"
      )}>
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
          isCancelled 
            ? "bg-muted" 
            : isActivity && config 
              ? config.bgClass 
              : restaurantConfig?.bgClass
        )}>
          {isActivity ? (
            <CategoryIcon 
              category={booking.category || 'OTHER'} 
              size={20} 
              className={isCancelled ? "text-muted-foreground" : undefined}
            />
          ) : (
            <IconRestaurants className={cn(
              "h-5 w-5", 
              isCancelled ? "text-muted-foreground" : restaurantConfig?.colorClass
            )} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{booking.title}</p>
          <p className="text-xs text-muted-foreground">
            {booking.start_time?.slice(0, 5)}
            {booking.duration_minutes && ` • ${booking.duration_minutes}min`}
          </p>
        </div>
        {getStatusBadge()}
      </div>
    );
  }

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-200",
      !isCancelled && "hover:shadow-soft"
    )}>
      <CardContent className="p-0">
        <div className="flex">
          {/* Left colored strip */}
          <div className={cn(
            "w-1 shrink-0",
            isCancelled 
              ? "bg-muted" 
              : isActivity && config 
                ? `bg-${config.colorClass.replace('text-', '')}` 
                : `bg-${restaurantConfig?.colorClass.replace('text-', '')}`
          )} style={{
            backgroundColor: isCancelled 
              ? undefined 
              : `hsl(var(--${isActivity ? (booking.category?.toLowerCase() || 'primary') : 'sunset'}))`
          }} />
          
          <div className="flex-1 p-4">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl shrink-0",
                isCancelled 
                  ? "bg-muted" 
                  : isActivity && config 
                    ? config.bgClass 
                    : restaurantConfig?.bgClass
              )}>
                {isActivity ? (
                  <CategoryIcon 
                    category={booking.category || 'OTHER'} 
                    size={24} 
                    className={isCancelled ? "text-muted-foreground" : undefined}
                  />
                ) : (
                  <IconRestaurants className={cn(
                    "h-6 w-6", 
                    isCancelled ? "text-muted-foreground" : restaurantConfig?.colorClass
                  )} />
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-foreground truncate">
                    {booking.title}
                  </h3>
                  {getStatusBadge()}
                </div>
                
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mb-2">
                  {showDate && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {format(parseISO(booking.date), 'EEE, MMM d')}
                    </span>
                  )}
                  <span className="font-mono font-medium">
                    {booking.start_time?.slice(0, 5)}
                  </span>
                  {booking.duration_minutes && (
                    <span>{booking.duration_minutes}min</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {totalGuests} {totalGuests === 1 ? 'guest' : 'guests'}
                  </span>
                </div>
                
                {/* Booked by indicator for shared room bookings */}
                {!booking.is_own_booking && booking.booked_by && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Booked by {booking.booked_by}
                  </p>
                )}
                
                {/* Actions */}
                {(canEdit || canCancel) && !isCancelled && (
                  <div className="flex items-center gap-2 mt-2">
                    {canEdit && onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onEdit}
                        className="h-8 px-2 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                    )}
                    {canCancel && onCancel && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onCancel}
                        className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
