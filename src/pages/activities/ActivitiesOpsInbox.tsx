/**
 * ActivitiesOpsInbox – Mobile-first action inbox for upcoming sessions.
 * Route: /staff/activities/ops
 */
import { useState, useMemo } from 'react';
import { FeatureGate } from '@/components/FeatureGate';

import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { useQuery } from '@tanstack/react-query';
import { format, addHours, addDays, differenceInMinutes } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { DepartureCard, DepartureCardData } from '@/components/activities/ops/DepartureCard';
import { SkeletonCardList } from '@/components/ui/skeleton-card';
import { Search, SlidersHorizontal, WifiOff, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ConnectionBanner } from '@/components/ui/connection-banner';
import { parseActivityRequirements } from '@/lib/activity-requirements';
import { isReadinessComplete } from '@/components/activities/ops/GuestReadinessRow';

type TimeFilter = 'now' | 'next2h' | 'today' | 'tomorrow' | 'all';

const FILTER_CHIPS: { key: TimeFilter; label: string }[] = [
  { key: 'now', label: 'Now' },
  { key: 'next2h', label: 'Next 2h' },
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'all', label: 'All' },
];

const MAX_VISIBLE = 7;
/** Sessions starting within this many minutes are "starting soon" */
const STARTING_SOON_MINUTES = 60;

function ActivitiesOpsInboxContent() {
  const { currentResort } = useResort();
  
  const [filter, setFilter] = useState<TimeFilter>('now');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  const tz = currentResort?.timezone ?? 'UTC';

  // Fetch upcoming sessions (today + tomorrow)
  const { data: sessions = [], isLoading, isError, refetch } = useQuery({
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
          activity:activities(name, category, requirements_json)
        `)
        .eq('resort_id', currentResort.id)
        .in('date', [todayStr, tomorrowStr])
        .in('status', ['SCHEDULED', 'CHECK_IN'])
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

  // Fetch readiness for all sessions in bulk
  const { data: readinessBySession = {} } = useQuery({
    queryKey: ['ops-inbox-readiness', sessionIds],
    queryFn: async () => {
      if (sessionIds.length === 0) return {};
      const { data } = await supabase
        .from('activity_booking_readiness')
        .select('session_id, waiver_status, medical_status, cert_status, gear_status')
        .in('session_id', sessionIds);

      // Group by session_id
      const grouped: Record<string, any[]> = {};
      for (const r of data ?? []) {
        if (!grouped[r.session_id]) grouped[r.session_id] = [];
        grouped[r.session_id].push(r);
      }
      return grouped;
    },
    enabled: sessionIds.length > 0,
    staleTime: 10_000,
  });

  // Resolve CTA label based on session state
  const getCtaLabel = (status: string, startTime: string, date: string): string => {
    const sessionDateTime = `${date}T${startTime}`;
    const sessionStart = new Date(sessionDateTime);
    const now = new Date();
    const minutesUntil = (sessionStart.getTime() - now.getTime()) / 60000;

    if (status === 'IN_PROGRESS' || status === 'CHECK_IN') return 'Open Check-in';
    if (status === 'COMPLETED' || status === 'CANCELLED') return 'Review Session';
    if (minutesUntil <= 120 && minutesUntil > 0) return 'Open Check-in';
    return 'View Run Sheet';
  };

  /** Count missing readiness for a session given its activity requirements */
  const getMissingPrepCount = (sessionId: string, activity: any): number => {
    const rows = readinessBySession[sessionId];
    if (!rows || rows.length === 0) return 0;
    const reqs = parseActivityRequirements(activity?.requirements_json, activity?.category);
    let missing = 0;
    for (const r of rows) {
      const allDone =
        isReadinessComplete(r.waiver_status, reqs.requires_waiver) &&
        isReadinessComplete(r.medical_status, reqs.requires_medical) &&
        isReadinessComplete(r.cert_status, reqs.requires_cert) &&
        isReadinessComplete(r.gear_status, reqs.requires_gear);
      if (!allDone) missing++;
    }
    return missing;
  };

  // Build card data
  const cards: DepartureCardData[] = useMemo(() => {
    const now = new Date();
    return sessions.map((s: any) => {
      const st = s.start_time?.slice(0, 5) ?? '';
      const sessionStart = new Date(`${s.date}T${s.start_time}`);
      const minutesUntil = differenceInMinutes(sessionStart, now);
      const missingPrep = getMissingPrepCount(s.id, s.activity);

      return {
        sessionId: s.id,
        activityName: s.activity?.name ?? 'Unknown',
        status: s.status as string,
        startTime: st,
        endTime: s.end_time?.slice(0, 5) ?? '',
        date: s.date,
        bookedPax: bookingCounts[s.id] ?? 0,
        capacity: s.capacity,
        ctaLabel: getCtaLabel(s.status, st, s.date),
        missingPrep,
        startingSoon: minutesUntil >= 0 && minutesUntil <= STARTING_SOON_MINUTES,
      };
    });
  }, [sessions, bookingCounts, readinessBySession]);

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

    // Attention-based sorting: missing prep + starting soon first
    result = [...result].sort((a, b) => {
      const aMissing = (a.missingPrep ?? 0) > 0;
      const bMissing = (b.missingPrep ?? 0) > 0;
      const aSoon = a.startingSoon ?? false;
      const bSoon = b.startingSoon ?? false;

      // Tier 1: starting soon + missing prep
      const aTier1 = aSoon && aMissing ? 1 : 0;
      const bTier1 = bSoon && bMissing ? 1 : 0;
      if (aTier1 !== bTier1) return bTier1 - aTier1;

      // Tier 2: check-in open + missing prep
      const aCheckIn = a.status === 'CHECK_IN';
      const bCheckIn = b.status === 'CHECK_IN';
      const aTier2 = aCheckIn && aMissing ? 1 : 0;
      const bTier2 = bCheckIn && bMissing ? 1 : 0;
      if (aTier2 !== bTier2) return bTier2 - aTier2;

      // Tier 3: any missing prep
      if (aMissing !== bMissing) return aMissing ? -1 : 1;

      // Tier 4: today first
      const aIsToday = a.date === todayStr ? 1 : 0;
      const bIsToday = b.date === todayStr ? 1 : 0;
      if (aIsToday !== bIsToday) return bIsToday - aIsToday;

      // Within same day, earlier start first
      if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);

      // Sessions with bookings rank higher
      const aHasBookings = a.bookedPax > 0 ? 1 : 0;
      const bHasBookings = b.bookedPax > 0 ? 1 : 0;
      return bHasBookings - aHasBookings;
    });

    return result;
  }, [cards, filter, searchQuery, todayStr, tomorrowStr, nowTimeStr, plus2hStr]);

  const visibleCards = showAll ? filtered : filtered.slice(0, MAX_VISIBLE);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <ConnectionBanner />
      {/* ── Sticky top bar (56px) ── */}
      <div className="sticky top-0 z-30 bg-background border-b border-border/40">
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
          <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-center gap-2 text-xs text-destructive">
              <WifiOff className="h-4 w-4 shrink-0" />
              Unable to load sessions. Check your connection.
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Retry
            </Button>
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

export default function ActivitiesOpsInbox() {
  return (
    <FeatureGate requiredFlags={['enable_activities_ops']} mode="staff">
      <ActivitiesOpsInboxContent />
    </FeatureGate>
  );
}