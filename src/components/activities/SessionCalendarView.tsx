import { useState, useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, getDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Users, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Activity, ActivitySession } from '@/types/database';

interface SessionWithBookings extends ActivitySession {
  activity?: Activity;
  confirmedPax: number;
  pendingPax: number;
}

interface SessionCalendarViewProps {
  sessions: SessionWithBookings[];
  onSessionClick: (session: SessionWithBookings) => void;
  onDateClick?: (date: Date) => void;
}

export function SessionCalendarView({ sessions, onSessionClick, onDateClick }: SessionCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Group sessions by date
  const sessionsByDate = useMemo(() => {
    const grouped: Record<string, SessionWithBookings[]> = {};
    sessions.forEach(session => {
      const dateKey = session.date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(session);
    });
    return grouped;
  }, [sessions]);

  // Get sessions for a specific date
  const getSessionsForDate = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return sessionsByDate[dateKey] || [];
  };

  // Calculate day stats
  const getDayStats = (date: Date) => {
    const daySessions = getSessionsForDate(date);
    const scheduled = daySessions.filter(s => s.status === 'SCHEDULED');
    const totalCapacity = scheduled.reduce((sum, s) => sum + s.capacity, 0);
    const totalBooked = scheduled.reduce((sum, s) => sum + s.confirmedPax, 0);
    const occupancy = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;
    const hasConflict = daySessions.some(s => s.confirmedPax > s.capacity);
    const hasLowCapacity = scheduled.some(s => {
      const remaining = s.capacity - s.confirmedPax;
      return remaining > 0 && remaining <= 2;
    });
    return { count: scheduled.length, occupancy, hasConflict, hasLowCapacity, daySessions };
  };

  const getOccupancyColor = (occupancy: number) => {
    if (occupancy >= 90) return 'bg-success/20 text-success';
    if (occupancy >= 70) return 'bg-primary/20 text-primary';
    if (occupancy >= 40) return 'bg-warning/20 text-warning';
    return 'bg-muted text-muted-foreground';
  };

  // Weekday headers
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const startDayOfWeek = getDay(monthStart);

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold text-lg">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {weekdays.map(day => (
          <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground bg-muted/20">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {/* Empty cells for days before month start */}
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-border/50 bg-muted/10" />
        ))}
        
        {days.map((day, index) => {
          const stats = getDayStats(day);
          const daySessions = stats.daySessions;
          const isCurrentDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[100px] border-b border-r border-border/50 p-1 cursor-pointer hover:bg-muted/30 transition-colors",
                isCurrentDay && "bg-primary/5"
              )}
              onClick={() => onDateClick?.(day)}
            >
              {/* Day number */}
              <div className={cn(
                "text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full",
                isCurrentDay && "bg-primary text-primary-foreground"
              )}>
                {format(day, 'd')}
              </div>

              {/* Session indicators */}
              <div className="space-y-0.5">
                {stats.count > 0 && (
                  <div className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1",
                    getOccupancyColor(stats.occupancy)
                  )}>
                    <span className="font-medium">{stats.count}</span>
                    <span className="opacity-75">sessions</span>
                    {stats.hasConflict && (
                      <AlertCircle className="h-3 w-3 text-destructive" />
                    )}
                  </div>
                )}
                
                {/* Show first 2 sessions with details */}
                <TooltipProvider>
                  {daySessions.slice(0, 2).map(session => {
                    const remaining = session.capacity - session.confirmedPax;
                    const isFull = remaining <= 0;
                    
                    return (
                      <Tooltip key={session.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSessionClick(session);
                            }}
                            className={cn(
                              "w-full text-left text-[10px] px-1 py-0.5 rounded truncate transition-colors",
                              session.status === 'CANCELLED' ? "bg-destructive/10 text-destructive line-through" :
                              isFull ? "bg-destructive/10 text-destructive" :
                              remaining <= 2 ? "bg-warning/10 text-warning" :
                              "bg-accent hover:bg-accent/80"
                            )}
                          >
                            <span className="font-mono">{session.start_time.slice(0, 5)}</span>
                            {' '}{session.activity?.name?.slice(0, 12)}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-medium">{session.activity?.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Users className="h-3 w-3" />
                              <span className={isFull ? 'text-destructive font-medium' : ''}>
                                {session.confirmedPax}/{session.capacity}
                                {isFull ? ' (Full)' : ` (${remaining} left)`}
                              </span>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </TooltipProvider>

                {/* Show more indicator */}
                {daySessions.length > 2 && (
                  <div className="text-[10px] text-muted-foreground text-center">
                    +{daySessions.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 p-3 border-t border-border bg-muted/20 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-success/20" />
          <span className="text-muted-foreground">90%+ full</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary/20" />
          <span className="text-muted-foreground">70%+ full</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-warning/20" />
          <span className="text-muted-foreground">Low spots</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-destructive/20" />
          <span className="text-muted-foreground">Full/Overbooked</span>
        </div>
      </div>
    </div>
  );
}