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
import { MoveSessionDialog } from '@/components/activities/MoveSessionDialog';
import { useSessionReadiness } from '@/hooks/useBookingReadiness';
import { SessionAssetsPanel } from '@/components/activities/SessionAssetsPanel';
import { GuestReadinessRow, GuestReadinessData } from '@/components/activities/ops/GuestReadinessRow';
import { SessionTimeline, TimelineNode } from '@/components/activities/ops/SessionTimeline';
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
  const [activeTab, setActiveTab] = useState<TabKey>('manifest');
  const [manifestFilter, setManifestFilter] = useState<ManifestFilter>('all');
  const [manifestSearch, setManifestSearch] = useState('');

  // DB-backed readiness
  const bookingIds = useMemo(() => bookings.map(b => b.id), [bookings]);
  const { data: readinessMap = {} } = useSessionReadiness(bookingIds);

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

    const { data: sessionData, error } = await supabase
      .from('activity_sessions')
      .select('*, activity:activities(*)')
      .eq('id', sessionId)
      .single();

    if (error || !sessionData) {
      toast({ variant: 'destructive', title: 'Error', description: error?.message ?? 'Session not found' });
      navigate('/staff/activities/sessions');
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

  const logSessionEvent = async (eventType: string, fromStatus: string, toStatus: string) => {
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
  };

  const transitionSessionStatus = async (newStatus: 'CHECK_IN' | 'DEPARTED' | 'COMPLETED' | 'CANCELLED') => {
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
  };

  // ── Per-guest actions ──────────────────────────────────────────────

  const markArrived = async (bookingId: string) => {
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
  };

  const cancelBooking = async (bookingId: string) => {
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
  };

  // ── Derived ────────────────────────────────────────────────────────

  const activeBookings = bookings.filter(b => b.status !== 'CANCELLED');
  const confirmedPax = activeBookings.filter(b => b.status === 'CONFIRMED').reduce((s, b) => s + paxCount(b), 0);
  const totalPax = activeBookings.reduce((s, b) => s + paxCount(b), 0);
  const arrivedPax = activeBookings.filter(b => b.status === 'COMPLETED').reduce((s, b) => s + paxCount(b), 0);

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
        waiver: dbR ? dbR.waiver_signed : null,
        medical: null,
        cert: dbR ? dbR.cert_verified : null,
        gear: dbR ? (dbR.sizes_confirmed && dbR.gear_confirmed) : null,
      };
    });
  }, [activeBookings, readinessMap]);

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

  // ── Timeline nodes ─────────────────────────────────────────────────

  const timelineNodes: TimelineNode[] = useMemo(() => {
    if (!session) return [];
    return [
      { label: 'Session Created', timestamp: format(parseISO(session.created_at), 'MMM d, HH:mm'), status: 'done' },
      { label: 'Check-in Opened', status: checkInOpen ? 'done' : 'upcoming' },
      { label: 'Departed', status: isDeparted ? 'done' : 'upcoming' },
      { label: 'Completed', status: isCompleted ? 'done' : 'upcoming' },
    ];
  }, [session, checkInOpen, isDeparted, isCompleted]);

  // ── Primary action label ───────────────────────────────────────────

  const primaryAction = useMemo(() => {
    if (!session || isCancelled || isCompleted) return null;
    if (session.status === 'SCHEDULED') return { label: 'Open Check-in', icon: UserCheck, action: () => transitionSessionStatus('CHECK_IN') };
    if (session.status === 'CHECK_IN') return { label: 'Mark Departed', icon: Ship, action: () => setStatusConfirm('DEPARTED') };
    if (session.status === 'DEPARTED') return { label: 'Mark Completed', icon: Flag, action: () => setStatusConfirm('COMPLETED') };
    return null;
  }, [session, isCancelled, isCompleted]);

  // ── Guard states ───────────────────────────────────────────────────

  if (!isValidId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground mb-4">Invalid session ID</p>
        <Button variant="outline" onClick={() => navigate('/staff/activities/sessions')}>Back to Sessions</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-background">
        <div className="sticky top-0 z-30 bg-background border-b border-border/40 h-14 flex items-center px-4">
          <div className="h-5 w-32 rounded bg-muted animate-pulse" />
        </div>
        <div className="p-4">
          <SkeletonCardList count={5} variant="row" />
        </div>
      </div>
    );
  }

  if (!session?.activity) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Session not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/staff/activities/sessions')}>Back to Sessions</Button>
      </div>
    );
  }

  const isScheduled = session.status === 'SCHEDULED';
  const canAct = isScheduled || session.status === 'CHECK_IN' || session.status === 'DEPARTED';

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background ops-content-with-bottom-strip">
      {/* ── Sticky top bar (56px) ── */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="flex items-center h-14 px-4 gap-2">
          <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={() => navigate(-1)}>
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
              {canEdit && isScheduled && (
                <DropdownMenuItem className="text-destructive" onClick={() => setStatusConfirm('CANCELLED')}>
                  Cancel Session
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Sticky header block (~100px) ── */}
      <div className="sticky top-14 z-20 bg-background/95 backdrop-blur-sm border-b border-border/40 px-4 py-3 space-y-1.5">
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
      <div className="sticky top-[158px] z-20 px-4">
        <SegmentedTabs
          tabs={[
            { key: 'manifest', label: 'Manifest' },
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
                  <p className="text-sm">No guests found</p>
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
                <details>
                  <summary className="text-sm font-medium text-foreground cursor-pointer select-none">
                    Session Notes
                  </summary>
                  <div className="mt-3 text-sm text-muted-foreground">
                    {session.notes ? (
                      <p>{session.notes}</p>
                    ) : (
                      <p className="italic">No notes added yet.</p>
                    )}
                  </div>
                </details>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── TIMELINE TAB ── */}
        {activeTab === 'timeline' && (
          <div className="px-4 py-4">
            <Card>
              <CardContent className="p-4">
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

      {/* ── Dialogs (preserved from original) ── */}
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
        <MoveSessionDialog
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
