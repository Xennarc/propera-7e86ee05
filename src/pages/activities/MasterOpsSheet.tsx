/**
 * MasterOpsSheet – Daily ops overview for all staff.
 * Route: /staff/activities/ops/day?date=YYYY-MM-DD&dept=dive
 * Read-only — no write actions.
 */
import { useState, useMemo, useCallback } from 'react';
import { FeatureGate } from '@/components/FeatureGate';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useResort } from '@/contexts/ResortContext';
import { useDailyOpsSheet, type OpsDepartment, type OpsSessionRow } from '@/hooks/useDailyOpsSheet';
import { OpsSheetRowCard, OpsSheetRowCardSkeleton } from '@/components/activities/ops/OpsSheetRowCard';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  List,
  LayoutGrid,
} from 'lucide-react';
import { format, parseISO, addDays, subDays, isToday, isTomorrow } from 'date-fns';
import { cn } from '@/lib/utils';

// ── Constants ────────────────────────────────────────────────────

type DeptKey = 'DIVE' | 'WATERSPORT' | 'EXCURSION';

const DEPT_TABS: Array<{ key: DeptKey; label: string }> = [
  { key: 'DIVE', label: 'Dive' },
  { key: 'WATERSPORT', label: 'Watersports' },
  { key: 'EXCURSION', label: 'Excursions' },
];

type SummaryFilter = 'all' | 'missing' | 'conflicts' | 'medical' | 'certs';

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

// ── Component ────────────────────────────────────────────────────

function MasterOpsSheetContent() {
  const navigate = useNavigate();
  const { currentResort } = useResort();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const dateParam = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
  const deptParam = (searchParams.get('dept')?.toUpperCase() || 'DIVE') as DeptKey;

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>('all');
  const [calendarOpen, setCalendarOpen] = useState(false);

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

    // Summary filter
    if (summaryFilter === 'missing') {
      result = result.filter(r => r.readiness.missing > 0);
    } else if (summaryFilter === 'conflicts') {
      result = result.filter(r => r.conflicts_count > 0);
    } else if (summaryFilter === 'medical') {
      result = result.filter(r => r.readiness.pending_medical > 0);
    } else if (summaryFilter === 'certs') {
      result = result.filter(r => r.readiness.unverified_certs > 0);
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
  }, [rows, summaryFilter, searchQuery]);

  // Group by time block
  const groupedRows = useMemo(() => {
    const groups = new Map<string, OpsSessionRow[]>();
    for (const r of filteredRows) {
      const block = getTimeBlock(r.start_time);
      const list = groups.get(block) || [];
      list.push(r);
      groups.set(block, list);
    }
    return groups;
  }, [filteredRows]);

  // KPI pills
  const kpiPills: Array<{ key: SummaryFilter; label: string; value: number; color: string }> = [
    { key: 'all', label: 'Sessions', value: summary?.sessions ?? 0, color: 'text-foreground' },
    { key: 'all', label: 'Guests', value: summary?.total_guests ?? 0, color: 'text-foreground' },
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

      {/* ── C) Summary Strip ── */}
      {!isLoading && summary && (
        <div className="sticky top-[158px] z-10 bg-background px-4 py-2 border-b border-border/20">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {kpiPills.map((pill, i) => (
              <button
                key={`${pill.key}-${pill.label}`}
                onClick={() => setSummaryFilter(pill.key === summaryFilter ? 'all' : pill.key)}
                className={cn(
                  'shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-colors whitespace-nowrap border',
                  summaryFilter === pill.key && pill.key !== 'all'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border/40 hover:bg-muted/50',
                )}
              >
                <span className={cn('font-bold tabular-nums', summaryFilter !== pill.key ? pill.color : '')}>
                  {pill.value}
                </span>
                <span className={summaryFilter === pill.key && pill.key !== 'all' ? '' : 'text-muted-foreground'}>
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
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {rows.length === 0
                ? 'No sessions scheduled'
                : 'No sessions match filters'}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {rows.length === 0
                ? `${formatDateLabel(dateParam)} · ${DEPT_TABS.find(d => d.key === deptParam)?.label ?? deptParam}`
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
