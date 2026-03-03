import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/bookings/StatusBadge';
import { ArrowRightLeft, Loader2 } from 'lucide-react';

interface MoveSessionDialogProps {
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

export function MoveSessionDialog({
  open,
  onOpenChange,
  bookingId,
  currentSessionId,
  activityId,
  resortId,
  onMoved,
}: MoveSessionDialogProps) {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<TargetSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadSessions();
  }, [open]);

  const loadSessions = async () => {
    setLoading(true);

    // Get upcoming scheduled sessions for the same activity
    const { data: sessionsData } = await supabase
      .from('activity_sessions')
      .select('id, date, start_time, end_time, capacity, status')
      .eq('activity_id', activityId)
      .eq('resort_id', resortId)
      .eq('status', 'SCHEDULED')
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

    // Get booking counts per session
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
  };

  const moveToSession = async (targetSessionId: string) => {
    setMoving(true);
    const { error } = await supabase
      .from('activity_bookings')
      .update({ session_id: targetSessionId })
      .eq('id', bookingId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Moved', description: 'Booking moved to new session' });
      onMoved();
    }
    setMoving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Move to Another Session
          </DialogTitle>
          <DialogDescription>
            Select an upcoming session for the same activity.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No other scheduled sessions available.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {sessions.map((s) => {
                const remaining = s.capacity - s.booked_count;
                const isFull = remaining <= 0;

                return (
                  <li key={s.id} className="flex items-center gap-3 py-2.5 px-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {format(parseISO(s.date), 'EEE, MMM d')} · {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.booked_count}/{s.capacity} booked · {remaining} spots left
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isFull || moving}
                      onClick={() => moveToSession(s.id)}
                    >
                      {moving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Move'}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
