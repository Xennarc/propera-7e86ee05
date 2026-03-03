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
import { OpsStatusChip } from '@/components/activities/ops/OpsStatusChip';
import { GuestReadinessRow, GuestReadinessData, GuestReadinessRowSkeleton } from '@/components/activities/ops/GuestReadinessRow';
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
  const [checkInOpen, setCheckInOpen] = useState(false);

  // DB-backed readiness
  const bookingIds = useMemo(() => bookings.map(b => b.id), [bookings]);
  const { data: readinessMap = {} } = useSessionReadiness(bookingIds);

  // Dialogs
  const [statusConfirm, setStatusConfirm] = useState<'CANCELLED' | 'COMPLETED' | null>(null);
  const [moveBookingId, setMoveBookingId] = useState<string | null>(null);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);

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

  // ── Session actions ────────────────────────────────────────────────

  const updateSessionStatus = async (status: 'CANCELLED' | 'COMPLETED') => {
    if (!session) return;
    const { error } = await supabase
      .from('activity_sessions')
      .update({ status })
      .eq('id', session.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Success', description: `Session marked as ${status.toLowerCase()}` });
      fetchData();
    }
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

  // ── Timeline nodes ─────────────────────────────────────────────────

  const timelineNodes: TimelineNode[] = useMemo(() => {
    if (!session) return [];
    const isCompleted = session.status === 'COMPLETED';
    const isCancelled = session.status === 'CANCELLED';
    return [
      { label: 'Session Created', timestamp: format(parseISO(session.created_at), 'MMM d, HH:mm'), status: 'done' },
      { label: 'Check-in Opened', status: checkInOpen ? 'done' : isCancelled ? 'upcoming' : 'upcoming' },
      { label: 'Departed', status: isCompleted ? 'done' : 'upcoming' },
      { label: 'Completed', status: isCompleted ? 'done' : isCancelled ? 'upcoming' : 'upcoming' },
    ];
  }, [session, checkInOpen]);

  // ── Primary action label ───────────────────────────────────────────

  const primaryAction = useMemo(() => {
    if (!session || session.status !== 'SCHEDULED') return null;
    if (!checkInOpen) return { label: 'Open Check-in', icon: UserCheck, action: () => setCheckInOpen(true) };
    return { label: 'Mark Departed', icon: Ship, action: () => setStatusConfirm('COMPLETED') };
  }, [session, checkInOpen]);

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
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <GuestReadinessRowSkeleton key={i} />)}
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

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background pb-[80px]">
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
          <OpsStatusChip status={session.status as any} />
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
      <div className="sticky top-[158px] z-20 bg-background border-b border-border/40 px-4">
        <div className="flex h-11">
          {(['manifest', 'setup', 'timeline'] as TabKey[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 text-sm font-medium capitalize transition-colors relative',
                activeTab === tab ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/70',
              )}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
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

      {/* ── Bottom Action Strip (fixed, 72px) ── */}
      {canEdit && isScheduled && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border/40 px-4 py-3 safe-area-pb">
          <div className="flex gap-2 max-w-lg mx-auto">
            {primaryAction && (
              <Button className="flex-1 h-12 text-base" onClick={primaryAction.action}>
                <primaryAction.icon className="h-5 w-5 mr-2" />
                {primaryAction.label}
              </Button>
            )}
            {checkInOpen && (
              <Button
                variant="outline"
                className="h-12 px-4"
                onClick={() => setStatusConfirm('COMPLETED')}
              >
                <Flag className="h-4 w-4 mr-1.5" />
                Complete
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Dialogs (preserved from original) ── */}
      <AlertDialog open={!!statusConfirm} onOpenChange={() => setStatusConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusConfirm === 'CANCELLED' ? 'Cancel Session' : 'Complete Session'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusConfirm === 'CANCELLED'
                ? 'This will cancel the session. Active bookings may need to be handled separately.'
                : 'Mark this session as completed? This action is irreversible.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              className={statusConfirm === 'CANCELLED' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
              onClick={() => statusConfirm && updateSessionStatus(statusConfirm)}
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
