import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Clock, Users } from 'lucide-react';

interface SlotCardProps {
  /** Slot ID */
  id: string;
  /** Restaurant name */
  restaurantName: string;
  /** Meal period */
  mealPeriod: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'EVENT' | string;
  /** Start time (HH:MM format) */
  startTime: string;
  /** End time (HH:MM format) */
  endTime?: string;
  /** Confirmed covers count */
  confirmedCovers: number;
  /** Total capacity */
  capacity: number;
  /** Additional className */
  className?: string;
}

const mealPeriodStyles: Record<string, string> = {
  BREAKFAST: 'bg-warning/10 text-warning',
  LUNCH: 'bg-primary/10 text-primary',
  DINNER: 'bg-chart-3/10 text-chart-3',
  EVENT: 'bg-chart-4/10 text-chart-4',
};

const mealPeriodLabels: Record<string, string> = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
  EVENT: 'Event',
};

/**
 * Compact restaurant time slot card for horizontal carousels.
 * Fixed width for carousel consistency.
 */
export function SlotCard({
  id,
  restaurantName,
  mealPeriod,
  startTime,
  endTime,
  confirmedCovers,
  capacity,
  className,
}: SlotCardProps) {
  const occupancyPercent = capacity > 0 ? Math.round((confirmedCovers / capacity) * 100) : 0;
  const isFull = confirmedCovers >= capacity;
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
      to={`/staff/restaurants/slots/${id}`}
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
      {/* Meal Period Badge + Time */}
      <div className="flex items-center justify-between mb-2">
        <Badge 
          variant="secondary" 
          className={cn("text-2xs", mealPeriodStyles[mealPeriod] || 'bg-muted text-muted-foreground')}
        >
          {mealPeriodLabels[mealPeriod] || mealPeriod}
        </Badge>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{startTime.slice(0, 5)}</span>
          {endTime && <span>– {endTime.slice(0, 5)}</span>}
        </div>
      </div>

      {/* Restaurant Name */}
      <h3 className="font-medium text-sm text-foreground truncate mb-2">
        {restaurantName}
      </h3>

      {/* Covers */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("h-6 w-6 rounded-md flex items-center justify-center", getOccupancyBg())}>
            <Users className={cn("h-3.5 w-3.5", getOccupancyColor())} />
          </div>
          <span className={cn("text-sm font-medium", getOccupancyColor())}>
            {confirmedCovers}/{capacity} covers
          </span>
        </div>

        {isFull && (
          <Badge variant="destructive" className="text-2xs">
            Full
          </Badge>
        )}
      </div>
    </Link>
  );
}
