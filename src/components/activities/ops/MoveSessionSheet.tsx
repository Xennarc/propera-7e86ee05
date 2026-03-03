/**
 * MoveSessionSheet – Mobile bottom sheet for moving a booking to another session.
 * Used from the manifest kebab menu in SessionOpsRunSheet.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { StatusChip } from '@/components/ui/status-chip';
import { Loader2, Users, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MoveSessionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  currentSessionId: string;
  activityId: string;
  resortId: string;
  onMoved: () => void;
}

interface TargetSession {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  status: string;
  booked_count: number;
}

export function MoveSessionSheet({
  open,
  onOpenChange,
  bookingId,
  currentSessionId,
  activityId,
  resortId,
  onMoved,
}: MoveSessionSheetProps) {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<TargetSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingTo, setMovingTo] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);

    const { data: sessionsData } = await supabase
      .from('activity_sessions')
      .select('id, date, start_time, end_time, capacity, status')
      .eq('activity_id', activityId)
      .eq('resort_id', resortId)
      .in('status', ['SCHEDULED', 'CHECK_IN'])
      .neq('id', currentSessionId)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(20);

    if (!sessionsData) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const sessionIds = sessionsData.map((s) => s.id);
    const { data: bookingCounts } = await supabase
      .from('activity_bookings')
      .select('session_id, num_adults, num_children')
      .in('session_id', sessionIds)
      .in('status', ['CONFIRMED', 'PENDING']);

    const countMap: Record<string, number> = {};
    (bookingCounts ?? []).forEach((b) => {
      countMap[b.session_id] = (countMap[b.session_id] ?? 0) + b.num_adults + b.num_children;
    });

    setSessions(
      sessionsData.map((s) => ({
        ...s,
        booked_count: countMap[s.id] ?? 0,
      }))
    );
    setLoading(false);
  }, [activityId, resortId, currentSessionId]);

  useEffect(() => {
    if (open) loadSessions();
  }, [open, loadSessions]);

  const moveToSession = useCallback(async (targetSessionId: string) => {
    setMovingTo(targetSessionId);

    // Log event before move
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('activity_bookings')
      .update({ session_id: targetSessionId })
      .eq('id', bookingId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      setMovingTo(null);
      return;
    }

    // Log session event
    await supabase.from('session_events').insert({
      session_id: currentSessionId,
      resort_id: resortId,
      event_type: 'booking_moved_out',
      notes: `Booking ${bookingId} moved to session ${targetSessionId}`,
      actor_user_id: user?.id ?? null,
    });

    toast({ title: 'Moved ✅', description: 'Guest moved to new session' });
    setMovingTo(null);
    onOpenChange(false);
    onMoved();
  }, [bookingId, currentSessionId, resortId, toast, onOpenChange, onMoved]);

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Move to another session">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-muted-foreground">
          <Clock className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-sm">No other sessions available</p>
        </div>
      ) : (
        <div className="space-y-2 pb-4">
          {sessions.map((s) => {
            const remaining = s.capacity - s.booked_count;
            const isFull = remaining <= 0;
            const isMoving = movingTo === s.id;

            return (
              <button
                key={s.id}
                disabled={isFull || !!movingTo}
                onClick={() => moveToSession(s.id)}
                className={cn(
                  'w-full rounded-xl border border-border/40 bg-card p-3 min-h-[64px]',
                  'flex items-center gap-3 text-left transition-colors',
                  isFull
                    ? 'opacity-50 cursor-not-allowed'
                    : 'active:bg-muted/50',
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {format(parseISO(s.date), 'EEE, MMM d')}
                    </p>
                    <StatusChip status={s.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {s.booked_count}/{s.capacity}
                      {isFull ? (
                        <span className="text-destructive font-medium ml-0.5">Full</span>
                      ) : (
                        <span className="text-success font-medium ml-0.5">{remaining} left</span>
                      )}
                    </span>
                  </div>
                </div>
                {isMoving && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </BottomSheet>
  );
}
