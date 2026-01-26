import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Clock, Users } from 'lucide-react';

interface SessionCardProps {
  /** Session ID */
  id: string;
  /** Activity name */
  activityName: string;
  /** Start time (HH:MM format) */
  startTime: string;
  /** End time (HH:MM format) */
  endTime?: string;
  /** Confirmed pax count */
  confirmedPax: number;
  /** Total capacity */
  capacity: number;
  /** Optional status badge */
  status?: 'open' | 'full' | 'cancelled';
  /** Additional className */
  className?: string;
}

/**
 * Compact activity session card for horizontal carousels.
 * Fixed width for carousel consistency.
 */
export function SessionCard({
  id,
  activityName,
  startTime,
  endTime,
  confirmedPax,
  capacity,
  status,
  className,
}: SessionCardProps) {
  const occupancyPercent = capacity > 0 ? Math.round((confirmedPax / capacity) * 100) : 0;
  const isFull = confirmedPax >= capacity;
  const isNearFull = occupancyPercent >= 80;

  const getOccupancyColor = () => {
    if (isFull) return 'text-destructive';
    if (isNearFull) return 'text-warning';
    return 'text-success';
  };

  const getOccupancyBg = () => {
    if (isFull) return 'bg-destructive/10';
    if (isNearFull) return 'bg-warning/10';
    return 'bg-success/10';
  };

  return (
    <Link
      to={`/staff/activities/sessions/${id}`}
      className={cn(
        "carousel-card",
        "block w-[280px] md:w-auto",
        "p-4 rounded-xl",
        "bg-card border border-border/40",
        "hover:border-primary/30 hover:bg-muted/50",
        "active:scale-[0.97]",
        "transition-all duration-100",
        className
      )}
    >
      {/* Time */}
      <div className="flex items-center gap-2 mb-2">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Clock className="h-4 w-4 text-primary" />
        </div>
        <span className="text-lg font-bold text-foreground">
          {startTime.slice(0, 5)}
        </span>
        {endTime && (
          <span className="text-sm text-muted-foreground">
            – {endTime.slice(0, 5)}
          </span>
        )}
      </div>

      {/* Activity Name */}
      <h3 className="font-medium text-sm text-foreground truncate mb-2">
        {activityName}
      </h3>

      {/* Occupancy */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("h-6 w-6 rounded-md flex items-center justify-center", getOccupancyBg())}>
            <Users className={cn("h-3.5 w-3.5", getOccupancyColor())} />
          </div>
          <span className={cn("text-sm font-medium", getOccupancyColor())}>
            {confirmedPax}/{capacity}
          </span>
        </div>

        {isFull && (
          <Badge variant="destructive" className="text-2xs">
            Full
          </Badge>
        )}
        {!isFull && isNearFull && (
          <Badge variant="warning" className="text-2xs">
            Almost full
          </Badge>
        )}
      </div>
    </Link>
  );
}
