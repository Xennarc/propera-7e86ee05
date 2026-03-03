/**
 * MasterOpsSheet – Daily ops overview for all staff.
 * Route: /staff/activities/ops/day?date=YYYY-MM-DD&dept=dive
 * Read-only — no write actions.
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { FeatureGate } from '@/components/FeatureGate';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useResort } from '@/contexts/ResortContext';
import { useDailyOpsSheet, type OpsDepartment, type OpsSessionRow } from '@/hooks/useDailyOpsSheet';
import { OpsSheetRowCard, OpsSheetRowCardSkeleton } from '@/components/activities/ops/OpsSheetRowCard';
import { OpsFilterChips, type OpsFilter } from '@/components/activities/ops/OpsFilterChips';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ArrowLeft,
  Search,
  CalendarIcon,
  RefreshCw,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldAlert,
} from 'lucide-react';
import { format, parseISO, addDays, subDays, isToday, isTomorrow, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { loadOpsPrefs, saveOpsPrefs } from '@/hooks/useOpsSheetPreferences';

// ── Constants ────────────────────────────────────────────────────

type DeptKey = 'DIVE' | 'WATERSPORT' | 'EXCURSION';

const DEPT_TABS: Array<{ key: DeptKey; label: string }> = [
  { key: 'DIVE', label: 'Dive' },
  { key: 'WATERSPORT', label: 'Watersports' },
  { key: 'EXCURSION', label: 'Excursions' },
];

const ATTENTION_CAP = 7;

// ── Helpers ──────────────────────────────────────────────────────

function getTimeBlock(startTime: string): 'morning' | 'afternoon' | 'evening' {
  const hour = parseInt(startTime?.slice(0, 2) ?? '0', 10);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

const BLOCK_LABELS: Record<string, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

function formatDateLabel(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'EEE, MMM d');
}

function isStartingSoon(row: OpsSessionRow, dateStr: string): boolean {
  try {
    const sessionStart = new Date(`${dateStr}T${row.start_time}`);
    const now = new Date();
    const diff = differenceInMinutes(sessionStart, now);
    return diff >= 0 && diff <= 90;
  } catch {
    return false;
  }
}

function hasAnyBlocker(row: OpsSessionRow): boolean {
  return (
    row.readiness.missing > 0 ||
    row.readiness.pending_medical > 0 ||
    row.readiness.unverified_certs > 0 ||
    row.conflicts_count > 0 ||
    (!row.pickup && row.readiness.missing > 0) // placeholder for pickup-needed logic
  );
}

// ── Component ────────────────────────────────────────────────────

function MasterOpsSheetContent() {
  const navigate = useNavigate();
  const { currentResort } = useResort();
  const [searchParams, setSearchParams] = useSearchParams();

  // Load persisted prefs
  const prefs = loadOpsPrefs();

  // URL state with fallback to prefs
  const dateParam = searchParams.get('date') || prefs.date || format(new Date(), 'yyyy-MM-dd');
  const deptParam = (searchParams.get('dept')?.toUpperCase() || prefs.dept || 'DIVE') as DeptKey;

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<OpsFilter>((prefs.filter as OpsFilter) || 'all');
  const [attentionMode, setAttentionMode] = useState(prefs.attentionMode ?? false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Persist prefs on change
  useEffect(() => {
    saveOpsPrefs({ dept: deptParam, date: dateParam, filter: activeFilter, attentionMode });
  }, [deptParam, dateParam, activeFilter, attentionMode]);

  const setDate = useCallback((d: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('date', d);
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  const setDept = useCallback((d: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('dept', d.toLowerCase());
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  // Data
  const { data: sheet, isLoading, isError, refetch } = useDailyOpsSheet(
    currentResort?.id,
    dateParam,
    deptParam as OpsDepartment,
  );

  const summary = sheet?.summary;
  const rows = sheet?.rows ?? [];

  // Filter rows
  const filteredRows = useMemo(() => {
    let result = rows;

    // Attention mode: only sessions with blockers
    if (attentionMode) {
      result = result.filter(hasAnyBlocker);
    }

    // Active filter
    switch (activeFilter) {
      case 'starting_soon':
        result = result.filter(r => isStartingSoon(r, dateParam));
        break;
      case 'missing':
        result = result.filter(r => r.readiness.missing > 0);
        break;
      case 'certs':
        result = result.filter(r => r.readiness.unverified_certs > 0);
        break;
      case 'medical':
        result = result.filter(r => r.readiness.pending_medical > 0);
        break;
      case 'pickup':
        result = result.filter(r => r.pickup != null);
        break;
      case 'conflicts':
        result = result.filter(r => r.conflicts_count > 0);
        break;
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.activity_name.toLowerCase().includes(q) ||
        r.location?.toLowerCase().includes(q) ||
        r.assignments.crew.some(c => c.name.toLowerCase().includes(q))
      );
    }

    return result;
  }, [rows, activeFilter, attentionMode, searchQuery, dateParam]);

  // Attention mode cap
  const displayRows = useMemo(() => {
    if (attentionMode && !showAll && filteredRows.length > ATTENTION_CAP) {
      return filteredRows.slice(0, ATTENTION_CAP);
    }
    return filteredRows;
  }, [filteredRows, attentionMode, showAll]);

  const hasMore = attentionMode && !showAll && filteredRows.length > ATTENTION_CAP;

  // Group by time block
  const groupedRows = useMemo(() => {
    const groups = new Map<string, OpsSessionRow[]>();
    for (const r of displayRows) {
      const block = getTimeBlock(r.start_time);
      const list = groups.get(block) || [];
      list.push(r);
      groups.set(block, list);
    }
    return groups;
  }, [displayRows]);

  // Summary pill tap handler — maps pill to filter
  const handlePillTap = useCallback((key: string) => {
    const filterMap: Record<string, OpsFilter> = {
      missing: 'missing',
      medical: 'medical',
      certs: 'certs',
      conflicts: 'conflicts',
    };
    const mapped = filterMap[key];
    if (mapped) {
      setActiveFilter(prev => prev === mapped ? 'all' : mapped);
    }
  }, []);

  // KPI pills
  const kpiPills: Array<{ key: string; label: string; value: number; color: string }> = [
    { key: 'sessions', label: 'Sessions', value: summary?.sessions ?? 0, color: 'text-foreground' },
    { key: 'guests', label: 'Guests', value: summary?.total_guests ?? 0, color: 'text-foreground' },
    { key: 'missing', label: 'Missing Prep', value: summary?.missing_readiness ?? 0, color: summary?.missing_readiness ? 'text-warning' : 'text-muted-foreground' },
    { key: 'medical', label: 'Medical', value: summary?.pending_medical ?? 0, color: summary?.pending_medical ? 'text-amber-600' : 'text-muted-foreground' },
    { key: 'certs', label: 'Certs', value: summary?.unverified_certs ?? 0, color: summary?.unverified_certs ? 'text-destructive' : 'text-muted-foreground' },
    { key: 'conflicts', label: 'Conflicts', value: summary?.conflicts ?? 0, color: summary?.conflicts ? 'text-destructive' : 'text-muted-foreground' },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      {/* ── A) Sticky Top Bar (56px) ── */}
      <div className="sticky top-0 z-30 bg-background border-b border-border/40">
        <div className="flex items-center h-14 px-4 gap-2">
          <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={() => navigate('/staff/activities/ops')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-bold text-foreground flex-1 truncate">
            Master Ops Sheet
          </h1>
          {searchOpen ? (
            <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={() => { setSearchOpen(false); setSearchQuery(''); }}>
              <X className="h-5 w-5" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={() => setSearchOpen(true)}>
              <Search className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Search bar (conditional) */}
        {searchOpen && (
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search activity, location, crew…"
                className="pl-9 text-base h-11"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── B) Sticky Controls Row ── */}
      <div className="sticky top-14 z-20 bg-background border-b border-border/40 space-y-0">
        {/* Date row */}
        <div className="flex items-center h-11 px-4 gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setDate(format(subDays(parseISO(dateParam), 1), 'yyyy-MM-dd'))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="flex-1 h-9 text-sm font-semibold gap-1.5">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                {formatDateLabel(dateParam)}
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  {format(parseISO(dateParam), 'MMM d')}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={parseISO(dateParam)}
                onSelect={(d) => {
                  if (d) {
                    setDate(format(d, 'yyyy-MM-dd'));
                    setCalendarOpen(false);
                  }
                }}
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setDate(format(addDays(parseISO(dateParam), 1), 'yyyy-MM-dd'))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday(parseISO(dateParam)) && (
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs shrink-0" onClick={() => setDate(format(new Date(), 'yyyy-MM-dd'))}>
              Today
            </Button>
          )}
        </div>

        {/* Department tabs */}
        <SegmentedTabs
          tabs={DEPT_TABS.map(d => ({ key: d.key, label: d.label }))}
          activeKey={deptParam}
          onChange={setDept}
        />
      </div>

      {/* ── B2) Attention Mode + Filter Chips ── */}
      <div className="sticky top-[158px] z-10 bg-background border-b border-border/20">
        {/* Attention mode toggle */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <span className="text-xs font-semibold text-foreground">Attention Mode</span>
          </div>
          <Switch
            checked={attentionMode}
            onCheckedChange={(v) => { setAttentionMode(v); setShowAll(false); }}
          />
        </div>

        {/* Filter chips */}
        <OpsFilterChips
          activeFilter={activeFilter}
          onChange={setActiveFilter}
          summary={summary}
        />
      </div>

      {/* ── C) Summary Strip ── */}
      {!isLoading && summary && (
        <div className="px-4 py-2 border-b border-border/20">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {kpiPills.map((pill) => (
              <button
                key={`${pill.key}-${pill.label}`}
                onClick={() => handlePillTap(pill.key)}
                className={cn(
                  'shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-colors whitespace-nowrap border',
                  activeFilter === pill.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border/40 hover:bg-muted/50',
                )}
              >
                <span className={cn('font-bold tabular-nums', activeFilter !== pill.key ? pill.color : '')}>
                  {pill.value}
                </span>
                <span className={activeFilter === pill.key ? '' : 'text-muted-foreground'}>
                  {pill.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── D) Main List ── */}
      <div className="flex-1 pb-safe-bottom">
        {isLoading ? (
          <div className="px-4 py-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <OpsSheetRowCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <p className="text-muted-foreground mb-4">Failed to load ops data</p>
            <Button onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Retry
            </Button>
          </div>
        ) : displayRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {rows.length === 0
                ? 'No sessions scheduled'
                : attentionMode
                  ? 'No sessions need attention'
                  : 'No sessions match filters'}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {rows.length === 0
                ? `${formatDateLabel(dateParam)} · ${DEPT_TABS.find(d => d.key === deptParam)?.label ?? deptParam}`
                : attentionMode
                  ? 'All sessions look good!'
                  : 'Try adjusting your filters'}
            </p>
            {rows.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => navigate('/staff/activities/sessions')}
              >
                View Activities Schedule
              </Button>
            )}
          </div>
        ) : (
          <div className="px-4 py-4 space-y-6">
            {['morning', 'afternoon', 'evening'].map(block => {
              const blockRows = groupedRows.get(block);
              if (!blockRows || blockRows.length === 0) return null;
              return (
                <div key={block} className="space-y-2">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                    {BLOCK_LABELS[block]}
                  </h2>
                  {blockRows.map(row => (
                    <OpsSheetRowCard key={row.session_id} row={row} />
                  ))}
                </div>
              );
            })}

            {/* Show all button for attention mode cap */}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAll(true)}
                  className="text-xs"
                >
                  Show all {filteredRows.length} sessions
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MasterOpsSheet() {
  return (
    <FeatureGate requiredFlags={['enable_activities_ops']} mode="staff">
      <MasterOpsSheetContent />
    </FeatureGate>
  );
}
