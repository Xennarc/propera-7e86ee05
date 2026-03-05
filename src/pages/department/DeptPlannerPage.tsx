import { useState, useMemo, useCallback } from 'react';
import { DepartmentGuard } from '@/components/department/DepartmentGuard';
import { useDepartment } from '@/contexts/DepartmentContext';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { deptKeyToCategory } from '@/lib/department-utils';
import { format, parseISO, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameDay } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusChip } from '@/components/ui/status-chip';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  capacity: number;
  activity_name: string;
  category: string;
  booked: number;
}

function DeptPlannerContent() {
  const { currentDepartment } = useDepartment();
  const { deptKey } = useParams<{ deptKey: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const dateStr = searchParams.get('date') ?? format(new Date(), 'yyyy-MM-dd');
  const baseDate = parseISO(dateStr);
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const resortId = currentDepartment?.resort_id;
  const category = deptKeyToCategory(deptKey);

  const { data: sessions = [], isLoading, refetch } = useQuery({
    queryKey: ['dept-planner-sessions', resortId, category, format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!resortId) return [];
      const { data, error } = await supabase
        .from('activity_sessions')
        .select(`
          id, date, start_time, end_time, capacity, status,
          activity:activities(name, category)
        `)
        .eq('resort_id', resortId)
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'))
        .order('date')
        .order('start_time');

      if (error) throw error;
      let filtered = data ?? [];
      if (category) {
        filtered = filtered.filter((s: any) => s.activity?.category === category);
      }
      return filtered;
    },
    enabled: !!resortId,
    staleTime: 30_000,
  });

  // Booking counts per session
  const sessionIds = useMemo(() => sessions.map((s: any) => s.id), [sessions]);
  const { data: bookingCounts = {} } = useQuery({
    queryKey: ['dept-planner-bookings', sessionIds],
    queryFn: async () => {
      if (sessionIds.length === 0) return {};
      const { data } = await supabase
        .from('activity_bookings')
        .select('session_id, num_adults, num_children')
        .in('session_id', sessionIds)
        .in('status', ['CONFIRMED', 'PENDING']);
      const counts: Record<string, number> = {};
      for (const b of data ?? []) {
        counts[b.session_id] = (counts[b.session_id] ?? 0) + b.num_adults + b.num_children;
      }
      return counts;
    },
    enabled: sessionIds.length > 0,
  });

  const sessionsByDate = useMemo(() => {
    const grouped: Record<string, SessionSlot[]> = {};
    for (const s of sessions as any[]) {
      const slot: SessionSlot = {
        id: s.id,
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
        status: s.status,
        capacity: s.capacity,
        activity_name: s.activity?.name ?? 'Unknown',
        category: s.activity?.category ?? '',
        booked: bookingCounts[s.id] ?? 0,
      };
      if (!grouped[s.date]) grouped[s.date] = [];
      grouped[s.date].push(slot);
    }
    return grouped;
  }, [sessions, bookingCounts]);

  const setWeekDate = useCallback((d: string) => {
    setSearchParams({ date: d });
  }, [setSearchParams]);

  const selectedDay = parseISO(dateStr);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{currentDepartment?.name} Planner</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Week nav */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekDate(format(subDays(weekStart, 7), 'yyyy-MM-dd'))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                <CalendarIcon className="h-3.5 w-3.5" />
                Jump to date
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDay}
                onSelect={(d) => d && setWeekDate(format(d, 'yyyy-MM-dd'))}
              />
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekDate(format(addDays(weekEnd, 1), 'yyyy-MM-dd'))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setWeekDate(format(new Date(), 'yyyy-MM-dd'))}>
          Today
        </Button>
      </div>

      {/* Week grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {weekDays.map(d => (
            <div key={d.toISOString()} className="h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {weekDays.map(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const daySessions = sessionsByDate[dayStr] ?? [];
            const today = isToday(day);
            const selected = isSameDay(day, selectedDay);

            return (
              <div
                key={dayStr}
                className={cn(
                  'rounded-xl border p-2 min-h-[100px] transition-colors cursor-pointer',
                  today && 'border-primary/50 bg-primary/5',
                  selected && !today && 'border-primary/30',
                  !today && !selected && 'border-border/50'
                )}
                onClick={() => setWeekDate(dayStr)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    'text-xs font-semibold',
                    today ? 'text-primary' : 'text-muted-foreground'
                  )}>
                    {format(day, 'EEE d')}
                  </span>
                  {daySessions.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                      {daySessions.length}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  {daySessions.slice(0, 4).map(s => (
                    <div
                      key={s.id}
                      className="text-[11px] px-1.5 py-1 rounded bg-muted/50 truncate cursor-pointer hover:bg-muted transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dept/${deptKey}/session/${s.id}`);
                      }}
                    >
                      <span className="font-medium">{s.start_time?.slice(0, 5)}</span>{' '}
                      <span className="text-muted-foreground">{s.activity_name}</span>
                      <span className="ml-1 text-muted-foreground">{s.booked}/{s.capacity}</span>
                    </div>
                  ))}
                  {daySessions.length > 4 && (
                    <div className="text-[10px] text-muted-foreground px-1.5">+{daySessions.length - 4} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected day detail */}
      {sessionsByDate[dateStr]?.length > 0 && (
        <div className="space-y-2 md:hidden">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {format(selectedDay, 'EEEE, MMM d')} · {sessionsByDate[dateStr].length} sessions
          </div>
          {sessionsByDate[dateStr].map(s => (
            <Card
              key={s.id}
              className="cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => navigate(`/dept/${deptKey}/session/${s.id}`)}
            >
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <div className="text-sm font-mono font-medium text-primary w-12 shrink-0">
                  {s.start_time?.slice(0, 5)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{s.activity_name}</div>
                  <div className="text-xs text-muted-foreground">{s.booked}/{s.capacity} booked</div>
                </div>
                <StatusChip status={s.status} size="sm" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DeptPlannerPage() {
  return (
    <DepartmentGuard moduleKey="ops_planner">
      <DeptPlannerContent />
    </DepartmentGuard>
  );
}
