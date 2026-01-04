import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { ActivitySession, Activity, Guest } from '@/types/database';
import { useBookingSource } from '@/hooks/useBookingSource';
import { createActivityBooking } from '@/lib/booking-service';
import { getBookingErrorMessage } from '@/lib/booking-errors';
import { awardLoyaltyPoints } from '@/hooks/useLoyaltyProgram';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { NumberStepper } from '@/components/ui/number-stepper';
import { useToast } from '@/hooks/use-toast';
import { GuestSearchDialog } from '@/components/bookings/GuestSearchDialog';
import { format, parseISO } from 'date-fns';
import { AlertCircle, Loader2 } from 'lucide-react';

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
  const [validationError, setValidationError] = useState<string | null>(null);

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
      setValidationError(null);
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
    setValidationError(null);
    
    const currentSession = selectedSession || session;
    const currentGuest = selectedGuest || initialGuest;
    
    if (!currentSession || !currentGuest || !currentResort) {
      setValidationError('Please select a guest and session');
      return;
    }

    setLoading(true);

    // Use centralized BookingService
    const result = await createActivityBooking({
      resortId: currentResort.id,
      sessionId: currentSession.id,
      guestId: currentGuest.id,
      roomNumber: currentGuest.room_number,
      numAdults: formData.num_adults,
      numChildren: formData.num_children,
      notes: formData.notes || undefined,
      source: bookingSource,
      createdByUserId: user?.id,
    });

    if (!result.success) {
      const errorMessage = result.errorCode 
        ? getBookingErrorMessage(result.errorCode, 'staff')
        : result.error || 'Failed to create booking';
      setValidationError(errorMessage);
      setLoading(false);
      return;
    }

    // Handle duplicate detection
    if (result.alreadyExists) {
      toast({ 
        title: 'Existing Booking Found', 
        description: 'This guest already has an active booking for this session.',
        variant: 'default',
      });
      onSuccess();
      onOpenChange(false);
      setLoading(false);
      return;
    }

    // Award loyalty points (fire and forget)
    if (result.bookingId && currentGuest) {
      const totalPax = formData.num_adults + formData.num_children;
      const pointsToAward = totalPax * 50; // 50 points per person
      awardLoyaltyPoints(
        currentGuest.id,
        currentResort.id,
        'activity_booking',
        pointsToAward,
        result.bookingId,
        'activity_booking',
        `Activity: ${currentSession.activity?.name || 'Activity'}`
      ).catch(console.error);
    }

    toast({ title: 'Success', description: 'Booking created successfully' });
    onSuccess();
    onOpenChange(false);
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
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {/* Validation Error */}
            {validationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

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
              <NumberStepper
                label="Adults *"
                value={formData.num_adults}
                onChange={(value) => setFormData({ ...formData, num_adults: value })}
                min={1}
                max={currentSession?.activity?.max_pax_per_booking || 10}
              />
              <NumberStepper
                label="Children"
                value={formData.num_children}
                onChange={(value) => setFormData({ ...formData, num_children: value })}
                min={0}
                max={(currentSession?.activity?.max_pax_per_booking || 10) - formData.num_adults}
              />
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
                placeholder="Any special requirements or requests for this booking"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !currentGuest || !currentSession}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : 'Create Booking'}
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
