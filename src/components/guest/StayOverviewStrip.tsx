import { memo, useMemo } from 'react';
import { differenceInDays, parseISO, isValid } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StayOverviewStripProps {
  checkInDate: string;
  checkOutDate: string;
  totalBookingsCount: number;
  todayActivitiesCount: number;
  loading?: boolean;
  className?: string;
}

interface StripItem {
  label: string;
  value: string;
}

function computeStayDay(checkIn: string, checkOut: string): StripItem {
  const today = new Date();
  const inDate = parseISO(checkIn);
  const outDate = parseISO(checkOut);

  if (!isValid(inDate) || !isValid(outDate)) {
    return { label: 'Stay', value: '—' };
  }

  const totalDays = Math.max(differenceInDays(outDate, inDate), 1);
  const currentDay = differenceInDays(today, inDate) + 1;

  // Pre-arrival
  if (currentDay < 1) {
    return { label: 'Stay', value: 'Begins soon' };
  }

  // Post-checkout
  if (currentDay > totalDays) {
    return { label: 'Stay', value: 'Complete' };
  }

  return { label: 'Stay', value: `Day ${currentDay} of ${totalDays}` };
}

function StayOverviewStripSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('border-border/40 bg-card/60 backdrop-blur-sm', className)}>
      <CardContent className="px-3 py-3 sm:px-4 sm:py-3.5">
        <div className="flex justify-between gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export const StayOverviewStrip = memo(function StayOverviewStrip({
  checkInDate,
  checkOutDate,
  totalBookingsCount,
  todayActivitiesCount,
  loading = false,
  className,
}: StayOverviewStripProps) {
  const items = useMemo<StripItem[]>(() => {
    const stay = computeStayDay(checkInDate, checkOutDate);
    return [
      stay,
      { label: 'Bookings', value: String(totalBookingsCount) },
      { label: 'Today', value: `${todayActivitiesCount} Activity${todayActivitiesCount !== 1 ? '' : ''}` },
    ];
  }, [checkInDate, checkOutDate, totalBookingsCount, todayActivitiesCount]);

  if (loading) {
    return <StayOverviewStripSkeleton className={className} />;
  }

  return (
    <Card
      className={cn(
        'border-border/40 bg-card/60 backdrop-blur-sm',
        'animate-fade-in motion-reduce:animate-none',
        className,
      )}
    >
      <CardContent className="px-3 py-3 sm:px-4 sm:py-3.5">
        <div className="flex justify-between gap-2 flex-wrap">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex-1 min-w-[80px] flex flex-col items-center text-center gap-0.5"
            >
              <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {item.label}
              </span>
              <span className="text-sm sm:text-base font-bold text-foreground tabular-nums leading-tight">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
