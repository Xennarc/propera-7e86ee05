import { useState, useMemo } from 'react';
import { format, parseISO, isSameDay, addDays } from 'date-fns';
import { AlertTriangle, Check, Clock, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Resource, ActivitySession, Activity } from '@/types/database';

interface SessionWithActivity extends ActivitySession {
  activity?: Activity;
  confirmedPax?: number;
}

interface ResourceScheduleViewProps {
  resources: Resource[];
  sessions: SessionWithActivity[];
  startDate: Date;
  onSessionClick: (session: SessionWithActivity) => void;
  onConflictClick?: (resourceId: string, date: string, sessions: SessionWithActivity[]) => void;
}

export function ResourceScheduleView({
  resources,
  sessions,
  startDate,
  onSessionClick,
  onConflictClick,
}: ResourceScheduleViewProps) {
  const [viewStartDate, setViewStartDate] = useState(startDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(viewStartDate, i));

  // Group sessions by resource and date
  const scheduleGrid = useMemo(() => {
    const grid: Record<string, Record<string, SessionWithActivity[]>> = {};
    
    // Initialize grid for all resources
    resources.forEach(resource => {
      grid[resource.id] = {};
      days.forEach(day => {
        grid[resource.id][format(day, 'yyyy-MM-dd')] = [];
      });
    });

    // Add unassigned row
    grid['unassigned'] = {};
    days.forEach(day => {
      grid['unassigned'][format(day, 'yyyy-MM-dd')] = [];
    });

    // Populate with sessions
    sessions.forEach(session => {
      const resourceId = session.resource_id || 'unassigned';
      const dateKey = session.date;
      
      if (grid[resourceId] && grid[resourceId][dateKey]) {
        grid[resourceId][dateKey].push(session);
      } else if (grid['unassigned'] && grid['unassigned'][dateKey]) {
        grid['unassigned'][dateKey].push(session);
      }
    });

    // Sort sessions by time within each cell
    Object.keys(grid).forEach(resourceId => {
      Object.keys(grid[resourceId]).forEach(dateKey => {
        grid[resourceId][dateKey].sort((a, b) => 
          a.start_time.localeCompare(b.start_time)
        );
      });
    });

    return grid;
  }, [resources, sessions, days]);

  // Detect time conflicts
  const detectConflicts = (daySessions: SessionWithActivity[]) => {
    const conflicts: Set<string> = new Set();
    
    for (let i = 0; i < daySessions.length; i++) {
      for (let j = i + 1; j < daySessions.length; j++) {
        const a = daySessions[i];
        const b = daySessions[j];
        
        // Check if times overlap
        if (a.start_time < b.end_time && b.start_time < a.end_time) {
          conflicts.add(a.id);
          conflicts.add(b.id);
        }
      }
    }
    
    return conflicts;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Resource Schedule</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewStartDate(addDays(viewStartDate, -7))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[180px] text-center">
              {format(viewStartDate, 'MMM d')} - {format(addDays(viewStartDate, 6), 'MMM d, yyyy')}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewStartDate(addDays(viewStartDate, 7))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 overflow-x-auto">
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-2 text-sm font-medium text-muted-foreground w-32">
                Resource
              </th>
              {days.map(day => (
                <th
                  key={day.toISOString()}
                  className={cn(
                    "text-center p-2 text-sm font-medium w-28",
                    isSameDay(day, new Date()) && "bg-primary/5"
                  )}
                >
                  <div>{format(day, 'EEE')}</div>
                  <div className="text-xs text-muted-foreground">{format(day, 'MMM d')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Resource rows */}
            {resources.map(resource => (
              <tr key={resource.id} className="border-b border-border/50">
                <td className="p-2 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        resource.is_active ? "bg-success" : "bg-muted"
                      )}
                    />
                    {resource.name}
                    <span className="text-xs text-muted-foreground">
                      ({resource.capacity})
                    </span>
                  </div>
                </td>
                {days.map(day => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const daySessions = scheduleGrid[resource.id]?.[dateKey] || [];
                  const conflicts = detectConflicts(daySessions);
                  const hasConflict = conflicts.size > 0;

                  return (
                    <td
                      key={dateKey}
                      className={cn(
                        "p-1 align-top border-l border-border/30",
                        isSameDay(day, new Date()) && "bg-primary/5",
                        hasConflict && "bg-destructive/5"
                      )}
                    >
                      <div className="space-y-1 min-h-[60px]">
                        {hasConflict && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => onConflictClick?.(resource.id, dateKey, daySessions)}
                                  className="flex items-center gap-1 text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded w-full"
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  Conflict
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {conflicts.size} overlapping sessions detected
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {daySessions.map(session => (
                          <TooltipProvider key={session.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => onSessionClick(session)}
                                  className={cn(
                                    "w-full text-left text-[10px] px-1.5 py-1 rounded truncate transition-colors",
                                    conflicts.has(session.id)
                                      ? "bg-destructive/20 border border-destructive/40 text-destructive"
                                      : session.status === 'CANCELLED'
                                      ? "bg-muted text-muted-foreground line-through"
                                      : "bg-primary/10 hover:bg-primary/20 text-foreground"
                                  )}
                                >
                                  <div className="font-mono">{session.start_time.slice(0, 5)}</div>
                                  <div className="truncate">{session.activity?.name}</div>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <div className="space-y-1">
                                  <p className="font-medium">{session.activity?.name}</p>
                                  <div className="flex items-center gap-2 text-xs">
                                    <Clock className="h-3 w-3" />
                                    {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs">
                                    <Users className="h-3 w-3" />
                                    {session.confirmedPax || 0}/{session.capacity}
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Unassigned row */}
            <tr className="bg-muted/20">
              <td className="p-2 text-sm font-medium text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-muted" />
                  Unassigned
                </div>
              </td>
              {days.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const daySessions = scheduleGrid['unassigned']?.[dateKey] || [];

                return (
                  <td
                    key={dateKey}
                    className={cn(
                      "p-1 align-top border-l border-border/30",
                      isSameDay(day, new Date()) && "bg-primary/5"
                    )}
                  >
                    <div className="space-y-1 min-h-[60px]">
                      {daySessions.map(session => (
                        <button
                          key={session.id}
                          onClick={() => onSessionClick(session)}
                          className="w-full text-left text-[10px] px-1.5 py-1 rounded bg-warning/10 hover:bg-warning/20 text-warning-foreground truncate"
                        >
                          <div className="font-mono">{session.start_time.slice(0, 5)}</div>
                          <div className="truncate">{session.activity?.name}</div>
                        </button>
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-primary/10" />
            <span>Assigned</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-warning/10" />
            <span>Unassigned</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-destructive/20 border border-destructive/40" />
            <span>Conflict</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}