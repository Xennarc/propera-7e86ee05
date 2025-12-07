import { differenceInDays, format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar, Sunrise, Sunset } from 'lucide-react';

interface GuestStayProgressProps {
  checkInDate: string;
  checkOutDate: string;
  className?: string;
  variant?: 'compact' | 'full';
}

export function GuestStayProgress({ 
  checkInDate, 
  checkOutDate, 
  className,
  variant = 'compact'
}: GuestStayProgressProps) {
  const checkIn = parseISO(checkInDate);
  const checkOut = parseISO(checkOutDate);
  const today = new Date();
  
  const totalNights = differenceInDays(checkOut, checkIn);
  const nightsStayed = Math.max(0, Math.min(totalNights, differenceInDays(today, checkIn)));
  const nightsRemaining = Math.max(0, differenceInDays(checkOut, today));
  const progressPercent = totalNights > 0 ? (nightsStayed / totalNights) * 100 : 0;
  
  const isCheckoutDay = differenceInDays(checkOut, today) === 0;
  const isBeforeStay = differenceInDays(today, checkIn) < 0;

  if (variant === 'compact') {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(checkIn, 'MMM d')} – {format(checkOut, 'MMM d')}
          </span>
          <span className="font-medium text-foreground">
            {isCheckoutDay 
              ? 'Check-out day' 
              : isBeforeStay 
                ? `Arriving in ${Math.abs(nightsStayed)} days`
                : `Day ${nightsStayed + 1} of ${totalNights + 1}`
            }
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, progressPercent)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Sunrise className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Check-in</p>
            <p className="text-sm font-semibold">{format(checkIn, 'EEE, MMM d')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-right">
          <div>
            <p className="text-xs text-muted-foreground">Check-out</p>
            <p className="text-sm font-semibold">{format(checkOut, 'EEE, MMM d')}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sunset/10">
            <Sunset className="h-4 w-4 text-sunset" />
          </div>
        </div>
      </div>
      
      <div className="relative">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary via-lagoon to-sunset rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, progressPercent)}%` }}
          />
        </div>
        {/* Progress indicator dot */}
        {!isBeforeStay && progressPercent < 100 && (
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full border-2 border-background shadow-sm transition-all duration-500"
            style={{ left: `calc(${Math.min(100, progressPercent)}% - 6px)` }}
          />
        )}
      </div>
      
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">
          {totalNights} {totalNights === 1 ? 'night' : 'nights'} total
        </span>
        <span className={cn(
          "font-medium",
          isCheckoutDay ? "text-sunset" : nightsRemaining <= 2 ? "text-coral" : "text-foreground"
        )}>
          {isCheckoutDay 
            ? 'Check-out today' 
            : isBeforeStay 
              ? `Arriving ${format(checkIn, 'EEEE')}`
              : `${nightsRemaining} ${nightsRemaining === 1 ? 'night' : 'nights'} remaining`
          }
        </span>
      </div>
    </div>
  );
}
