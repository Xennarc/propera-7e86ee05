import { differenceInDays } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeParseDateISO, safeFormatDate } from '@/lib/safe-date-format';

interface PrearrivalCountdownProps {
  checkInDate: string;
  checkOutDate: string;
  resortName?: string;
  roomNumber?: string;
  className?: string;
}

export function PrearrivalCountdown({
  checkInDate,
  checkOutDate,
  resortName,
  roomNumber,
  className,
}: PrearrivalCountdownProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const checkIn = safeParseDateISO(checkInDate);
  const checkOut = safeParseDateISO(checkOutDate);
  
  // Fallback if dates are invalid
  if (!checkIn || !checkOut) {
    return null;
  }
  
  const daysUntil = differenceInDays(checkIn, today);
  const stayNights = differenceInDays(checkOut, checkIn);

  return (
    <Card className={cn(
      "border-0 shadow-lg overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Countdown number */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center justify-center h-20 w-20 rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <span className="text-3xl font-bold">{daysUntil}</span>
              <span className="text-xs uppercase tracking-wide opacity-80">
                {daysUntil === 1 ? 'day' : 'days'}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {daysUntil === 0 ? 'Arriving today!' : daysUntil === 1 ? 'See you tomorrow!' : 'Until your arrival'}
              </h2>
              {resortName && (
                <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
                  <MapPin className="h-4 w-4" />
                  {String(resortName)}
                  {resortName}
                </p>
              )}
            </div>
          </div>

          {/* Stay details */}
          <div className="flex-1 grid grid-cols-2 gap-4 md:gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/80 shadow-sm">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Check-in</p>
                <p className="font-semibold text-foreground">
                  {safeFormatDate(checkInDate, 'EEE, MMM d', 'TBD')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/80 shadow-sm">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Check-out</p>
                <p className="font-semibold text-foreground">
                  {safeFormatDate(checkOutDate, 'EEE, MMM d', 'TBD')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 col-span-2 md:col-span-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/80 shadow-sm">
                <Users className="h-5 w-5 text-lagoon" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Stay</p>
                <p className="font-semibold text-foreground">
                  {Number(stayNights) || 0} {stayNights === 1 ? 'night' : 'nights'}
                  {roomNumber && ` • Room ${String(roomNumber)}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
