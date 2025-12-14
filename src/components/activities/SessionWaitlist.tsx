import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Users, Clock, ArrowUp, Trash2, UserPlus, Bell, ChevronUp, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface WaitlistEntry {
  id: string;
  guest_id: string;
  num_adults: number;
  num_children: number;
  status: string;
  priority: number;
  notes: string | null;
  created_at: string;
  guest?: {
    full_name: string;
    room_number: string;
  };
}

interface SessionWaitlistProps {
  sessionId: string;
  sessionCapacity: number;
  currentBooked: number;
  resortId: string;
  onPromote?: () => void;
}

export function SessionWaitlist({ sessionId, sessionCapacity, currentBooked, resortId, onPromote }: SessionWaitlistProps) {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  const availableSpots = sessionCapacity - currentBooked;

  const fetchWaitlist = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('activity_waitlist')
      .select(`
        *,
        guest:guests(full_name, room_number)
      `)
      .eq('session_id', sessionId)
      .eq('status', 'WAITING')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    if (!error && data) {
      setEntries(data as WaitlistEntry[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWaitlist();
  }, [sessionId]);

  const handlePromote = async (entry: WaitlistEntry) => {
    const totalPax = entry.num_adults + entry.num_children;
    if (totalPax > availableSpots) {
      toast({
        variant: 'destructive',
        title: 'Not enough capacity',
        description: `This guest needs ${totalPax} spots but only ${availableSpots} available.`,
      });
      return;
    }

    setActionLoading(true);
    try {
      // Create the booking
      const { error: bookingError } = await supabase
        .from('activity_bookings')
        .insert({
          resort_id: resortId,
          session_id: sessionId,
          guest_id: entry.guest_id,
          room_number: entry.guest?.room_number || '',
          num_adults: entry.num_adults,
          num_children: entry.num_children,
          status: 'CONFIRMED',
          source: 'STAFF_FRONT_DESK',
          notes: entry.notes ? `From waitlist: ${entry.notes}` : 'Promoted from waitlist',
        });

      if (bookingError) throw bookingError;

      // Update waitlist entry
      const { error: waitlistError } = await supabase
        .from('activity_waitlist')
        .update({ status: 'PROMOTED', promoted_at: new Date().toISOString() })
        .eq('id', entry.id);

      if (waitlistError) throw waitlistError;

      toast({ title: 'Guest promoted', description: `${entry.guest?.full_name} has been added to the session.` });
      fetchWaitlist();
      onPromote?.();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setActionLoading(false);
      setPromoteDialogOpen(false);
      setSelectedEntry(null);
    }
  };

  const handleRemove = async (entryId: string) => {
    const { error } = await supabase
      .from('activity_waitlist')
      .update({ status: 'CANCELLED' })
      .eq('id', entryId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Removed', description: 'Guest removed from waitlist.' });
      fetchWaitlist();
    }
  };

  const handleMovePriority = async (entryId: string, direction: 'up' | 'down') => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    const newPriority = direction === 'up' ? entry.priority + 1 : Math.max(0, entry.priority - 1);
    
    const { error } = await supabase
      .from('activity_waitlist')
      .update({ priority: newPriority })
      .eq('id', entryId);

    if (!error) {
      fetchWaitlist();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="animate-pulse flex items-center gap-3">
            <div className="h-4 bg-muted rounded w-24" />
            <div className="h-4 bg-muted rounded w-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Waitlist
              {entries.length > 0 && (
                <Badge variant="secondary" className="ml-1">{entries.length}</Badge>
              )}
            </CardTitle>
            {availableSpots > 0 && entries.length > 0 && (
              <Badge variant="outline" className="text-success border-success/30">
                {availableSpots} spots available
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No guests on waitlist
            </p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry, index) => {
                const totalPax = entry.num_adults + entry.num_children;
                const canPromote = totalPax <= availableSpots;

                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      canPromote ? "bg-success/5 border-success/20" : "bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Priority controls */}
                      <div className="flex flex-col gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => handleMovePriority(entry.id, 'up')}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => handleMovePriority(entry.id, 'down')}
                          disabled={entry.priority === 0}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{entry.guest?.full_name}</span>
                          <Badge variant="outline" className="text-xs">
                            Room {entry.guest?.room_number}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {totalPax} pax
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(entry.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {canPromote && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedEntry(entry);
                            setPromoteDialogOpen(true);
                          }}
                          className="gap-1.5"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                          Promote
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(entry.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Promote confirmation */}
      <AlertDialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promote to Booking</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a confirmed booking for {selectedEntry?.guest?.full_name} 
              ({(selectedEntry?.num_adults || 0) + (selectedEntry?.num_children || 0)} pax) 
              and remove them from the waitlist.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedEntry && handlePromote(selectedEntry)}
              disabled={actionLoading}
            >
              {actionLoading ? 'Creating booking...' : 'Confirm Promotion'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}