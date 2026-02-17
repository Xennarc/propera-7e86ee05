import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getBookingErrorMessage, BookingErrorCode } from '@/lib/booking-errors';
import { createGuestNotification, createStaffNotificationsForRoles, formatActivityBookingMessage } from '@/lib/notifications';
import { calculatePriceBreakdown, parsePricingCharges } from '@/lib/pricing-utils';
import { awardLoyaltyPoints } from '@/hooks/useLoyaltyProgram';
import { useGuestActivitySync } from '@/hooks/useActivityBookingSync';
import { useActiveStay } from '@/hooks/useActiveStay';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Calendar, Clock, Users, Loader2, CheckCircle, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getCategoryConfig } from '@/lib/activity-category-config';
import { CategoryIcon } from '@/components/ui/category-badge';
import { NumberStepper } from '@/components/ui/number-stepper';
import { AttendeeSelector } from '@/components/guest/AttendeeSelector';
import { useTravelParty } from '@/hooks/useTravelParty';
import { filterUpcomingSessions, isSessionPast } from '@/lib/session-time-utils';
import { SessionExpiredState, SessionsFilteredHint } from '@/components/guest/SessionExpiredState';
import { useBookingCelebration } from '@/hooks/guest/useBookingCelebration';
import { StickyActionBar, StickyActionBarSpacer } from '@/components/guest/StickyActionBar';
import { GuestPageShell } from '@/components/guest/GuestPageShell';
import { BookingSuccessCelebration } from '@/components/guest/feedback/BookingSuccessCelebration';

// Map server error messages to error codes
function mapErrorToCode(error: string): BookingErrorCode {
  const lowerError = error.toLowerCase();
  if (lowerError.includes('capacity') || lowerError.includes('full')) return 'SESSION_FULL';
  if (lowerError.includes('cutoff') || lowerError.includes('booking window')) return 'CUTOFF_PAST';
  if (lowerError.includes('stay dates') || lowerError.includes('check-in') || lowerError.includes('check-out')) return 'OUTSIDE_STAY_DATES';
  if (lowerError.includes('overlap')) return 'OVERLAPPING_BOOKING';
  if (lowerError.includes('max') || lowerError.includes('party size')) return 'MAX_PAX_EXCEEDED';
  if (lowerError.includes('not available') || lowerError.includes('disabled')) return 'GUEST_BOOKING_DISABLED';
  return 'UNKNOWN_ERROR';
}

export default function GuestActivityBookingPage() {
  const { sessionId, code } = useParams();
  const navigate = useNavigate();
  const { guest } = useGuestAuth();
  const queryClient = useQueryClient();
  const { activeStay } = useActiveStay();

  // Determine if this is a pre-arrival booking
  const isPrearrival = activeStay?.status === 'pre_arrival';

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(sessionId || null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [numAdults, setNumAdults] = useState(1);
  const [numChildren, setNumChildren] = useState(0);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [bookingResult, setBookingResult] = useState<{
    success: boolean;
    requiresApproval?: boolean;
    isPrearrival?: boolean;
    error?: string;
  } | null>(null);

  // Booking success celebration
  const { isCelebrating, triggerCelebration, dismissCelebration } = useBookingCelebration();

  // Enable real-time sync for activity bookings (must pass resortId for guest sessions)
  useGuestActivitySync(guest?.guestId, guest?.resortId);

  // Fetch all available sessions for the guest's stay period
  const { data: allSessions, isLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['guest-all-sessions', guest?.guestId, guest?.checkInDate, guest?.checkOutDate],
    queryFn: async () => {
      if (!guest) return [];
      const today = new Date().toISOString().split('T')[0];
      const startDate = guest.checkInDate > today ? guest.checkInDate : today;
      
      // Use secure RPC to fetch activities (resort-scoped, no cross-tenant leakage)
      const { data: activities, error: activitiesError } = await supabase
        .rpc('guest_get_activity_details', { p_resort_id: guest.resortId });
      
      if (activitiesError) throw activitiesError;
      if (!activities || activities.length === 0) return [];
      
      const activityIds = activities.map((a: any) => a.id);
      const activitiesMap = new Map(activities.map((a: any) => [a.id, a]));
      
      // Query sessions for these activities
      const { data: sessions, error } = await supabase
        .from('activity_sessions')
        .select('id, date, start_time, end_time, capacity, notes, status, activity_id')
        .in('activity_id', activityIds)
        .eq('status', 'SCHEDULED')
        .gte('date', startDate)
        .lte('date', guest.checkOutDate)
        .order('date')
        .order('start_time');

      if (error) throw error;
      
      // Fetch bookings to calculate remaining spots
      const sessionIds = sessions?.map(s => s.id) || [];
      if (sessionIds.length === 0) return [];
      
      const { data: bookings } = await supabase
        .from('activity_bookings')
        .select('session_id, num_adults, num_children')
        .in('session_id', sessionIds)
        .in('status', ['CONFIRMED', 'PENDING']);
      
      // Calculate booked counts per session
      const bookedCounts: Record<string, number> = {};
      bookings?.forEach(b => {
        bookedCounts[b.session_id] = (bookedCounts[b.session_id] || 0) + b.num_adults + b.num_children;
      });
      
      // Transform to match expected format, joining activity data client-side
      return (sessions || []).map(s => {
        const activity = activitiesMap.get(s.activity_id);
        return {
          id: s.id,
          date: s.date,
          start_time: s.start_time,
          end_time: s.end_time,
          capacity: s.capacity,
          notes: s.notes,
          activity_id: s.activity_id,
          activity_name: activity?.name || 'Unknown Activity',
          description: activity?.short_description,
          category: activity?.category,
          duration_minutes: activity?.duration_minutes,
          max_pax_per_booking: activity?.max_pax_per_booking,
          requires_approval: activity?.requires_approval,
          image_url: activity?.image_url,
          difficulty_level: activity?.difficulty_level,
          price_per_person: activity?.default_price_per_person,
          guest_cutoff_hours: activity?.guest_cutoff_hours,
          guest_can_cancel: activity?.guest_can_cancel,
          guest_cancel_cutoff_hours: activity?.guest_cancel_cutoff_hours,
          remaining_spots: s.capacity - (bookedCounts[s.id] || 0),
        };
      });
    },
    enabled: !!guest,
    refetchOnWindowFocus: true,
    staleTime: 10000, // 10 seconds
  });

  // Fetch room occupancy (count of guests in the same room for this resort)
  const { data: roomOccupancy } = useQuery({
    queryKey: ['room-occupancy', guest?.resortId, guest?.roomNumber],
    queryFn: async () => {
      if (!guest?.resortId || !guest?.roomNumber) return 2; // Default fallback
      const { count, error } = await supabase
        .from('guests')
        .select('id', { count: 'exact', head: true })
        .eq('resort_id', guest.resortId)
        .eq('room_number', guest.roomNumber);
      if (error) return 2;
      return count || 2;
    },
    enabled: !!guest?.resortId && !!guest?.roomNumber,
  });

  // Fetch existing room bookings for this session to prevent double booking
  const { data: roomBookings } = useQuery({
    queryKey: ['room-bookings', guest?.resortId, guest?.roomNumber, selectedSessionId],
    queryFn: async () => {
      if (!guest?.resortId || !guest?.roomNumber || !selectedSessionId) return [];
      // Get all guests in this room
      const { data: roomGuests } = await supabase
        .from('guests')
        .select('id')
        .eq('resort_id', guest.resortId)
        .eq('room_number', guest.roomNumber);
      
      if (!roomGuests || roomGuests.length === 0) return [];
      
      const guestIds = roomGuests.map(g => g.id);
      
      // Check if any room guest has a booking for this session
      const { data: bookings, error } = await supabase
        .from('activity_bookings')
        .select('id, guest_id, num_adults, num_children, status')
        .eq('session_id', selectedSessionId)
        .in('guest_id', guestIds)
        .in('status', ['CONFIRMED', 'PENDING']);
      
      if (error) return [];
      return bookings || [];
    },
    enabled: !!guest?.resortId && !!guest?.roomNumber && !!selectedSessionId,
  });

  // Fetch resort pricing charges
  const { data: resortPricing } = useQuery({
    queryKey: ['resort-pricing-guest', guest?.resortId],
    queryFn: async () => {
      if (!guest?.resortId) return null;
      const { data, error } = await supabase
        .from('resorts')
        .select('pricing_charges')
        .eq('id', guest.resortId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!guest?.resortId,
  });

  const pricingCharges = parsePricingCharges(resortPricing?.pricing_charges);

  // Travel party for attendee selection
  const { travelParty } = useTravelParty();
  const hasPartyMembers = (travelParty?.members?.length || 0) > 1;

  // Handle attendee selection changes
  const handleAttendeeSelectionChange = (memberIds: string[], pax: { adults: number; children: number }) => {
    setSelectedMemberIds(memberIds);
    setNumAdults(pax.adults);
    setNumChildren(pax.children);
  };
  // Find the initially selected session and get activity_id
  const initialSession = allSessions?.find((s: any) => s.id === sessionId);
  const activityId = initialSession?.activity_id;

  // Filter sessions for the same activity
  const activitySessions = allSessions?.filter((s: any) => s.activity_id === activityId) || [];

  // Get the currently selected session
  const selectedSession = allSessions?.find((s: any) => s.id === selectedSessionId);

  // Group sessions by date
  const sessionsByDate = activitySessions.reduce((acc: Record<string, any[]>, session: any) => {
    const date = session.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {});

  const sortedDates = Object.keys(sessionsByDate).sort();

  // Initialize selectedDate from initial session
  useEffect(() => {
    if (initialSession && !selectedDate) {
      setSelectedDate(initialSession.date);
    }
  }, [initialSession, selectedDate]);

  // Update selectedSessionId when sessionId param changes
  useEffect(() => {
    if (sessionId && !selectedSessionId) {
      setSelectedSessionId(sessionId);
    }
  }, [sessionId, selectedSessionId]);

  // Get sessions for the selected date
  const sessionsForSelectedDate = selectedDate ? (sessionsByDate[selectedDate] || []) : [];

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!guest || !selectedSessionId) throw new Error('Invalid state');
      
      // Fetch resort to check if it's a demo resort
      const { data: resortData } = await supabase
        .from('resorts')
        .select('is_demo, code')
        .eq('id', guest.resortId)
        .single();
      
      const isDemoResort = resortData?.is_demo || resortData?.code === 'DEMO';
      
      const { data, error } = await supabase.rpc('guest_create_activity_booking', {
        p_guest_id: guest.guestId,
        p_session_id: selectedSessionId,
        p_num_adults: numAdults,
        p_num_children: numChildren,
        p_notes: notes.trim() || null,
        p_stay_id: activeStay?.id || null, // Pass stay context for pre-arrival bookings
      });
      if (error) throw error;
      
      const result = data as { success: boolean; booking_id?: string; status?: string; requires_approval?: boolean; is_prearrival?: boolean; error?: string };
      
      // If demo resort, update the booking with origin='demo_user'
      if (isDemoResort && result?.success && result?.booking_id) {
        await supabase
          .from('activity_bookings')
          .update({ origin: 'demo_user' })
          .eq('id', result.booking_id);
      }
      
      return result;
    },
    onSuccess: async (data) => {
      if (data.success) {
        // Trigger celebration animation (non-blocking)
        triggerCelebration();

        queryClient.invalidateQueries({ queryKey: ['guest-bookings'] });
        queryClient.invalidateQueries({ queryKey: ['guest-available-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['guest-all-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['guest-room-bookings'] });
        setBookingResult({
          success: true,
          requiresApproval: data.requires_approval,
          isPrearrival: data.is_prearrival || isPrearrival,
        });

        // Send notifications (fire and forget)
        const session = selectedSession || initialSession;
        if (session && guest) {
          const dateStr = format(parseISO(session.date), 'EEE, MMM d');
          const timeStr = session.start_time.slice(0, 5);
          const messages = formatActivityBookingMessage(
            session.activity_name,
            dateStr,
            timeStr,
            guest.fullName,
            guest.roomNumber
          );

          // Guest notification
          const notifType = data.requires_approval ? 'ACTIVITY_BOOKING_PENDING' : 'ACTIVITY_BOOKING_CONFIRMED';
          const notifMessage = data.requires_approval ? messages.guest.pending : messages.guest.confirmed;
          createGuestNotification({
            resort_id: guest.resortId,
            guest_id: guest.guestId,
            type: notifType,
            title: data.requires_approval ? 'Booking Request Sent' : 'Booking Confirmed',
            message: notifMessage,
            link_url: '/guest/bookings',
          }).catch(console.error);

          // Staff notification for pending requests
          if (data.requires_approval) {
            createStaffNotificationsForRoles({
              resort_id: guest.resortId,
              roles: ['RESORT_ADMIN', 'FRONT_OFFICE', 'ACTIVITIES'],
              type: 'ACTIVITY_BOOKING_PENDING',
              title: 'New Activity Request',
              message: messages.staff.pending,
              link_url: '/staff/guest-requests',
            }).catch(console.error);
          }

          // Award loyalty points for confirmed bookings (fire and forget)
          if (!data.requires_approval && data.booking_id) {
            const totalPax = numAdults + numChildren;
            const pointsToAward = totalPax * 50; // 50 points per person
            awardLoyaltyPoints(
              guest.guestId,
              guest.resortId,
              'activity_booking',
              pointsToAward,
              data.booking_id,
              'activity_booking',
              `Activity: ${session.activity_name}`
            ).catch(console.error);
          }
        }
      } else {
        const errorCode = mapErrorToCode(data.error || '');
        const friendlyMessage = getBookingErrorMessage(errorCode, 'guest');
        setBookingResult({
          success: false,
          error: friendlyMessage,
        });
      }
    },
    onError: (error: Error) => {
      const errorCode = mapErrorToCode(error.message);
      const friendlyMessage = getBookingErrorMessage(errorCode, 'guest');
      setBookingResult({
        success: false,
        error: friendlyMessage,
      });
    },
  });

  // Determine back navigation path
  const backPath = code ? `/resort/${code}/guest/activities` : '/guest/activities';

  if (!guest) return null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Check if the session exists but has already started (deep-link to past session)
  const isInitialSessionPast = initialSession && guest?.resortTimezone && 
    isSessionPast(initialSession.date, initialSession.start_time, guest.resortTimezone);

  if (!initialSession || isInitialSessionPast) {
    return (
      <SessionExpiredState 
        activityName={initialSession?.activity_name}
        onViewOtherTimes={() => navigate(backPath)}
      />
    );
  }

  const session = selectedSession || initialSession;
  const categoryConfig = getCategoryConfig(session.category);

  // Booking success screen
  if (bookingResult?.success) {
    const guestBookingsPath = code ? `/guest/bookings` : '/guest/bookings';
    const isPreArrivalBooking = bookingResult.isPrearrival;
    return (
      <>
        <BookingSuccessCelebration 
          isVisible={isCelebrating} 
          onComplete={dismissCelebration} 
        />
        <div className="space-y-4">
          <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">
              {bookingResult.requiresApproval 
                ? 'Request Sent!' 
                : isPreArrivalBooking 
                  ? 'Reserved for Your Stay!' 
                  : "You're Booked!"}
            </h2>
            <p className="text-muted-foreground mb-2">
              {bookingResult.requiresApproval
                ? `We've sent your request for ${session.activity_name} on ${format(parseISO(session.date), 'EEE, MMM d')} at ${session.start_time.slice(0, 5)}.`
                : isPreArrivalBooking
                  ? `We've reserved ${session.activity_name} for ${format(parseISO(session.date), 'EEE, MMM d')} at ${session.start_time.slice(0, 5)}. See you soon!`
                  : `Your booking for ${session.activity_name} on ${format(parseISO(session.date), 'EEE, MMM d')} at ${session.start_time.slice(0, 5)} is confirmed.`}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {bookingResult.requiresApproval
                ? "We'll confirm this as soon as possible."
                : isPreArrivalBooking
                  ? "You can modify this booking anytime before your arrival."
                  : "You can find this in 'My Bookings' at any time."}
            </p>
            <div className="space-y-2">
              <Button className="w-full" onClick={() => navigate(guestBookingsPath)}>
                View My Bookings
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate(backPath)}>
                Back to Activities
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      </>
    );
  }

  const totalPax = numAdults + numChildren;
  const maxPaxActivity = session.max_pax_per_booking;
  // Use room occupancy as upper limit, but also respect activity max and remaining spots
  const effectiveMaxPax = Math.min(maxPaxActivity, roomOccupancy || maxPaxActivity, session.remaining_spots);
  
  // Check if there's already a booking from this room
  const existingRoomBooking = roomBookings && roomBookings.length > 0 ? roomBookings[0] : null;
  const hasRoomBooking = !!existingRoomBooking;

  return (
    <GuestPageShell overlay="action" className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate(backPath)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Activities
      </Button>

      {/* Activity Header */}
      <Card className="overflow-hidden">
        <div className="relative">
          {/* Hero section with image or fallback */}
          <div className={cn(
            "h-32 relative",
            !session.image_url && categoryConfig.bgClass
          )}>
            {session.image_url ? (
              <>
                <img 
                  src={session.image_url} 
                  alt={session.activity_name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <CategoryIcon category={session.category} size={64} />
              </div>
            )}
          </div>
          
          {/* Activity info */}
          <CardContent className="pt-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <CardTitle className="text-lg">{session.activity_name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className={cn("text-xs", categoryConfig.chipClass)}>
                    {categoryConfig.label}
                  </Badge>
                  <span>{session.duration_minutes} min</span>
                </CardDescription>
              </div>
              {session.requires_approval && (
                <Badge variant="pending" className="shrink-0">Request Only</Badge>
              )}
            </div>
            {session.description && (
              <p className="text-sm text-muted-foreground mt-2">{session.description}</p>
            )}
          </CardContent>
        </div>
      </Card>

      {/* Session Selector - Compact Layout */}
      {activitySessions.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Choose a Session
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Date Pills - Horizontal Scroll */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {sortedDates.map((date) => {
                const isSelected = date === selectedDate;
                const sessionCount = sessionsByDate[date]?.length || 0;
                
                return (
                  <button
                    key={date}
                    onClick={() => {
                      setSelectedDate(date);
                      // Auto-select first session of this date
                      const firstSession = sessionsByDate[date]?.[0];
                      if (firstSession) {
                        setSelectedSessionId(firstSession.id);
                        setBookingResult(null);
                      }
                    }}
                    className={cn(
                      "flex flex-col items-center px-3 py-2 rounded-lg border transition-all shrink-0 min-w-[60px]",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/50 bg-background"
                    )}
                  >
                    <span className="text-[10px] uppercase tracking-wide opacity-80">
                      {format(parseISO(date), 'EEE')}
                    </span>
                    <span className="font-bold text-sm">
                      {format(parseISO(date), 'd')}
                    </span>
                    <span className="text-[10px] opacity-70">
                      {sessionCount} {sessionCount === 1 ? 'slot' : 'slots'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Time Slots Grid for Selected Date */}
            {selectedDate && sessionsForSelectedDate.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sessionsForSelectedDate.map((s: any) => {
                  const isSelected = s.id === selectedSessionId;
                  const isLowAvailability = s.remaining_spots > 0 && s.remaining_spots <= 3;
                  
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedSessionId(s.id);
                        setBookingResult(null);
                      }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
                        isSelected
                          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <span className={cn(
                        "font-mono font-semibold",
                        isSelected ? "text-primary" : "text-foreground"
                      )}>
                        {s.start_time.slice(0, 5)}
                      </span>
                      <span className={cn(
                        "text-xs",
                        isLowAvailability ? "text-coral font-medium" : "text-muted-foreground"
                      )}>
                        {s.remaining_spots} left
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selected Session Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Session Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(parseISO(session.date), 'EEE, MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className={cn(
                session.remaining_spots <= 3 && "text-coral font-medium"
              )}>
                {session.remaining_spots} spots available
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Duration:</span>
              <span>{session.duration_minutes} min</span>
            </div>
            {session.price_per_person > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-semibold">${session.price_per_person.toFixed(2)} / person</span>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="font-medium mb-1">Good to know:</p>
            <ul className="text-muted-foreground space-y-1">
              <li>• Maximum {effectiveMaxPax} guests per booking</li>
              <li>• Online booking closes {session.guest_cutoff_hours}h before start time</li>
              {session.guest_can_cancel && (
                <li>• You can cancel online up to {session.guest_cancel_cutoff_hours}h before</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Booking Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Number of Guests</CardTitle>
          <p className="text-sm text-muted-foreground">
            {roomOccupancy && roomOccupancy > 1 
              ? `Booking for Room ${guest.roomNumber} (${roomOccupancy} guests)` 
              : `Booking for Room ${guest.roomNumber}`}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Room already has a booking notice */}
          {hasRoomBooking && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Your room already has a booking for this activity session. All guests in room {guest.roomNumber} can view this booking.
              </AlertDescription>
            </Alert>
          )}

          {/* Attendee Selector (shows if travel party has members) */}
          {hasPartyMembers ? (
            <AttendeeSelector
              guestId={guest.guestId}
              roomNumber={guest.roomNumber}
              maxAttendees={effectiveMaxPax}
              onSelectionChange={handleAttendeeSelectionChange}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <NumberStepper
                label="Adults"
                value={numAdults}
                onChange={(value) => setNumAdults(Math.min(value, effectiveMaxPax - numChildren))}
                min={1}
                max={effectiveMaxPax - numChildren}
                disabled={hasRoomBooking}
              />
              <NumberStepper
                label="Children"
                value={numChildren}
                onChange={(value) => setNumChildren(Math.min(value, effectiveMaxPax - numAdults))}
                min={0}
                max={effectiveMaxPax - numAdults}
                disabled={hasRoomBooking}
              />
            </div>
          )}

          {/* Pricing Summary */}
          {session.price_per_person > 0 && (() => {
            const baseAmount = session.price_per_person * totalPax;
            const breakdown = calculatePriceBreakdown(baseAmount, pricingCharges);
            
            return (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    ${session.price_per_person.toFixed(2)} × {totalPax} {totalPax === 1 ? 'guest' : 'guests'}
                  </span>
                  <span>${breakdown.subtotal.toFixed(2)}</span>
                </div>
                
                {breakdown.charges.map((charge, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {charge.name} ({charge.percentage}%)
                    </span>
                    <span>${charge.amount.toFixed(2)}</span>
                  </div>
                ))}
                
                {breakdown.charges.length > 0 && (
                  <div className="border-t border-primary/20 pt-2 mt-2 flex items-center justify-between">
                    <span className="font-medium">Total</span>
                    <span className="font-semibold text-lg text-foreground">
                      ${breakdown.total.toFixed(2)}
                    </span>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground pt-1">
                  Estimated total • Payment at resort
                </p>
              </div>
            );
          })()}

          {/* Pre-arrival booking notice */}
          {isPrearrival && (
            <Alert className="bg-primary/5 border-primary/20">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                This will be reserved for your upcoming stay. You can modify it later.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Notes for the team (optional)</Label>
            <Textarea
              placeholder="Any special requirements? e.g., dietary needs, mobility assistance..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
            />
          </div>

          {bookingResult?.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{bookingResult.error}</AlertDescription>
            </Alert>
          )}

          {totalPax > session.remaining_spots && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Only {session.remaining_spots} spots available. Please reduce the number of guests.
              </AlertDescription>
            </Alert>
          )}

          {/* Desktop-only inline button */}
          <Button
            className="hidden lg:flex w-full h-12 text-base font-semibold"
            onClick={() => bookMutation.mutate()}
            disabled={bookMutation.isPending || totalPax > session.remaining_spots || totalPax < 1 || hasRoomBooking}
          >
            {bookMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirming your booking...
              </>
            ) : hasRoomBooking ? (
              'Already Booked'
            ) : (
              session.requires_approval ? 'Submit Request' : 'Confirm Booking'
            )}
          </Button>
        </CardContent>
      </Card>

      <StickyActionBarSpacer />

      <StickyActionBar>
        <Button
          className="w-full h-12 text-base font-semibold"
          onClick={() => bookMutation.mutate()}
          disabled={bookMutation.isPending || totalPax > session.remaining_spots || totalPax < 1 || hasRoomBooking}
        >
          {bookMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Confirming your booking...
            </>
          ) : hasRoomBooking ? (
            'Already Booked'
          ) : (
            session.requires_approval ? 'Submit Request' : 'Confirm Booking'
          )}
        </Button>
      </StickyActionBar>
    </GuestPageShell>
  );
}