import { useState, useMemo, useCallback, useEffect } from 'react';
import { DepartmentGuard } from '@/components/department/DepartmentGuard';
import { useDepartment } from '@/contexts/DepartmentContext';
import { useCanEditPlanner } from '@/hooks/useCanEditPlanner';
import { usePlannerState } from '@/hooks/usePlannerState';
import { computeCoverage, type CoverageStatus } from '@/lib/ops/coverageRules';
import { parseActivityRequirements } from '@/lib/activity-requirements';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDepartmentActivityScope, isDepartmentUnscoped } from '@/lib/department-utils';
import { UnscopedDepartmentBanner } from '@/components/department/UnscopedDepartmentBanner';
import { format, parseISO, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameDay } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusChip } from '@/components/ui/status-chip';
import { Calendar } from '@/components/ui/calendar';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CalendarIcon, ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, ShieldAlert, Truck, FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StaffLanesView } from '@/components/department/planner/StaffLanesView';
import { AssetLanesView } from '@/components/department/planner/AssetLanesView';
import { SessionAssignDrawer } from '@/components/department/planner/SessionAssignDrawer';

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
  ops_rules_json: unknown;
  requirements_json: unknown;
  coverageStatus: CoverageStatus;
  /** True if activity requires pickup but no transport link exists */
  missingPickup: boolean;
  /** Count of unverified certs + pending/followup medical reviews */
  readinessBlockerCount: number;
}

/** Lightweight hook to batch-fetch conflicts for multiple sessions */
function useMultiSessionConflicts(resortId: string | undefined, sessionIds: string[]) {
  return useQuery({
    queryKey: ['dept-planner-conflicts', resortId, sessionIds],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!resortId || sessionIds.length === 0) return {};
      const batch = sessionIds.slice(0, 20);
      const results = await Promise.allSettled(
        batch.map(sid =>
          supabase.rpc('get_session_conflicts', { p_resort_id: resortId, p_session_id: sid })
            .then(({ data }) => {
              if (!data) return { sid, count: 0 };
              const parsed = typeof data === 'string' ? JSON.parse(data) : data;
              const count =
                (parsed.conflicting_boats?.length ?? 0) +
                (parsed.conflicting_equipment?.length ?? 0) +
                (parsed.conflicting_staff?.length ?? 0);
              return { sid, count };
            })
        )
      );
      const map: Record<string, number> = {};
      for (const r of results) {
        if (r.status === 'fulfilled') map[r.value.sid] = r.value.count;
      }
      return map;
    },
    enabled: !!resortId && sessionIds.length > 0,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

type ViewMode = 'sessions' | 'staff' | 'boats';

function DeptPlannerContent() {
  const { currentDepartment, isManager } = useDepartment();
  const { canEdit: canEditPlanner } = useCanEditPlanner();
  const { deptKey } = useParams<{ deptKey: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const resortId = currentDepartment?.resort_id;

  // Persistent planner state (survives navigation)
  const plannerState = usePlannerState({
    resortId,
    urlDate: searchParams.get('date'),
  });
  const { viewMode, setViewMode, attentionMode, setAttentionMode, dateStr } = plannerState;

  const [showAllRisks, setShowAllRisks] = useState(false);
  const [assignDrawerOpen, setAssignDrawerOpen] = useState(false);
  const [selectedSessionForAssign, setSelectedSessionForAssign] = useState<any>(null);

  const baseDate = parseISO(dateStr);
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const category = getDepartmentActivityScope(currentDepartment);
  const unscoped = isDepartmentUnscoped(currentDepartment);
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

  const { data: sessions = [], isLoading, refetch } = useQuery({
    queryKey: ['dept-planner-sessions', resortId, category, weekStartStr, weekEndStr],
    queryFn: async () => {
      if (!resortId) return [];
      const { data, error } = await supabase
        .from('activity_sessions')
        .select(`
          id, date, start_time, end_time, capacity, status,
          activity:activities(name, category, ops_rules_json, requirements_json)
        `)
        .eq('resort_id', resortId)
        .gte('date', weekStartStr)
        .lte('date', weekEndStr)
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

  // Fetch staff & asset assignments for coverage computation
  const { data: sessionAssignments = {} } = useQuery({
    queryKey: ['dept-planner-assignments', sessionIds],
    queryFn: async () => {
      if (sessionIds.length === 0) return {};
      const [staffRes, assetRes] = await Promise.all([
        supabase.from('session_staff_assignments')
          .select('session_id, role')
          .in('session_id', sessionIds),
        supabase.from('session_asset_assignments')
          .select('session_id')
          .in('session_id', sessionIds),
      ]);
      const result: Record<string, { roles: Record<string, number>; boats: number }> = {};
      for (const a of staffRes.data ?? []) {
        if (!result[a.session_id]) result[a.session_id] = { roles: {}, boats: 0 };
        result[a.session_id].roles[a.role] = (result[a.session_id].roles[a.role] ?? 0) + 1;
      }
      for (const a of assetRes.data ?? []) {
        if (!result[a.session_id]) result[a.session_id] = { roles: {}, boats: 0 };
        result[a.session_id].boats += 1;
      }
      return result;
    },
    enabled: sessionIds.length > 0,
    staleTime: 30_000,
  });

  const { data: conflictCounts = {} } = useMultiSessionConflicts(resortId, sessionIds);

  // Transport links — check which sessions have a pickup linked
  const { data: transportLinkedSessions = new Set<string>() } = useQuery({
    queryKey: ['dept-planner-transport-links', sessionIds],
    queryFn: async () => {
      if (sessionIds.length === 0) return new Set<string>();
      const { data } = await supabase
        .from('session_transport_links')
        .select('session_id')
        .in('session_id', sessionIds)
        .eq('link_type', 'pickup');
      return new Set((data ?? []).map((r: any) => r.session_id));
    },
    enabled: sessionIds.length > 0,
    staleTime: 30_000,
  });

  // Readiness blockers — unverified certs + pending/followup medical per session
  const { data: readinessBlockers = {} } = useQuery({
    queryKey: ['dept-planner-readiness-blockers', sessionIds],
    queryFn: async (): Promise<Record<string, number>> => {
      if (sessionIds.length === 0) return {};
      const { data } = await supabase
        .from('activity_booking_readiness')
        .select('session_id, cert_verification_status, medical_review_status')
        .in('session_id', sessionIds);
      const counts: Record<string, number> = {};
      for (const r of data ?? []) {
        let blockers = 0;
        if (r.cert_verification_status === 'unverified' || r.cert_verification_status === 'rejected') blockers++;
        if (r.medical_review_status === 'pending' || r.medical_review_status === 'requires_followup') blockers++;
        if (blockers > 0) counts[r.session_id] = (counts[r.session_id] ?? 0) + blockers;
      }
      return counts;
    },
    enabled: sessionIds.length > 0,
    staleTime: 30_000,
  });

  // Realtime subscriptions
  useEffect(() => {
    if (!resortId) return;
    const channel = supabase
      .channel('dept-planner-bookings-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_bookings', filter: `resort_id=eq.${resortId}` },
        () => { queryClient.invalidateQueries({ queryKey: ['dept-planner-bookings'] }); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [resortId, queryClient]);

  useEffect(() => {
    if (!resortId) return;
    const channel = supabase
      .channel('dept-planner-sessions-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_sessions', filter: `resort_id=eq.${resortId}` },
        () => { queryClient.invalidateQueries({ queryKey: ['dept-planner-sessions'] }); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [resortId, queryClient]);

  // Realtime: staff & asset assignment changes → refresh coverage dots
  useEffect(() => {
    if (!resortId) return;
    const channel = supabase
      .channel('dept-planner-assigns-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_staff_assignments', filter: `resort_id=eq.${resortId}` },
        () => { queryClient.invalidateQueries({ queryKey: ['dept-planner-assignments'] }); }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_asset_assignments', filter: `resort_id=eq.${resortId}` },
        () => { queryClient.invalidateQueries({ queryKey: ['dept-planner-assignments'] }); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [resortId, queryClient]);

  const sessionsByDate = useMemo(() => {
    const grouped: Record<string, SessionSlot[]> = {};
    for (const s of sessions as any[]) {
      const assigns = sessionAssignments[s.id];
      const booked = bookingCounts[s.id] ?? 0;
      const conflicts = conflictCounts[s.id] ?? 0;
      const actCategory = s.activity?.category ?? '';
      const reqJson = s.activity?.requirements_json;
      const actReqs = parseActivityRequirements(reqJson, actCategory);
      const coverage = computeCoverage({
        opsRules: s.activity?.ops_rules_json,
        assignedRoles: assigns?.roles ?? {},
        assignedBoats: assigns?.boats ?? 0,
        bookedCount: booked,
        category: actCategory || null,
        conflictCount: conflicts,
      });
      const slot: SessionSlot = {
        id: s.id,
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
        status: s.status,
        capacity: s.capacity,
        activity_name: s.activity?.name ?? 'Unknown',
        category: actCategory,
        booked,
        ops_rules_json: s.activity?.ops_rules_json,
        requirements_json: reqJson,
        coverageStatus: coverage.status,
        missingPickup: actReqs.requires_pickup && !transportLinkedSessions.has(s.id),
        readinessBlockerCount: readinessBlockers[s.id] ?? 0,
      };
      if (!grouped[s.date]) grouped[s.date] = [];
      grouped[s.date].push(slot);
    }
    return grouped;
  }, [sessions, bookingCounts, sessionAssignments, conflictCounts, transportLinkedSessions, readinessBlockers]);

  // Attention mode: filter today's sessions to high-risk items
  const attentionItems = useMemo(() => {
    if (!attentionMode) return [];
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const allToday = sessionsByDate[todayStr] ?? [];
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const soonThreshold = nowMinutes + 90;

    return allToday.filter(s => {
      if (s.coverageStatus === 'amber' || s.coverageStatus === 'red') return true;
      if ((conflictCounts[s.id] ?? 0) > 0) return true;
      if (s.missingPickup) return true;
      if (s.readinessBlockerCount > 0) return true;
      const [h, m] = (s.start_time ?? '00:00').split(':').map(Number);
      const startMin = h * 60 + m;
      if (startMin <= soonThreshold && startMin >= nowMinutes && s.booked > 0) return true;
      return false;
    }).sort((a, b) => {
      // Priority: red > missing pickup > readiness blockers > amber > green
      const urgency = (s: SessionSlot) => {
        if (s.coverageStatus === 'red') return 0;
        if (s.missingPickup) return 1;
        if (s.readinessBlockerCount > 0) return 2;
        if (s.coverageStatus === 'amber') return 3;
        return 4;
      };
      const diff = urgency(a) - urgency(b);
      if (diff !== 0) return diff;
      return (a.start_time ?? '').localeCompare(b.start_time ?? '');
    });
  }, [attentionMode, sessionsByDate, conflictCounts]);

  const setWeekDate = useCallback((d: string) => {
    plannerState.setDateStr(d);
    setSearchParams({ date: d });
  }, [setSearchParams, plannerState]);

  const selectedDay = parseISO(dateStr);

  const handleSessionClick = (sessionId: string) => {
    if (viewMode === 'sessions' && !canEditPlanner) {
      navigate(`/staff/dept/${deptKey}/session/${sessionId}`);
    } else {
      // In lane views, open the assignment drawer
      const session = sessions.find((s: any) => s.id === sessionId) as any;
      if (session) {
        setSelectedSessionForAssign({
          id: session.id,
          date: session.date,
          start_time: session.start_time,
          end_time: session.end_time,
          activity_name: session.activity?.name ?? 'Unknown',
          capacity: session.capacity,
          resort_id: resortId,
          ops_rules_json: session.activity?.ops_rules_json,
          category: session.activity?.category ?? null,
        });
        setAssignDrawerOpen(true);
      }
    }
  };

  const viewTabs = [
    { key: 'sessions' as const, label: 'Sessions' },
    { key: 'staff' as const, label: 'Staff' },
    { key: 'boats' as const, label: 'Boats' },
  ];

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
        <div className="flex items-center gap-1">
          {(isManager || canEditPlanner) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={attentionMode ? 'default' : 'ghost'}
                  size="icon"
                  className={cn('h-9 w-9', attentionMode && 'bg-destructive hover:bg-destructive/90')}
                  onClick={() => {
                    setAttentionMode(!attentionMode);
                    setShowAllRisks(false);
                    if (!attentionMode) {
                      // Jump to today when entering attention mode
                      setWeekDate(format(new Date(), 'yyyy-MM-dd'));
                    }
                  }}
                >
                  <ShieldAlert className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {attentionMode ? 'Exit Attention Mode' : 'Attention Mode'}
              </TooltipContent>
            </Tooltip>
          )}
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* View mode tabs */}
      <SegmentedTabs
        tabs={viewTabs}
        activeKey={viewMode}
        onChange={(k) => setViewMode(k as ViewMode)}
      />

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

      {/* ─── ATTENTION MODE ─── */}
      {attentionMode && viewMode === 'sessions' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <span className="text-sm font-semibold">Attention Required</span>
            <Badge variant="outline" className="text-[10px]">
              {attentionItems.length} item{attentionItems.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {attentionItems.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-8">
                <span className="text-2xl mb-2">✅</span>
                <p className="text-sm font-medium">All clear</p>
                <p className="text-xs text-muted-foreground mt-1">No issues found for today.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {(showAllRisks ? attentionItems : attentionItems.slice(0, 7)).map(s => {
                const conflicts = conflictCounts[s.id] ?? 0;
                const assigns = sessionAssignments[s.id];
                const coverage = computeCoverage({
                  opsRules: s.ops_rules_json,
                  assignedRoles: assigns?.roles ?? {},
                  assignedBoats: assigns?.boats ?? 0,
                  bookedCount: s.booked,
                  category: s.category ?? null,
                  conflictCount: conflicts,
                });

                return (
                  <Card
                    key={s.id}
                    className={cn(
                      'cursor-pointer hover:bg-muted/30 transition-colors',
                      s.coverageStatus === 'red' && 'border-destructive/50',
                      s.coverageStatus === 'amber' && 'border-warning/50',
                    )}
                    onClick={() => handleSessionClick(s.id)}
                  >
                    <CardContent className="py-3 px-4 space-y-1.5">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn(
                            'h-2.5 w-2.5 rounded-full shrink-0',
                            s.coverageStatus === 'green' && 'bg-[hsl(var(--success,142_76%_36%))]',
                            s.coverageStatus === 'amber' && 'bg-[hsl(var(--warning,38_92%_50%))]',
                            s.coverageStatus === 'red' && 'bg-destructive',
                          )} />
                          <span className="text-sm font-mono font-medium text-primary">
                            {s.start_time?.slice(0, 5)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm truncate block">{s.activity_name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs text-muted-foreground">{s.booked}/{s.capacity}</span>
                          {conflicts > 0 && (
                            <Badge variant="outline" className="text-[9px] border-warning/50 text-warning gap-0.5 py-0">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              {conflicts}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {/* Coverage details */}
                      {coverage.details.length > 0 && (
                        <div className="text-[11px] text-muted-foreground pl-[22px] space-y-0.5">
                          {coverage.details.map((d, i) => (
                            <p key={i} className={cn(
                              s.coverageStatus === 'red' && 'text-destructive',
                              s.coverageStatus === 'amber' && 'text-warning',
                            )}>• {d}</p>
                          ))}
                        </div>
                      )}
                      {/* Missing pickup */}
                      {s.missingPickup && (
                        <p className="text-[11px] text-warning pl-[22px] flex items-center gap-1">
                          <Truck className="h-3 w-3" /> No pickup run linked
                        </p>
                      )}
                      {/* Readiness blockers */}
                      {s.readinessBlockerCount > 0 && (
                        <p className="text-[11px] text-warning pl-[22px] flex items-center gap-1">
                          <FileWarning className="h-3 w-3" /> {s.readinessBlockerCount} readiness blocker{s.readinessBlockerCount !== 1 ? 's' : ''}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              {!showAllRisks && attentionItems.length > 7 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setShowAllRisks(true)}
                >
                  Show all {attentionItems.length} risks
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {/* SESSIONS view (weekly grid) */}
      {viewMode === 'sessions' && !attentionMode && (
        <>
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
                const dayConflicts = daySessions.reduce((sum, s) => sum + (conflictCounts[s.id] ?? 0), 0);

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
                      <div className="flex items-center gap-1">
                        {dayConflicts > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-warning font-medium">
                                <AlertTriangle className="h-3 w-3" />
                                {dayConflicts}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {dayConflicts} resource conflict{dayConflicts > 1 ? 's' : ''}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {daySessions.length > 0 && (
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                            {daySessions.length}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {daySessions.slice(0, 4).map(s => {
                        const conflicts = conflictCounts[s.id] ?? 0;
                        return (
                          <div
                            key={s.id}
                            className={cn(
                              'text-[11px] px-1.5 py-1 rounded truncate cursor-pointer transition-colors',
                              conflicts > 0
                                ? 'bg-warning/10 border border-warning/30 hover:bg-warning/20'
                                : 'bg-muted/50 hover:bg-muted'
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSessionClick(s.id);
                            }}
                          >
                            <span className={cn(
                              'inline-block h-1.5 w-1.5 rounded-full mr-1 shrink-0 translate-y-[-0.5px]',
                              s.coverageStatus === 'green' && 'bg-[hsl(var(--success,142_76%_36%))]',
                              s.coverageStatus === 'amber' && 'bg-[hsl(var(--warning,38_92%_50%))]',
                              s.coverageStatus === 'red' && 'bg-destructive',
                            )} />
                            <span className="font-medium">{s.start_time?.slice(0, 5)}</span>{' '}
                            <span className="text-muted-foreground">{s.activity_name}</span>
                            <span className="ml-1 text-muted-foreground">{s.booked}/{s.capacity}</span>
                            {conflicts > 0 && <AlertTriangle className="inline h-3 w-3 ml-1 text-warning" />}
                          </div>
                        );
                      })}
                      {daySessions.length > 4 && (
                        <div className="text-[10px] text-muted-foreground px-1.5">+{daySessions.length - 4} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected day detail (mobile) */}
          {sessionsByDate[dateStr]?.length > 0 && (
            <div className="space-y-2 md:hidden">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {format(selectedDay, 'EEEE, MMM d')} · {sessionsByDate[dateStr].length} sessions
              </div>
              {sessionsByDate[dateStr].map(s => {
                const conflicts = conflictCounts[s.id] ?? 0;
                return (
                  <Card
                    key={s.id}
                    className={cn(
                      'cursor-pointer hover:bg-muted/30 transition-colors',
                      conflicts > 0 && 'border-warning/50'
                    )}
                    onClick={() => handleSessionClick(s.id)}
                  >
                    <CardContent className="flex items-center gap-3 py-3 px-4">
                      <div className="flex items-center gap-2 w-14 shrink-0">
                        <span className={cn(
                          'h-2 w-2 rounded-full shrink-0',
                          s.coverageStatus === 'green' && 'bg-[hsl(var(--success,142_76%_36%))]',
                          s.coverageStatus === 'amber' && 'bg-[hsl(var(--warning,38_92%_50%))]',
                          s.coverageStatus === 'red' && 'bg-destructive',
                        )} />
                        <span className="text-sm font-mono font-medium text-primary">
                          {s.start_time?.slice(0, 5)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{s.activity_name}</div>
                        <div className="text-xs text-muted-foreground">{s.booked}/{s.capacity} booked</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {conflicts > 0 && (
                          <Badge variant="outline" className="text-[10px] border-warning/50 text-warning gap-0.5">
                            <AlertTriangle className="h-3 w-3" />
                            {conflicts}
                          </Badge>
                        )}
                        <StatusChip status={s.status} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* STAFF LANES view */}
      {viewMode === 'staff' && resortId && deptKey && (
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {format(selectedDay, 'EEEE, MMM d')} — Staff Schedule
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <StaffLanesView
                resortId={resortId}
                deptKey={deptKey}
                date={dateStr}
                onSessionClick={handleSessionClick}
              />
            </div>
          </div>
        </div>
      )}

      {/* BOAT/ASSET LANES view */}
      {viewMode === 'boats' && resortId && (
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {format(selectedDay, 'EEEE, MMM d')} — Asset Schedule
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <AssetLanesView
                resortId={resortId}
                date={dateStr}
                onSessionClick={handleSessionClick}
              />
            </div>
          </div>
        </div>
      )}

      {/* Session assignment drawer */}
      <SessionAssignDrawer
        open={assignDrawerOpen}
        onOpenChange={setAssignDrawerOpen}
        session={selectedSessionForAssign}
      />
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
