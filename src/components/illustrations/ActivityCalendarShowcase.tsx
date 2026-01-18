import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Generate mock calendar data
const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const calendarData = [
  [1, 2, 3, 4, 5, 6, 7],
  [8, 9, 10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19, 20, 21],
];

// Availability states for demo
const availability: Record<number, 'available' | 'limited' | 'full'> = {
  10: 'available',
  11: 'available',
  12: 'limited',
  13: 'full',
  14: 'available',
  15: 'limited',
  16: 'available',
  17: 'available',
  18: 'full',
  19: 'limited',
  20: 'available',
};

const availabilityStyles = {
  available: 'bg-success/20 text-success border-success/30',
  limited: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
  full: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
};

export function ActivityCalendarShowcase({ className = '' }: { className?: string }) {
  return (
    <div className={cn("w-[200px] bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-lg p-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] font-bold text-foreground">Activity Calendar</p>
          <p className="text-[8px] text-muted-foreground">January 2026</p>
        </div>
        <div className="flex items-center gap-1">
          <button className="w-5 h-5 rounded-md bg-muted/50 flex items-center justify-center">
            <ChevronLeft className="h-3 w-3 text-muted-foreground" />
          </button>
          <button className="w-5 h-5 rounded-md bg-muted/50 flex items-center justify-center">
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {days.map((day, i) => (
          <div key={i} className="text-center text-[7px] font-medium text-muted-foreground py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="space-y-1">
        {calendarData.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((day) => {
              const status = availability[day];
              return (
                <div
                  key={day}
                  className={cn(
                    "aspect-square rounded-md flex items-center justify-center text-[8px] font-medium border transition-all",
                    status
                      ? availabilityStyles[status]
                      : "bg-muted/30 text-muted-foreground border-transparent",
                    day === 16 && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                  )}
                >
                  {day}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-3 pt-2 border-t border-border/30">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-success" />
          <span className="text-[7px] text-muted-foreground">Open</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-[7px] text-muted-foreground">Limited</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-[7px] text-muted-foreground">Full</span>
        </div>
      </div>
    </div>
  );
}
