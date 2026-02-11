import { format, parseISO, addDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { GUEST_ROUTES } from '@/routes/guestRoutes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Clock, ChevronRight, Calendar, Sunrise, Sun, Sunset } from 'lucide-react';
import { CategoryIcon } from '@/components/ui/category-badge';
import { IconRestaurants, IconActivities } from '@/components/icons/ProperaIcons';
import { cn } from '@/lib/utils';

interface TimelineItem {
  id: string;
  type: 'activity' | 'restaurant';
  time: string;
  title: string;
  status: string;
  category?: string;
  mealPeriod?: string;
}

interface GuestTodayTimelineProps {
  todaySchedule: TimelineItem[];
  tomorrowCount: number;
  className?: string;
}

export function GuestTodayTimeline({
  todaySchedule,
  tomorrowCount,
  className,
}: GuestTodayTimelineProps) {
  const { t } = useTranslation();
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`;

  // Find next booking (first one after current time)
  const upcomingToday = todaySchedule.filter(item => item.time > currentTimeStr);
  const nextBooking = upcomingToday[0];
  const pastToday = todaySchedule.filter(item => item.time <= currentTimeStr);

  const getTimeOfDayIcon = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour < 12) return <Sunrise className="h-3.5 w-3.5" />;
    if (hour < 17) return <Sun className="h-3.5 w-3.5" />;
    return <Sunset className="h-3.5 w-3.5" />;
  };

  const getItemIcon = (item: TimelineItem) => {
    if (item.type === 'activity') {
      return <CategoryIcon category={item.category || 'OTHER'} size={16} />;
    }
    return <IconRestaurants className="h-4 w-4" />;
  };

  if (todaySchedule.length === 0) {
    return null; // Parent handles empty state
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Today's mini-timeline */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {todaySchedule.map((item, index) => {
          const isPast = item.time <= currentTimeStr;
          const isNext = item === nextBooking;
          
          return (
            <div
              key={item.id}
              className={cn(
                'flex items-center gap-2.5 px-4 py-2.5 rounded-full border text-xs whitespace-nowrap transition-all duration-200 shrink-0',
                isPast && 'bg-muted/30 border-border/30 text-muted-foreground opacity-60',
                isNext && 'bg-primary/15 border-primary/40 text-primary font-semibold ring-2 ring-primary/30 shadow-sm',
                !isPast && !isNext && 'bg-card/80 border-border/50 text-foreground hover:border-border'
              )}
            >
              {getItemIcon(item)}
              <span className="font-mono">{String(item.time || '').slice(0, 5)}</span>
              <span className="max-w-[100px] truncate">{String(item.title || 'Event')}</span>
            </div>
          );
        })}
      </div>

      {/* Next up highlight */}
      {nextBooking && (
        <Card className="bg-gradient-to-br from-primary/5 via-transparent to-transparent border-primary/20 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary shrink-0">
                  {nextBooking.type === 'activity' ? (
                    <CategoryIcon category={nextBooking.category || 'OTHER'} size={22} />
                  ) : (
                    <IconRestaurants className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-primary font-medium uppercase tracking-wide mb-0.5">
                    {t('home.nextUp', 'Next up')}
                  </p>
                  <p className="font-semibold text-foreground">{String(nextBooking.title || 'Event')}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                  <Clock className="h-3.5 w-3.5" />
                    <span className="font-mono">{String(nextBooking.time || '').slice(0, 5)}</span>
                  </div>
                </div>
              </div>
              <Link to={GUEST_ROUTES.BOOKINGS}>
                <Button variant="ghost" size="sm" className="shrink-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tomorrow preview */}
      {tomorrowCount > 0 ? (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {t('home.tomorrowBookings', 'Tomorrow: {{count}} booking(s)', { count: tomorrowCount })}
            </span>
          </div>
          <Link 
            to="/guest/bookings" 
            className="text-xs text-primary hover:underline font-medium"
          >
            {t('common.viewAll', 'View all')}
          </Link>
        </div>
      ) : (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{t('home.noTomorrowBookings', 'No bookings tomorrow yet')}</span>
          </div>
          <Link 
            to="/guest/activities" 
            className="text-xs text-primary hover:underline font-medium"
          >
            {t('home.bookSomething', 'Book something')}
          </Link>
        </div>
      )}
    </div>
  );
}
