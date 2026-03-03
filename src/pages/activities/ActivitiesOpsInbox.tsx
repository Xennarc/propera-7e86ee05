/**
 * ActivitiesOpsInbox – Mobile-first action inbox for upcoming sessions.
 * Route: /staff/activities/ops
 */
import { useState, useMemo } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { useQuery } from '@tanstack/react-query';
import { format, addHours, addDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { DepartureCard, DepartureCardData } from '@/components/activities/ops/DepartureCard';
import { SkeletonCardList } from '@/components/ui/skeleton-card';
import { Search, SlidersHorizontal, WifiOff, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type TimeFilter = 'now' | 'next2h' | 'today' | 'tomorrow' | 'all';

const FILTER_CHIPS: { key: TimeFilter; label: string }[] = [
  { key: 'now', label: 'Now' },
  { key: 'next2h', label: 'Next 2h' },
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'all', label: 'All' },
];

const MAX_VISIBLE = 7;

export default function ActivitiesOpsInbox() {
  const { currentResort } = useResort();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<TimeFilter>('now');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  const tz = currentResort?.timezone ?? 'UTC';

  // Fetch upcoming sessions (today + tomorrow)
  const { data: sessions = [], isLoading, isError } = useQuery({
    queryKey: ['ops-inbox-sessions', currentResort?.id],
    queryFn: async () => {
      if (!currentResort) return [];
      const now = new Date();
      const todayStr = format(toZonedTime(now, tz), 'yyyy-MM-dd');
      const tomorrowStr = format(addDays(toZonedTime(now, tz), 1), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('activity_sessions')
        .select(`
          id, date, start_time, end_time, capacity, status,
          activity:activities(name, category)
        `)
        .eq('resort_id', currentResort.id)
        .in('date', [todayStr, tomorrowStr])
        .eq('status', 'SCHEDULED')
        .order('date')
        .order('start_time');

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!currentResort,
    refetchInterval: 30_000,
  });

  // Fetch booking counts per session
  const sessionIds = useMemo(() => sessions.map((s: any) => s.id), [sessions]);
  const { data: bookingCounts = {} } = useQuery({
    queryKey: ['ops-inbox-booking-counts', sessionIds],
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

  // Build card data
  const cards: DepartureCardData[] = useMemo(() => {
    return sessions.map((s: any) => ({
      sessionId: s.id,
      activityName: s.activity?.name ?? 'Unknown',
      status: s.status as string,
      startTime: s.start_time?.slice(0, 5) ?? '',
      endTime: s.end_time?.slice(0, 5) ?? '',
      date: s.date,
      bookedPax: bookingCounts[s.id] ?? 0,
      capacity: s.capacity,
    }));
  }, [sessions, bookingCounts]);

  // Filter
  const nowInResort = useMemo(() => toZonedTime(new Date(), tz), [tz]);
  const nowTimeStr = format(nowInResort, 'HH:mm');
  const plus2hStr = format(addHours(nowInResort, 2), 'HH:mm');
  const todayStr = format(nowInResort, 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(nowInResort, 1), 'yyyy-MM-dd');

  const filtered = useMemo(() => {
    let result = cards;

    // Time filter
    if (filter === 'now') {
      result = result.filter(c => c.date === todayStr && c.startTime >= nowTimeStr);
    } else if (filter === 'next2h') {
      result = result.filter(c => c.date === todayStr && c.startTime >= nowTimeStr && c.startTime <= plus2hStr);
    } else if (filter === 'today') {
      result = result.filter(c => c.date === todayStr);
    } else if (filter === 'tomorrow') {
      result = result.filter(c => c.date === tomorrowStr);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.activityName.toLowerCase().includes(q));
    }

    return result;
  }, [cards, filter, searchQuery, todayStr, tomorrowStr, nowTimeStr, plus2hStr]);

  const visibleCards = showAll ? filtered : filtered.slice(0, MAX_VISIBLE);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      {/* ── Sticky top bar (56px) ── */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="flex items-center h-14 px-4 gap-2">
          <h1 className="text-lg font-bold text-foreground flex-1">Activities Ops</h1>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onClick={() => setShowSearch(v => !v)}
          >
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-11 w-11" disabled>
            <SlidersHorizontal className="h-5 w-5" />
          </Button>
        </div>

        {/* Search input */}
        {showSearch && (
          <div className="px-4 pb-2">
            <Input
              placeholder="Search activities…"
              className="text-base h-11"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
              onFocus={e => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            />
          </div>
        )}

        {/* ── Sticky chip row (44px) ── */}
        <div className="flex items-center gap-2 px-4 pb-2 overflow-x-auto scrollbar-none snap-x snap-mandatory">
          {FILTER_CHIPS.map(chip => (
            <button
              key={chip.key}
              onClick={() => { setFilter(chip.key); setShowAll(false); }}
              className={cn(
                'snap-start shrink-0 h-[36px] px-4 rounded-full text-sm font-medium transition-colors min-w-[44px]',
                filter === chip.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 px-4 py-4 space-y-3">
        {/* Offline banner (placeholder) */}
        {isError && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <WifiOff className="h-4 w-4 shrink-0" />
            Unable to load sessions. Check your connection.
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && <SkeletonCardList count={7} variant="card" />}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-base font-medium">All clear</p>
            <p className="text-sm mt-1">No upcoming sessions{filter !== 'all' ? ' in this time range' : ''}</p>
          </div>
        )}

        {/* Cards */}
        {!isLoading && visibleCards.map(card => (
          <DepartureCard key={card.sessionId} data={card} />
        ))}

        {/* View all link */}
        {!isLoading && !showAll && filtered.length > MAX_VISIBLE && (
          <button
            className="w-full text-center py-3 text-sm font-medium text-primary hover:underline"
            onClick={() => setShowAll(true)}
          >
            View all ({filtered.length} sessions)
          </button>
        )}
      </div>
    </div>
  );
}
