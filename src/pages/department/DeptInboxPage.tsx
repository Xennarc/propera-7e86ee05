import { useState, useMemo } from 'react';
import { DepartmentGuard } from '@/components/department/DepartmentGuard';
import { useDepartment } from '@/contexts/DepartmentContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { format, addDays, differenceInMinutes } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { getDepartmentActivityScope } from '@/lib/department-utils';
import { DeptScopeWarningBanner } from '@/components/department/DeptScopeWarningBanner';
import { DepartureCard, type DepartureCardData } from '@/components/activities/ops/DepartureCard';
import { SkeletonCardList } from '@/components/ui/skeleton-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw, CheckCircle2, X } from 'lucide-react';
import { useOpsEvents, useOpsAdapterEnabled } from '@/hooks/useOpsEvents';
import { opsEventToInboxCard } from '@/lib/ops/ops-event-compat';
import { AppToolbar, AppFilterBar, AppEmptyState } from '@/components/ui/app-kit';

type TimeFilter = 'now' | 'next2h' | 'today' | 'tomorrow' | 'all';
const FILTER_CHIPS: { key: TimeFilter; label: string }[] = [
  { key: 'now', label: 'Now' },
  { key: 'next2h', label: 'Next 2h' },
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'all', label: 'All' },
];
const MAX_VISIBLE = 7;
const STARTING_SOON_MINUTES = 60;

function DeptInboxContent() {
  const { currentDepartment } = useDepartment();
  const { deptKey } = useParams<{ deptKey: string }>();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<TimeFilter>('now');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const adapterEnabled = useOpsAdapterEnabled();

  const resortId = currentDepartment?.resort_id;
  const tz = 'UTC';
  const category = getDepartmentActivityScope(currentDepartment);

  // Adapter date range for inbox: today + tomorrow
  const now = new Date();
  const todayStr = format(toZonedTime(now, tz), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(toZonedTime(now, tz), 1), 'yyyy-MM-dd');

  // ── Adapter pipeline (flag gated) ──
  const { data: adapterEvents = [], isLoading: adapterLoading, refetch: adapterRefetch } = useOpsEvents({
    resortId,
    dateRange: { start: todayStr, end: tomorrowStr },
    enabled: adapterEnabled,
  });

  // ── Legacy pipeline (used when adapter flag is OFF) ──
  const { data: sessions = [], isLoading: legacyLoading, refetch: legacyRefetch } = useQuery({
    queryKey: ['dept-ops-inbox', resortId, category],
    queryFn: async () => {
      if (!resortId) return [];
      const selectStr = category
        ? `id, date, start_time, end_time, capacity, status, activity:activities!inner(name, category)`
        : `id, date, start_time, end_time, capacity, status, activity:activities(name, category)`;

      let query = supabase
        .from('activity_sessions')
        .select(selectStr)
        .eq('resort_id', resortId)
        .in('date', [todayStr, tomorrowStr])
        .in('status', ['SCHEDULED', 'CHECK_IN'])
        .order('date')
        .order('start_time');

      if (category) {
        query = query.eq('activity.category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!resortId && !adapterEnabled,
    refetchInterval: 30_000,
  });

  const isLoading = adapterEnabled ? adapterLoading : legacyLoading;
  const refetch = adapterEnabled ? adapterRefetch : legacyRefetch;

  // Booking counts (only for legacy pipeline)
  const sessionIds = useMemo(() => adapterEnabled ? [] : sessions.map((s: any) => s.id), [sessions, adapterEnabled]);
  const { data: bookingCounts = {} } = useQuery({
    queryKey: ['dept-inbox-booking-counts', sessionIds],
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

  // Build departure cards — adapter or legacy pipeline
  const cards = useMemo(() => {
    if (adapterEnabled) {
      // Adapter pipeline: map OpsEvent → DepartureCardData
      return adapterEvents
        .filter(e => e.source_type === 'activity_session')
        .map(e => opsEventToInboxCard(e));
    }

    // Legacy pipeline
    const now = new Date();
    return sessions.map((s: any): DepartureCardData & { _minutesUntil: number } => {
      const activity = s.activity;
      const totalGuests = bookingCounts[s.id] ?? 0;
      const sessionDateTime = new Date(`${s.date}T${s.start_time}`);
      const minutesUntil = differenceInMinutes(sessionDateTime, now);

      return {
        sessionId: s.id,
        activityName: activity?.name ?? 'Unknown',
        status: s.status,
        startTime: s.start_time,
        endTime: s.end_time,
        date: s.date,
        bookedPax: totalGuests,
        capacity: s.capacity,
        startingSoon: minutesUntil <= STARTING_SOON_MINUTES && minutesUntil > 0,
        _minutesUntil: minutesUntil,
      };
    });
  }, [adapterEnabled, adapterEvents, sessions, bookingCounts]);

  // Filter
  const filteredCards = useMemo(() => {
    const now = new Date();
    let result = [...cards];

    if (filter === 'now') {
      result = result.filter(c => c._minutesUntil <= STARTING_SOON_MINUTES);
    } else if (filter === 'next2h') {
      result = result.filter(c => c._minutesUntil <= 120);
    } else if (filter === 'today') {
      const todayStr = format(now, 'yyyy-MM-dd');
      result = result.filter(c => c.date === todayStr);
    } else if (filter === 'tomorrow') {
      const tomorrowStr = format(addDays(now, 1), 'yyyy-MM-dd');
      result = result.filter(c => c.date === tomorrowStr);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.activityName.toLowerCase().includes(q));
    }

    result.sort((a, b) => a._minutesUntil - b._minutesUntil);
    return result;
  }, [cards, filter, searchQuery]);

  const visibleCards = showAll ? filteredCards : filteredCards.slice(0, MAX_VISIBLE);

  return (
    <div className="space-y-4 animate-fade-in">
      <DeptScopeWarningBanner />
      <AppToolbar
        title="Ops Inbox"
        subtitle={`${currentDepartment?.name} · ${filteredCards.length} session${filteredCards.length !== 1 ? 's' : ''}`}
        onRefresh={() => refetch()}
      />

      {/* Filter chips */}
      <AppFilterBar>
        {FILTER_CHIPS.map(chip => (
          <Button
            key={chip.key}
            variant={filter === chip.key ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setFilter(chip.key)}
          >
            {chip.label}
          </Button>
        ))}

        {showSearch ? (
          <div className="flex items-center gap-1 flex-1 min-w-[120px]">
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

      {/* Cards */}
      {isLoading ? (
        <SkeletonCardList count={4} />
      ) : visibleCards.length === 0 ? (
        <AppEmptyState
          icon={CheckCircle2}
          message={filter === 'now' ? 'Nothing starting right now.' : 'No sessions match this filter.'}
        />
      ) : (
        <div className="space-y-2">
          {visibleCards.map(card => (
            <DepartureCard key={card.sessionId} data={card} />
          ))}
          {filteredCards.length > MAX_VISIBLE && !showAll && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setShowAll(true)}
            >
              Show {filteredCards.length - MAX_VISIBLE} more
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function DeptInboxPage() {
  return (
    <DepartmentGuard moduleKey="ops_inbox">
      <DeptInboxContent />
    </DepartmentGuard>
  );
}
