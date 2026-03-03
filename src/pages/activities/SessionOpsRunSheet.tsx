/**
 * SessionOpsRunSheet – Full ops run sheet with tabbed UI.
 * Route: /staff/activities/sessions/:sessionId/ops
 * 
 * Preserves ALL existing logic (session status updates, booking actions, readiness, assets).
 * Adds: sticky header, segmented tabs (Manifest/Setup/Timeline), bottom action strip.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { Activity, ActivitySession, ActivityBooking, Guest } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { BottomActionStrip } from '@/components/ui/bottom-action-strip';
import { StatusChip } from '@/components/ui/status-chip';
import { SkeletonCardList } from '@/components/ui/skeleton-card';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft,
  Users,
  MoreVertical,
  UserCheck,
  Ship,
  Flag,
  Search,
  RefreshCw,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoveSessionSheet } from '@/components/activities/ops/MoveSessionSheet';
import { SessionAssetsPanel } from '@/components/activities/SessionAssetsPanel';
import { GuestReadinessRow, GuestReadinessData, statusToReadinessState, isReadinessComplete, ReadinessStatus } from '@/components/activities/ops/GuestReadinessRow';
import { SessionTimeline, TimelineNode } from '@/components/activities/ops/SessionTimeline';
import { useSessionEvents } from '@/hooks/useSessionEvents';
import { useSessionBookingReadiness } from '@/hooks/useActivityBookingReadiness';
import { parseActivityRequirements, type ActivityRequirements } from '@/lib/activity-requirements';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────

interface SessionWithActivity extends ActivitySession {
  activity: Activity;
}

interface BookingWithGuest extends ActivityBooking {
  guest: Guest;
}

// ── Helpers ────────────────────────────────────────────────────────────

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

function paxCount(b: BookingWithGuest) {
  return b.num_adults + b.num_children;
}

type TabKey = 'manifest' | 'setup' | 'timeline';
type ManifestFilter = 'all' | 'missing' | 'arrived' | 'not_arrived';

// ── Component ──────────────────────────────────────────────────────────

export default function SessionOpsRunSheet() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasResortRole, isSuperAdmin } = useAuth();
  const { currentResort } = useResort();

  const [session, setSession] = useState<SessionWithActivity | null>(null);
  const [bookings, setBookings] = useState<BookingWithGuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('manifest');
  const [manifestFilter, setManifestFilter] = useState<ManifestFilter>('all');
  const [manifestSearch, setManifestSearch] = useState('');

  // DB-backed readiness (new status-based model)
  const bookingIds = useMemo(() => bookings.map(b => b.id), [bookings]);
  const { data: readinessMap = {} } = useSessionBookingReadiness(sessionId, bookingIds);

  // Activity requirements (parsed once session loads)
  const activityRequirements: ActivityRequirements = useMemo(() => {
    if (!session?.activity) return parseActivityRequirements(null);
    return parseActivityRequirements(
      session.activity.requirements_json,
      session.activity.category,
    );
  }, [session?.activity]);

  // Real session events
  const { data: sessionEvents = [] } = useSessionEvents(sessionId);

  // Dialogs
  const [statusConfirm, setStatusConfirm] = useState<'CANCELLED' | 'COMPLETED' | 'DEPARTED' | null>(null);
  const [moveBookingId, setMoveBookingId] = useState<string | null>(null);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const canEdit =
    isSuperAdmin() ||
    (currentResort && hasResortRole(currentResort.id, ['RESORT_ADMIN', 'FRONT_OFFICE', 'ACTIVITIES']));

  const isValidId = sessionId && isValidUUID(sessionId);

  // ── Data fetching ──────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!sessionId || !isValidId) return;
    setLoading(true);
    setFetchError(null);

    const { data: sessionData, error } = await supabase
      .from('activity_sessions')
      .select('*, activity:activities(*)')
      .eq('id', sessionId)
      .single();

    if (error || !sessionData) {
      setFetchError(error?.message ?? 'Session not found');
      setLoading(false);
      return;
    }

    setSession(sessionData as SessionWithActivity);

    const { data: bookingsData } = await supabase
      .from('activity_bookings')
      .select('*, guest:guests(*)')
      .eq('session_id', sessionId)
      .in('status', ['CONFIRMED', 'PENDING', 'COMPLETED'])
      .order('created_at', { ascending: true });

    setBookings((bookingsData ?? []) as BookingWithGuest[]);
    setLoading(false);
  }, [sessionId, isValidId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Session lifecycle actions ────────────────────────────────────────

  const logSessionEvent = useCallback(async (eventType: string, fromStatus: string, toStatus: string) => {
    if (!session) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('session_events').insert({
      session_id: session.id,
      resort_id: session.resort_id,
      event_type: eventType,
      from_status: fromStatus,
      to_status: toStatus,
      actor_user_id: user?.id ?? null,
    });
  }, [session]);

  const transitionSessionStatus = useCallback(async (newStatus: 'CHECK_IN' | 'DEPARTED' | 'COMPLETED' | 'CANCELLED') => {
    if (!session) return;
    setTransitioning(true);
    const oldStatus = session.status;

    // Optimistic update
    setSession(prev => prev ? { ...prev, status: newStatus as any } : prev);

    const { error } = await supabase
      .from('activity_sessions')
      .update({ status: newStatus })
      .eq('id', session.id);

    if (error) {
      // Revert optimistic update
      setSession(prev => prev ? { ...prev, status: oldStatus } : prev);
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      await logSessionEvent(`status_${newStatus.toLowerCase()}`, oldStatus, newStatus);
      toast({ title: 'Saved ✅', description: `Session ${newStatus === 'CHECK_IN' ? 'check-in opened' : `marked as ${newStatus.toLowerCase()}`}` });
    }
    setTransitioning(false);
    setStatusConfirm(null);
  }, [session, logSessionEvent, toast]);

  // ── Per-guest actions ──────────────────────────────────────────────

  const markArrived = useCallback(async (bookingId: string) => {
    const { error } = await supabase
      .from('activity_bookings')
      .update({ status: 'COMPLETED' as any })
      .eq('id', bookingId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Checked in', description: 'Guest marked as arrived' });
      fetchData();
    }
  }, [fetchData, toast]);

  const cancelBooking = useCallback(async (bookingId: string) => {
    const { error } = await supabase
      .from('activity_bookings')
      .update({ status: 'CANCELLED' as any })
      .eq('id', bookingId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Cancelled', description: 'Booking cancelled' });
      fetchData();
    }
    setCancelBookingId(null);
  }, [fetchData, toast]);

  // ── Derived (memoized) ────────────────────────────────────────────

  const activeBookings = useMemo(() => bookings.filter(b => b.status !== 'CANCELLED'), [bookings]);
  const totalPax = useMemo(() => activeBookings.reduce((s, b) => s + paxCount(b), 0), [activeBookings]);
  const arrivedPax = useMemo(() => activeBookings.filter(b => b.status === 'COMPLETED').reduce((s, b) => s + paxCount(b), 0), [activeBookings]);

  // ── Manifest filtering ────────────────────────────────────────────

  const guestRows: GuestReadinessData[] = useMemo(() => {
    return activeBookings.map(b => {
      const dbR = readinessMap[b.id];
      return {
        bookingId: b.id,
        guestName: b.guest.full_name,
        roomNumber: b.room_number,
        partySize: paxCount(b),
        isVip: b.guest.is_vip,
        bookingStatus: b.status,
        waiver: dbR ? statusToReadinessState(dbR.waiver_status) : null,
        medical: dbR ? statusToReadinessState(dbR.medical_status) : null,
        cert: dbR ? statusToReadinessState(dbR.cert_status) : null,
        gear: dbR ? statusToReadinessState(dbR.gear_status) : null,
        waiverStatus: (dbR?.waiver_status ?? 'unknown') as ReadinessStatus,
        medicalStatus: (dbR?.medical_status ?? 'unknown') as ReadinessStatus,
        certStatus: (dbR?.cert_status ?? 'unknown') as ReadinessStatus,
        gearStatus: (dbR?.gear_status ?? 'unknown') as ReadinessStatus,
      };
    });
  }, [activeBookings, readinessMap]);

  /** Count guests whose required readiness is all complete vs missing something */
  const readinessCounts = useMemo(() => {
    let ready = 0;
    let missing = 0;
    for (const g of guestRows) {
      const allDone =
        isReadinessComplete(g.waiverStatus, activityRequirements.requires_waiver) &&
        isReadinessComplete(g.medicalStatus, activityRequirements.requires_medical) &&
        isReadinessComplete(g.certStatus, activityRequirements.requires_cert) &&
        isReadinessComplete(g.gearStatus, activityRequirements.requires_gear);
      if (allDone) ready++;
      else missing++;
    }
    return { ready, missing };
  }, [guestRows, activityRequirements]);

  const filteredGuests = useMemo(() => {
    let result = guestRows;

    if (manifestFilter === 'missing') {
      result = result.filter(g => {
        return (
          !isReadinessComplete(g.waiverStatus, activityRequirements.requires_waiver) ||
          !isReadinessComplete(g.medicalStatus, activityRequirements.requires_medical) ||
          !isReadinessComplete(g.certStatus, activityRequirements.requires_cert) ||
          !isReadinessComplete(g.gearStatus, activityRequirements.requires_gear)
        );
      });
    } else if (manifestFilter === 'arrived') {
      result = result.filter(g => g.bookingStatus === 'COMPLETED');
    } else if (manifestFilter === 'not_arrived') {
      result = result.filter(g => g.bookingStatus !== 'COMPLETED');
    }

    if (manifestSearch.trim()) {
      const q = manifestSearch.toLowerCase();
      result = result.filter(g => g.guestName.toLowerCase().includes(q) || g.roomNumber.includes(q));
    }

    return result;
  }, [guestRows, manifestFilter, manifestSearch, activityRequirements]);
  const filteredGuests = useMemo(() => {
    let result = guestRows;

    if (manifestFilter === 'missing') {
      result = result.filter(g => g.waiver === false || g.cert === false || g.gear === false || g.medical === false);
    } else if (manifestFilter === 'arrived') {
      result = result.filter(g => g.bookingStatus === 'COMPLETED');
    } else if (manifestFilter === 'not_arrived') {
      result = result.filter(g => g.bookingStatus !== 'COMPLETED');
    }

    if (manifestSearch.trim()) {
      const q = manifestSearch.toLowerCase();
      result = result.filter(g => g.guestName.toLowerCase().includes(q) || g.roomNumber.includes(q));
    }

    return result;
  }, [guestRows, manifestFilter, manifestSearch]);

  // ── Derived state from real session status ──────────────────────────

  const checkInOpen = session?.status === 'CHECK_IN' || session?.status === 'DEPARTED' || session?.status === 'COMPLETED';
  const isDeparted = session?.status === 'DEPARTED' || session?.status === 'COMPLETED';
  const isCompleted = session?.status === 'COMPLETED';
  const isCancelled = session?.status === 'CANCELLED';

  // ── Timeline nodes (merge lifecycle milestones + real events) ────────

  const EVENT_LABELS: Record<string, string> = {
    status_check_in: 'Check-in Opened',
    status_departed: 'Departed',
    status_completed: 'Completed',
    status_cancelled: 'Cancelled',
    booking_moved_out: 'Guest Moved Out',
  };

  const timelineNodes: TimelineNode[] = useMemo(() => {
    if (!session) return [];

    // Start with session created
    const nodes: TimelineNode[] = [
      { label: 'Session Created', timestamp: format(parseISO(session.created_at), 'MMM d, HH:mm'), status: 'done' },
    ];

    // Add real events from DB
    for (const evt of sessionEvents) {
      nodes.push({
        label: EVENT_LABELS[evt.event_type] ?? evt.event_type.replace(/_/g, ' '),
        timestamp: format(parseISO(evt.created_at), 'MMM d, HH:mm'),
        status: 'done',
        subtitle: evt.notes ?? undefined,
      });
    }

    // Add upcoming milestones that haven't happened yet
    const eventTypes = new Set(sessionEvents.map(e => e.event_type));
    if (!eventTypes.has('status_check_in') && !checkInOpen) {
      nodes.push({ label: 'Check-in Opened', status: isCancelled ? 'upcoming' : 'upcoming' });
    }
    if (!eventTypes.has('status_departed') && !isDeparted) {
      nodes.push({ label: 'Departed', status: 'upcoming' });
    }
    if (!eventTypes.has('status_completed') && !isCompleted) {
      nodes.push({ label: 'Completed', status: 'upcoming' });
    }

    return nodes;
  }, [session, sessionEvents, checkInOpen, isDeparted, isCompleted, isCancelled]);

  // ── Primary action label ───────────────────────────────────────────

  const primaryAction = useMemo(() => {
    if (!session || isCancelled || isCompleted) return null;
    if (session.status === 'SCHEDULED') return { label: 'Open Check-in', icon: UserCheck, action: () => transitionSessionStatus('CHECK_IN') };
    if (session.status === 'CHECK_IN') return { label: 'Mark Departed', icon: Ship, action: () => setStatusConfirm('DEPARTED') };
    if (session.status === 'DEPARTED') return { label: 'Mark Completed', icon: Flag, action: () => setStatusConfirm('COMPLETED') };
    return null;
  }, [session, isCancelled, isCompleted, transitionSessionStatus]);

  // ── Guard states ───────────────────────────────────────────────────

  if (!isValidId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground mb-4">Invalid session ID</p>
        <Button variant="outline" onClick={() => navigate('/staff/activities/ops')}>Back to Ops Inbox</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-background">
        <div className="sticky top-0 z-30 bg-background border-b border-border/40 h-14 flex items-center px-4 gap-2">
          <div className="h-5 w-5 rounded bg-muted animate-pulse" />
          <div className="h-5 w-32 rounded bg-muted animate-pulse" />
        </div>
        <div className="px-4 py-3 space-y-1.5 border-b border-border/40">
          <div className="h-4 w-40 rounded bg-muted animate-pulse" />
          <div className="h-3 w-28 rounded bg-muted animate-pulse" />
          <div className="h-3 w-20 rounded bg-muted animate-pulse" />
        </div>
        <div className="p-4">
          <SkeletonCardList count={5} variant="row" />
        </div>
      </div>
    );
  }

  // Error/retry state
  if (fetchError || !session?.activity) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
        <p className="text-muted-foreground mb-2">{fetchError ?? 'Session not found'}</p>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={() => navigate('/staff/activities/ops')}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Inbox
          </Button>
          <Button onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const isScheduled = session.status === 'SCHEDULED';
  const canAct = isScheduled || session.status === 'CHECK_IN' || session.status === 'DEPARTED';

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className={cn('flex flex-col min-h-[100dvh] bg-background', canAct && canEdit && 'ops-content-with-bottom-strip')}>
      {/* ── Sticky top bar (56px) — no blur for iOS perf ── */}
      <div className="sticky top-0 z-30 bg-background border-b border-border/40">
        <div className="flex items-center h-14 px-4 gap-2">
          <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={() => navigate('/staff/activities/ops')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-bold text-foreground flex-1 truncate">{session.activity.name}</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/staff/activities/sessions/${session.id}`)}>
                View Session Details
              </DropdownMenuItem>
              {canEdit && (isScheduled || session.status === 'CHECK_IN') && (
                <DropdownMenuItem className="text-destructive" onClick={() => setStatusConfirm('CANCELLED')}>
                  Cancel Session
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Sticky header block (~100px) — solid bg, no blur ── */}
      <div className="sticky top-14 z-20 bg-background border-b border-border/40 px-4 py-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground truncate">{session.activity.name}</span>
          <StatusChip status={session.status} />
        </div>
        <p className="text-xs text-muted-foreground">
          {format(parseISO(session.date), 'EEE, MMM d')} · {session.start_time.slice(0, 5)}–{session.end_time.slice(0, 5)}
        </p>
        <div className="flex items-center gap-1 text-xs">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium text-foreground">{totalPax}/{session.capacity}</span>
          <span className="text-muted-foreground">Guests</span>
          {arrivedPax > 0 && (
            <span className="text-success ml-1.5">· {arrivedPax} arrived</span>
          )}
        </div>
      </div>

      {/* ── Segmented tabs (sticky, 44px) ── */}
      <div className="sticky top-[158px] z-20 bg-background px-4">
        <SegmentedTabs
          tabs={[
            { key: 'manifest', label: 'Manifest', badge: activeBookings.length || undefined },
            { key: 'setup', label: 'Setup' },
            { key: 'timeline', label: 'Timeline' },
          ]}
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as TabKey)}
        />
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1">
        {/* ── MANIFEST TAB ── */}
        {activeTab === 'manifest' && (
          <div className="space-y-0">
            {/* Sticky search */}
            <div className="sticky top-[202px] z-10 bg-background px-4 pt-3 pb-2 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search guest…"
                  className="pl-9 text-base h-11"
                  value={manifestSearch}
                  onChange={e => setManifestSearch(e.target.value)}
                  onFocus={e => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                {([
                  { key: 'all' as ManifestFilter, label: 'All' },
                  { key: 'missing' as ManifestFilter, label: 'Missing readiness' },
                  { key: 'arrived' as ManifestFilter, label: 'Arrived' },
                  { key: 'not_arrived' as ManifestFilter, label: 'Not arrived' },
                ]).map(chip => (
                  <button
                    key={chip.key}
                    onClick={() => setManifestFilter(chip.key)}
                    className={cn(
                      'shrink-0 h-8 px-3 rounded-full text-xs font-medium transition-colors whitespace-nowrap min-w-[44px]',
                      manifestFilter === chip.key
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Guest list */}
            <div className="px-4 pb-4 space-y-2">
              {filteredGuests.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-muted-foreground">
                  <Users className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm font-medium">
                    {activeBookings.length === 0 ? 'No guests booked' : 'No guests match filters'}
                  </p>
                  {activeBookings.length === 0 && (
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/staff/activities/sessions/${session.id}`)}>
                        View Session Details
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate('/staff/activities/ops')}>
                        Back to Inbox
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                filteredGuests.map(g => (
                  <GuestReadinessRow
                    key={g.bookingId}
                    data={g}
                    checkInOpen={checkInOpen}
                    onMarkArrived={canEdit ? markArrived : undefined}
                    onMoveSession={canEdit ? (id) => setMoveBookingId(id) : undefined}
                    onCancel={canEdit ? (id) => setCancelBookingId(id) : undefined}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* ── SETUP TAB ── */}
        {activeTab === 'setup' && (
          <div className="px-4 py-4 space-y-4">
            {/* Session info card */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Session Details</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Lead Staff</span>
                    <span className="font-medium text-foreground">
                      {session.lead_staff_id ? 'Assigned' : 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Resource</span>
                    <span className="font-medium text-foreground">
                      {session.resource_id ? 'Assigned' : 'Unassigned'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assets panel (from Phase 3) */}
            <SessionAssetsPanel
              sessionId={session.id}
              resortId={session.resort_id}
              sessionDate={session.date}
              sessionStartTime={session.start_time}
              sessionEndTime={session.end_time}
              canEdit={!!canEdit}
            />

            {/* Notes section */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">Notes</h3>
                <div className="text-sm text-muted-foreground rounded-lg bg-muted/30 p-3 min-h-[60px]">
                  {session.notes ? (
                    <p className="whitespace-pre-wrap">{session.notes}</p>
                  ) : (
                    <p className="italic opacity-60">No notes added yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── TIMELINE TAB ── */}
        {activeTab === 'timeline' && (
          <div className="px-4 py-4 space-y-3">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Session Lifecycle</h3>
                <SessionTimeline nodes={timelineNodes} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ── Bottom Action Strip ── */}
      <BottomActionStrip visible={!!canEdit && canAct}>
        {primaryAction && (
          <Button className="flex-1 h-12 text-base" onClick={primaryAction.action} disabled={transitioning}>
            <primaryAction.icon className="h-5 w-5 mr-2" />
            {primaryAction.label}
          </Button>
        )}
        {session.status === 'CHECK_IN' && (
          <Button
            variant="outline"
            className="h-12 px-4"
            onClick={() => setStatusConfirm('COMPLETED')}
            disabled={transitioning}
          >
            <Flag className="h-4 w-4 mr-1.5" />
            Complete
          </Button>
        )}
      </BottomActionStrip>

      {/* ── Dialogs ── */}
      <AlertDialog open={!!statusConfirm} onOpenChange={() => setStatusConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusConfirm === 'CANCELLED' ? 'Cancel Session'
                : statusConfirm === 'DEPARTED' ? 'Mark as Departed'
                : 'Complete Session'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusConfirm === 'CANCELLED'
                ? 'This will cancel the session. Active bookings may need to be handled separately.'
                : statusConfirm === 'DEPARTED'
                ? 'Mark this session as departed? Guests will no longer be able to check in.'
                : 'Mark this session as completed? This action is irreversible.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              className={statusConfirm === 'CANCELLED' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
              onClick={() => statusConfirm && transitionSessionStatus(statusConfirm as any)}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!cancelBookingId} onOpenChange={() => setCancelBookingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this booking? The guest will lose their spot.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => cancelBookingId && cancelBooking(cancelBookingId)}
            >
              Cancel Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {moveBookingId && session && (
        <MoveSessionSheet
          open={!!moveBookingId}
          onOpenChange={(open) => !open && setMoveBookingId(null)}
          bookingId={moveBookingId}
          currentSessionId={session.id}
          activityId={session.activity_id}
          resortId={session.resort_id}
          onMoved={() => {
            setMoveBookingId(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
