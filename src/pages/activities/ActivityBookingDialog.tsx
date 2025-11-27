import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { ActivitySession, Activity, Guest } from '@/types/database';
import { useBookingSource } from '@/hooks/useBookingSource';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { GuestSearchDialog } from '@/components/bookings/GuestSearchDialog';
import { format, parseISO } from 'date-fns';

interface ActivityBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session?: ActivitySession & { activity?: Activity };
  guest?: Guest;
  onSuccess: () => void;
}

export function ActivityBookingDialog({
  open,
  onOpenChange,
  session,
  guest: initialGuest,
  onSuccess,
}: ActivityBookingDialogProps) {
  const [loading, setLoading] = useState(false);
  const [guestSearchOpen, setGuestSearchOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(initialGuest || null);
  const [selectedSession, setSelectedSession] = useState<(ActivitySession & { activity?: Activity }) | null>(session || null);
  const [sessions, setSessions] = useState<(ActivitySession & { activity?: Activity })[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formData, setFormData] = useState({
    num_adults: 1,
    num_children: 0,
    notes: '',
  });

  const { user } = useAuth();
  const { currentResort } = useResort();
  const { toast } = useToast();
  const bookingSource = useBookingSource();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedGuest(initialGuest || null);
      setSelectedSession(session || null);
      setFormData({ num_adults: 1, num_children: 0, notes: '' });
      if (!session) {
        setSelectedActivityId('');
        setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
      }
    }
  }, [open, initialGuest, session]);

  // Fetch activities when starting from guest
  useEffect(() => {
    if (open && !session && currentResort) {
      fetchActivities();
    }
  }, [open, session, currentResort]);

  // Fetch available sessions when activity/date selected
  useEffect(() => {
    if (!session && selectedActivityId && selectedDate && currentResort) {
      fetchAvailableSessions();
    }
  }, [session, selectedActivityId, selectedDate, currentResort]);

  const fetchActivities = async () => {
    if (!currentResort) return;
    const { data } = await supabase
      .from('activities')
      .select('*')
      .eq('resort_id', currentResort.id)
      .eq('is_active', true)
      .order('name');
    if (data) setActivities(data as Activity[]);
  };

  const fetchAvailableSessions = async () => {
    if (!currentResort) return;
    const { data } = await supabase
      .from('activity_sessions')
      .select(`*, activity:activities(*)`)
      .eq('resort_id', currentResort.id)
      .eq('activity_id', selectedActivityId)
      .eq('date', selectedDate)
      .eq('status', 'SCHEDULED')
      .order('start_time');
    
    if (data) {
      setSessions(data as (ActivitySession & { activity?: Activity })[]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const currentSession = selectedSession || session;
    const currentGuest = selectedGuest || initialGuest;
    
    if (!currentSession || !currentGuest || !currentResort) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a guest and session' });
      return;
    }

    setLoading(true);

    // Validation 1: Check capacity
    const { data: existingBookings, error: capacityError } = await supabase
      .from('activity_bookings')
      .select('num_adults, num_children')
      .eq('session_id', currentSession.id)
      .eq('status', 'CONFIRMED');

    if (capacityError) {
      toast({ variant: 'destructive', title: 'Error', description: capacityError.message });
      setLoading(false);
      return;
    }

    const totalBooked = existingBookings?.reduce((sum, b) => sum + b.num_adults + b.num_children, 0) || 0;
    const newPax = formData.num_adults + formData.num_children;
    
    if (totalBooked + newPax > currentSession.capacity) {
      toast({ 
        variant: 'destructive', 
        title: 'Capacity exceeded', 
        description: `Only ${currentSession.capacity - totalBooked} spots remaining` 
      });
      setLoading(false);
      return;
    }

    // Validation 2: Check for overlapping bookings
    const { data: guestBookings, error: overlapError } = await supabase
      .from('activity_bookings')
      .select(`
        id,
        session:activity_sessions(date, start_time, end_time)
      `)
      .eq('guest_id', currentGuest.id)
      .eq('status', 'CONFIRMED');

    if (!overlapError && guestBookings) {
      const hasOverlap = guestBookings.some(booking => {
        const bookingSession = booking.session as any;
        if (!bookingSession || bookingSession.date !== currentSession.date) return false;
        
        // Check time overlap
        const newStart = currentSession.start_time;
        const newEnd = currentSession.end_time;
        const existingStart = bookingSession.start_time;
        const existingEnd = bookingSession.end_time;
        
        return newStart < existingEnd && newEnd > existingStart;
      });

      if (hasOverlap) {
        toast({ 
          variant: 'destructive', 
          title: 'Time conflict', 
          description: 'Guest already has a booking during this time' 
        });
        setLoading(false);
        return;
      }
    }

    // Calculate total
    const pricePerPerson = currentSession.activity?.default_price_per_person || 0;
    const totalAmount = newPax * pricePerPerson;

    const { error } = await supabase
      .from('activity_bookings')
      .insert({
        resort_id: currentResort.id,
        session_id: currentSession.id,
        guest_id: currentGuest.id,
        room_number: currentGuest.room_number,
        status: 'CONFIRMED',
        source: bookingSource,
        num_adults: formData.num_adults,
        num_children: formData.num_children,
        price_per_person: pricePerPerson,
        discount_amount: 0,
        total_amount: totalAmount,
        notes: formData.notes || null,
        created_by_user_id: user?.id || null,
      });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Success', description: 'Booking created successfully' });
      onSuccess();
      onOpenChange(false);
    }
    setLoading(false);
  };

  const currentSession = selectedSession || session;
  const currentGuest = selectedGuest || initialGuest;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Activity Booking</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Guest Selection (if not provided) */}
            {!initialGuest && (
              <div className="space-y-2">
                <Label>Guest *</Label>
                {currentGuest ? (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{currentGuest.full_name}</p>
                      <p className="text-sm text-muted-foreground">Room {currentGuest.room_number}</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setGuestSearchOpen(true)}>
                      Change
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" className="w-full" onClick={() => setGuestSearchOpen(true)}>
                    Select Guest
                  </Button>
                )}
              </div>
            )}

            {/* Session Selection (if not provided) */}
            {!session && (
              <>
                <div className="space-y-2">
                  <Label>Activity *</Label>
                  <select
                    className="w-full h-10 px-3 border rounded-md bg-background"
                    value={selectedActivityId}
                    onChange={(e) => { setSelectedActivityId(e.target.value); setSelectedSession(null); }}
                    required
                  >
                    <option value="">Select activity</option>
                    {activities.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => { setSelectedDate(e.target.value); setSelectedSession(null); }}
                    required
                  />
                </div>

                {selectedActivityId && selectedDate && (
                  <div className="space-y-2">
                    <Label>Available Sessions *</Label>
                    {sessions.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">No sessions available on this date</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {sessions.map(s => (
                          <button
                            key={s.id}
                            type="button"
                            className={`w-full text-left p-3 border rounded-lg transition-colors ${
                              selectedSession?.id === s.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                            }`}
                            onClick={() => setSelectedSession(s)}
                          >
                            <div className="flex justify-between">
                              <span className="font-medium">{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</span>
                              <span className="text-sm text-muted-foreground">{s.capacity} capacity</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Session Summary (if provided or selected) */}
            {currentSession && (
              <div className="p-3 border rounded-lg bg-muted/50">
                <p className="font-medium">{currentSession.activity?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {format(parseISO(currentSession.date), 'EEE, MMM d')} • {currentSession.start_time.slice(0, 5)} - {currentSession.end_time.slice(0, 5)}
                </p>
                <p className="text-sm text-muted-foreground">
                  ${currentSession.activity?.default_price_per_person}/person
                </p>
              </div>
            )}

            {/* Pax Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Adults *</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.num_adults}
                  onChange={(e) => setFormData({ ...formData, num_adults: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Children</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.num_children}
                  onChange={(e) => setFormData({ ...formData, num_children: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Total Preview */}
            {currentSession?.activity && (
              <div className="p-3 bg-primary/5 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Total ({formData.num_adults + formData.num_children} pax × ${currentSession.activity.default_price_per_person})</span>
                  <span className="font-bold">
                    ${(formData.num_adults + formData.num_children) * currentSession.activity.default_price_per_person}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional booking notes..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !currentGuest || !currentSession}
              >
                {loading ? 'Creating...' : 'Create Booking'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <GuestSearchDialog
        open={guestSearchOpen}
        onOpenChange={setGuestSearchOpen}
        onSelect={setSelectedGuest}
      />
    </>
  );
}
