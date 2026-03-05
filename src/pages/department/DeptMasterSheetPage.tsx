import { useState, useMemo, useCallback } from 'react';
import { DepartmentGuard } from '@/components/department/DepartmentGuard';
import { useDepartment } from '@/contexts/DepartmentContext';
import { useDailyOpsSheet, type OpsSessionRow } from '@/hooks/useDailyOpsSheet';
import { getDepartmentOpsScope } from '@/lib/department-utils';
import { DeptScopeWarningBanner } from '@/components/department/DeptScopeWarningBanner';
import { useOpsAdapterEnabled } from '@/hooks/useOpsEvents';
import { OpsSheetRowCard, OpsSheetRowCardSkeleton } from '@/components/activities/ops/OpsSheetRowCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useParams, useSearchParams } from 'react-router-dom';
import { format, parseISO, addDays, subDays, isToday } from 'date-fns';
import { Search, CalendarIcon, ChevronLeft, ChevronRight, RefreshCw, ShieldAlert, X } from 'lucide-react';
import { AppToolbar, AppFilterBar, AppEmptyState, AppTimeBlock } from '@/components/ui/app-kit';

function getTimeBlock(startTime: string): 'morning' | 'afternoon' | 'evening' {
  const hour = parseInt(startTime?.slice(0, 2) ?? '0', 10);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

const BLOCK_LABELS = { morning: '🌅 Morning', afternoon: '☀️ Afternoon', evening: '🌙 Evening' };

function DeptMasterSheetContent() {
  const { currentDepartment } = useDepartment();
  const { deptKey } = useParams<{ deptKey: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const adapterEnabled = useOpsAdapterEnabled();

  const dateStr = searchParams.get('date') ?? format(new Date(), 'yyyy-MM-dd');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [attentionMode, setAttentionMode] = useState(false);

  const opsDept = getDepartmentOpsScope(currentDepartment);
  const resortId = currentDepartment?.resort_id;

  // Master Sheet uses a dedicated RPC for rich aggregated data.
  // When adapter flag is enabled, future work will replace this with
  // adapter-based enrichment. For now the RPC remains the source of truth.
  const { data: sheet, isLoading, refetch } = useDailyOpsSheet(resortId, dateStr, opsDept);

  const setDate = useCallback((d: string) => {
    setSearchParams({ date: d });
  }, [setSearchParams]);

  const rows = useMemo(() => {
    let r = sheet?.rows ?? [];
    if (attentionMode) {
      r = r.filter(s => s.readiness.missing > 0 || s.conflicts_count > 0 || s.blockers.length > 0);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      r = r.filter(s => s.activity_name.toLowerCase().includes(q));
    }
    return r;
  }, [sheet?.rows, attentionMode, searchQuery]);

  const grouped = useMemo(() => {
    const groups: Record<string, OpsSessionRow[]> = { morning: [], afternoon: [], evening: [] };
    rows.forEach(r => { groups[getTimeBlock(r.start_time)].push(r); });
    return groups;
  }, [rows]);

  const summary = sheet?.summary;

  return (
    <div className="space-y-4 animate-fade-in">
      <DeptScopeWarningBanner />
      <AppToolbar
        title={`${currentDepartment?.name} Ops`}
        subtitle={`${isToday(parseISO(dateStr)) ? 'Today' : format(parseISO(dateStr), 'EEE, MMM d')}${summary ? ` · ${summary.sessions} sessions · ${summary.total_guests} guests` : ''}`}
        onRefresh={() => refetch()}
      />

      {/* Date nav + search + attention */}
      <AppFilterBar>
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDate(format(subDays(parseISO(dateStr), 1), 'yyyy-MM-dd'))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                <CalendarIcon className="h-3.5 w-3.5" />
                {format(parseISO(dateStr), 'MMM d')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={parseISO(dateStr)}
                onSelect={(d) => d && setDate(format(d, 'yyyy-MM-dd'))}
              />
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDate(format(addDays(parseISO(dateStr), 1), 'yyyy-MM-dd'))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant={attentionMode ? 'default' : 'outline'}
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setAttentionMode(!attentionMode)}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          Attention
        </Button>

        {showSearch ? (
          <div className="flex items-center gap-1 flex-1 min-w-[140px]">
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-8 text-xs"
              autoFocus
            />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowSearch(false); setSearchQuery(''); }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSearch(true)}>
            <Search className="h-4 w-4" />
          </Button>
        )}
      </AppFilterBar>

      {/* Sessions list grouped by time block */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <OpsSheetRowCardSkeleton key={i} />)}
        </div>
      ) : rows.length === 0 ? (
        <AppEmptyState
          message={attentionMode ? 'No sessions need attention.' : 'No sessions scheduled.'}
        />
      ) : (
        <div className="space-y-6 stagger-fade">
          {(['morning', 'afternoon', 'evening'] as const).map(block => {
            const blockRows = grouped[block];
            if (blockRows.length === 0) return null;
            return (
              <AppTimeBlock key={block} label={BLOCK_LABELS[block]} count={blockRows.length}>
                {blockRows.map(row => (
                  <OpsSheetRowCard key={row.session_id} row={row} />
                ))}
              </AppTimeBlock>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DeptMasterSheetPage() {
  return (
    <DepartmentGuard moduleKey="master_ops_sheet">
      <DeptMasterSheetContent />
    </DepartmentGuard>
  );
}
