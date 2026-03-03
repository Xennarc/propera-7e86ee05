import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { Activity, ActivitySession, ActivityBooking, Guest } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/bookings/StatusBadge';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft,
  Users,
  Clock,
  CheckCircle2,
  Ship,
  Flag,
  UserCheck,
  ArrowRightLeft,
  XCircle,
  HelpCircle,
  ShieldCheck,
  HeartPulse,
  Award,
  Ruler,
  ChevronDown,
  ChevronUp,
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
import { MoveSessionDialog } from '@/components/activities/MoveSessionDialog';
import { useSessionReadiness, BookingReadiness } from '@/hooks/useBookingReadiness';

// ── Types ──────────────────────────────────────────────────────────────

interface SessionWithActivity extends ActivitySession {
  activity: Activity;
}

interface BookingWithGuest extends ActivityBooking {
  guest: Guest;
}

type ReadinessKey = 'waiver' | 'medical' | 'cert' | 'gear';

// Readiness indicator config
const readinessIndicators: { key: ReadinessKey; label: string; icon: typeof ShieldCheck }[] = [
  { key: 'waiver', label: 'Waiver', icon: ShieldCheck },
  { key: 'medical', label: 'Medical', icon: HeartPulse },
  { key: 'cert', label: 'Cert', icon: Award },
  { key: 'gear', label: 'Gear', icon: Ruler },
];

// ── Helpers ────────────────────────────────────────────────────────────

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

function paxCount(b: BookingWithGuest) {
  return b.num_adults + b.num_children;
}

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

  // Per-booking local readiness (Phase 1: all start unknown, toggleable in-memory)
  const [readiness, setReadiness] = useState<Record<string, ReadinessState>>({});

  // Expanded rows for progressive disclosure
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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
      .in('status', ['CONFIRMED', 'PENDING'])
      .order('created_at', { ascending: true });

    const bks = (bookingsData ?? []) as BookingWithGuest[];
    setBookings(bks);

    // Initialise readiness for new bookings
    setReadiness((prev) => {
      const next = { ...prev };
      bks.forEach((b) => {
        if (!next[b.id]) {
          next[b.id] = { waiver: null, medical: null, cert: null, gear: null };
        }
      });
      return next;
    });

    setLoading(false);
  }, [sessionId, isValidId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    // Use existing COMPLETED status to represent "arrived/checked-in" for now
    // In Phase 2 this could be a dedicated field
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

  // Readiness toggle
  const toggleReadiness = (bookingId: string, key: ReadinessKey) => {
    setReadiness((prev) => {
      const cur = prev[bookingId]?.[key];
      // cycle: null → true → false → null
      const next = cur === null ? true : cur === true ? false : null;
      return { ...prev, [bookingId]: { ...prev[bookingId], [key]: next } };
    });
  };

  // Row expand
  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Derived ────────────────────────────────────────────────────────

  const confirmedPax = bookings
    .filter((b) => b.status === 'CONFIRMED')
    .reduce((s, b) => s + paxCount(b), 0);
  const pendingPax = bookings
    .filter((b) => b.status === 'PENDING')
    .reduce((s, b) => s + paxCount(b), 0);
  const totalPax = confirmedPax + pendingPax;

  // ── Guard states ───────────────────────────────────────────────────

  if (!isValidId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">Invalid session ID</p>
          <Button variant="outline" onClick={() => navigate('/staff/activities/sessions')}>
            Back to Sessions
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session?.activity) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Session not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/staff/activities/sessions')}>
            Back to Sessions
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isScheduled = session.status === 'SCHEDULED';

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/staff/activities/sessions/${session.id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold truncate">{session.activity.name}</h1>
            <StatusBadge status={session.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(parseISO(session.date), 'EEE, MMM d')} · {session.start_time.slice(0, 5)}–{session.end_time.slice(0, 5)}
          </p>
        </div>
      </div>

      {/* ── Quick stats ──────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Capacity</p>
              <p className="text-lg font-bold leading-none">{totalPax}/{session.capacity}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <div>
              <p className="text-xs text-muted-foreground">Confirmed</p>
              <p className="text-lg font-bold leading-none text-success">{confirmedPax}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-warning" />
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-lg font-bold leading-none text-warning">{pendingPax}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Session Actions ──────────────────────────────────────── */}
      {canEdit && isScheduled && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => {/* check-in is per-guest below */}}>
            <UserCheck className="h-4 w-4 mr-1.5" />
            Open Check-in
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setStatusConfirm('COMPLETED')}>
            <Ship className="h-4 w-4 mr-1.5" />
            Mark Departed
          </Button>
          <Button size="sm" variant="outline" onClick={() => setStatusConfirm('COMPLETED')}>
            <Flag className="h-4 w-4 mr-1.5" />
            Mark Completed
          </Button>
        </div>
      )}

      {/* ── Manifest ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Manifest ({bookings.length} bookings · {totalPax} pax)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {bookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No bookings for this session</div>
          ) : (
            <ul className="divide-y divide-border">
              {bookings.map((booking) => {
                const rs = readiness[booking.id] ?? { waiver: null, medical: null, cert: null, gear: null };
                const expanded = expandedRows.has(booking.id);

                return (
                  <li key={booking.id} className="group">
                    {/* ── Main row ── */}
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                      onClick={() => toggleRow(booking.id)}
                    >
                      {/* Guest info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{booking.guest.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Room {booking.room_number} · {paxCount(booking)} pax
                          {booking.guest.is_vip && (
                            <Badge variant="outline" className="ml-1.5 text-[10px] py-0 px-1 border-amber-400 text-amber-600 dark:text-amber-400">
                              VIP
                            </Badge>
                          )}
                        </p>
                      </div>

                      {/* Readiness indicators (compact) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {readinessIndicators.map(({ key, icon: Icon }) => {
                          const val = rs[key];
                          return (
                            <span
                              key={key}
                              className={`rounded p-0.5 ${
                                val === true
                                  ? 'text-success bg-success/10'
                                  : val === false
                                  ? 'text-destructive bg-destructive/10'
                                  : 'text-muted-foreground/50 bg-muted/50'
                              }`}
                              title={`${key}: ${val === null ? 'Unknown' : val ? 'Yes' : 'No'}`}
                            >
                              {val === null ? (
                                <HelpCircle className="h-3.5 w-3.5" />
                              ) : (
                                <Icon className="h-3.5 w-3.5" />
                              )}
                            </span>
                          );
                        })}
                      </div>

                      {/* Status */}
                      <StatusBadge status={booking.status} />

                      {/* Expand chevron */}
                      {expanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>

                    {/* ── Expanded detail drawer ── */}
                    {expanded && (
                      <div className="px-4 pb-4 pt-1 bg-muted/30 space-y-3 animate-fade-in">
                        {/* Readiness toggles */}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">Readiness</p>
                          <div className="flex flex-wrap gap-2">
                            {readinessIndicators.map(({ key, label, icon: Icon }) => {
                              const val = rs[key];
                              return (
                                <button
                                  key={key}
                                  onClick={() => toggleReadiness(booking.id, key)}
                                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                    val === true
                                      ? 'border-success/40 bg-success/10 text-success'
                                      : val === false
                                      ? 'border-destructive/40 bg-destructive/10 text-destructive'
                                      : 'border-border bg-background text-muted-foreground'
                                  }`}
                                >
                                  {val === null ? <HelpCircle className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                                  {label}
                                  <span className="opacity-60">
                                    {val === null ? '?' : val ? '✓' : '✗'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Quick actions */}
                        {canEdit && booking.status === 'CONFIRMED' && (
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="success" onClick={() => markArrived(booking.id)}>
                              <UserCheck className="h-3.5 w-3.5 mr-1" />
                              Mark Arrived
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setMoveBookingId(booking.id)}>
                              <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                              Move Session
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive" onClick={() => setCancelBookingId(booking.id)}>
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        )}

                        {/* Extra info */}
                        {booking.notes && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">Notes:</span> {booking.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Session status confirmation dialog ─────────────────── */}
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

      {/* ── Cancel booking confirmation dialog ─────────────────── */}
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

      {/* ── Move session dialog ────────────────────────────────── */}
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
