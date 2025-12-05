import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, parseISO, addDays } from 'date-fns';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Sun, Sunset, Moon, ChevronRight, Compass, Sparkles } from 'lucide-react';
import {
  IconActivities,
  IconRestaurants,
  IconBookings,
  IconCalendar,
  IconClock,
  IconFeedback,
  IconStay,
} from '@/components/icons/ProperaIcons';
import { CategoryIcon, CategoryBadge } from '@/components/ui/category-badge';
import {
  createActivityBookingFromInStaySuggestion,
} from '@/lib/booking-source-helpers';

export default function GuestHome() {
  const { guest } = useGuestAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['guest-bookings', guest?.guestId],
    queryFn: async () => {
      if (!guest) return null;
      const { data, error } = await supabase.rpc('guest_get_bookings', {
        p_guest_id: guest.guestId,
      });
      if (error) throw error;
      return data as {
        activity_bookings: any[];
        restaurant_reservations: any[];
      };
    },
    enabled: !!guest,
  });

  // Check if guest can submit feedback
  const { data: canSubmitFeedback } = useQuery({
    queryKey: ['can-submit-feedback', guest?.guestId],
    queryFn: async () => {
      if (!guest) return null;
      const { data, error } = await supabase.rpc('guest_can_submit_feedback', {
        p_guest_id: guest.guestId,
      });
      if (error) throw error;
      return data as { can_submit: boolean; reason?: string };
    },
    enabled: !!guest,
  });

  // Fetch resort code for activity explorer links
  const { data: resort } = useQuery({
    queryKey: ['guest-resort', guest?.resortId],
    queryFn: async () => {
      if (!guest) return null;
      const { data, error } = await supabase
        .from('resorts')
        .select('code')
        .eq('id', guest.resortId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!guest,
  });

  if (!guest) return null;

  const firstName = guest.fullName.split(' ')[0];
  const todayStr = new Date().toISOString().split('T')[0];
  const hour = new Date().getHours();

  // Get greeting based on time of day
  const getGreeting = () => {
    if (hour < 12) return { text: 'Good morning', icon: Sun };
    if (hour < 17) return { text: 'Good afternoon', icon: Sun };
    if (hour < 21) return { text: 'Good evening', icon: Sunset };
    return { text: 'Good night', icon: Moon };
  };

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  // Filter today's bookings
  const todayActivities = bookings?.activity_bookings?.filter(
    (b) => b.date === todayStr && (b.status === 'CONFIRMED' || b.status === 'PENDING')
  ) || [];

  const todayReservations = bookings?.restaurant_reservations?.filter(
    (r) => r.date === todayStr && (r.status === 'CONFIRMED' || r.status === 'PENDING')
  ) || [];

  const todaySchedule = [
    ...todayActivities.map((b) => ({
      type: 'activity' as const,
      time: b.start_time,
      title: b.activity_name,
      status: b.status,
    })),
    ...todayReservations.map((r) => ({
      type: 'restaurant' as const,
      time: r.start_time,
      title: r.restaurant_name,
      mealPeriod: r.meal_period,
      status: r.status,
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  // Calculate if guest has "no plans yet" - check if they have few bookings
  const upcomingActivities = bookings?.activity_bookings?.filter(
    (b) => b.date >= todayStr && (b.status === 'CONFIRMED' || b.status === 'PENDING')
  ) || [];
  const upcomingReservations = bookings?.restaurant_reservations?.filter(
    (r) => r.date >= todayStr && (r.status === 'CONFIRMED' || r.status === 'PENDING')
  ) || [];
  
  const totalUpcomingBookings = upcomingActivities.length + upcomingReservations.length;
  const showNudge = !isLoading && totalUpcomingBookings <= 2 && todaySchedule.length === 0;

  // Fetch smart suggestions for in-stay upsell
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const { data: suggestions } = useQuery({
    queryKey: ['guest-suggestions', guest?.guestId, todayStr],
    queryFn: async () => {
      if (!guest) return null;

      // Fetch suggested activities for today and tomorrow
      const { data: activityData } = await supabase.rpc('guest_get_available_sessions', {
        p_guest_id: guest.guestId,
        p_date: null, // Get all upcoming
      });

      const sessions = (activityData as any[]) || [];
      
      // Filter to today/tomorrow and sort by popularity (remaining_spots desc means less popular, so reverse)
      const todayTomorrowSessions = sessions
        .filter((s: any) => s.date === todayStr || s.date === tomorrow)
        .sort((a: any, b: any) => {
          // Prioritize sessions with more bookings (capacity - remaining = booked)
          const aBooked = a.capacity - a.remaining_spots;
          const bBooked = b.capacity - b.remaining_spots;
          return bBooked - aBooked;
        })
        .slice(0, 2); // Top 2 activities

      // Fetch suggested restaurant slots for today
      const { data: restaurantData } = await supabase.rpc('guest_get_available_slots', {
        p_guest_id: guest.guestId,
        p_date: todayStr,
      });

      const slots = (restaurantData as any[]) || [];
      
      // Get dinner slots for tonight
      const dinnerSlots = slots
        .filter((s: any) => s.meal_period === 'DINNER' && s.remaining_covers > 0)
        .slice(0, 1); // Top 1 restaurant

      return {
        activities: todayTomorrowSessions,
        restaurants: dinnerSlots,
      };
    },
    enabled: !!guest && showNudge,
  });

  // Mutation for booking activities from suggestions
  const bookActivityMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!guest) throw new Error('Not authenticated');
      
      return createActivityBookingFromInStaySuggestion({
        guestId: guest.guestId,
        sessionId,
        numAdults: 1,
        numChildren: 0,
      });
    },
    onSuccess: (result, sessionId) => {
      if ((result.data as any)?.success) {
        const session = suggestions?.activities.find((s: any) => s.id === sessionId);
        toast({
          title: "You're booked!",
          description: `${session?.activity_name} on ${format(parseISO(session?.date), 'MMM d')} at ${session?.start_time.slice(0, 5)}`,
        });
        queryClient.invalidateQueries({ queryKey: ['guest-bookings'] });
        queryClient.invalidateQueries({ queryKey: ['guest-suggestions'] });
      } else {
        toast({
          title: "Couldn't complete booking",
          description: "This time may no longer be available. Please try another or contact reception.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Booking failed",
        description: "Something went wrong. Please try again or contact reception.",
        variant: "destructive",
      });
    },
  });

  const hasSuggestions = (suggestions?.activities?.length || 0) + (suggestions?.restaurants?.length || 0) > 0;

  return (
    <div className="space-y-6">
      {/* Feedback Prompt - Show when eligible */}
      {canSubmitFeedback?.can_submit && (
        <Card className="bg-gradient-to-br from-warning/10 via-warning/5 to-transparent border-warning/20 overflow-hidden shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-warning/10 shadow-sm">
                <IconFeedback className="h-7 w-7 text-warning" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-foreground mb-1">
                  How was your stay?
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Your feedback helps us improve. This takes less than a minute.
                </p>
                <Link to="/guest/feedback">
                  <Button size="sm" className="bg-warning hover:bg-warning/90 text-warning-foreground rounded-full font-semibold shadow-sm">
                    Share Feedback
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Premium Greeting Card */}
      <Card className="relative overflow-hidden border-primary/20 shadow-soft">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
        <CardContent className="p-6 relative">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 shadow-sm">
              <GreetingIcon className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {greeting.text}, {firstName}!
              </h1>
              <p className="text-muted-foreground">
                {todaySchedule.length > 0 
                  ? "Here's what you have planned today."
                  : "You can book activities and restaurants during your stay."}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm pt-4 border-t border-primary/10">
            <div className="flex items-center gap-2 text-muted-foreground">
              <IconStay className="h-4 w-4" />
              <span className="font-medium">Room {guest.roomNumber}</span>
            </div>
            <span className="text-muted-foreground font-medium">
              {format(parseISO(guest.checkInDate), 'MMM d')} – {format(parseISO(guest.checkOutDate), 'MMM d, yyyy')}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Smart Nudge - No Plans Yet with Suggestions */}
      {showNudge && hasSuggestions && (
        <Card className="border-dashed border-2 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">No plans for today yet?</h3>
                  <p className="text-sm text-muted-foreground">
                    Here are some popular options you can still book.
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                {/* Activity Suggestions */}
                {suggestions?.activities?.map((session: any) => (
                  <Card key={session.id} className="shadow-soft border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                          <IconActivities className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-foreground mb-1 truncate">
                            {session.activity_name}
                          </h4>
                          <p className="text-sm text-muted-foreground mb-1">
                            {format(parseISO(session.date), 'MMM d')} at {session.start_time.slice(0, 5)}
                            {session.duration_minutes && ` • ${session.duration_minutes}min`}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            Guest favourite
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => bookActivityMutation.mutate(session.id)}
                          disabled={bookActivityMutation.isPending}
                          className="shrink-0"
                        >
                          {bookActivityMutation.isPending ? 'Booking...' : 'Book now'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Restaurant Suggestions */}
                {suggestions?.restaurants?.map((slot: any) => (
                  <Card key={slot.id} className="shadow-soft border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                          <IconRestaurants className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-foreground mb-1 truncate">
                            {slot.restaurant_name}
                          </h4>
                          <p className="text-sm text-muted-foreground mb-1">
                            Tonight at {slot.start_time.slice(0, 5)}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            Still available for tonight
                          </Badge>
                        </div>
                        <Link to={`/guest/restaurants/book/${slot.id}`}>
                          <Button size="sm" className="shrink-0">
                            Reserve table
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="pt-2 text-center">
                <Link to="/guest/activities" className="text-sm text-primary hover:underline font-medium">
                  See all activities →
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fallback nudge if no suggestions available */}
      {showNudge && !hasSuggestions && (
        <Card className="border-dashed border-2 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Compass className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">No plans for today yet?</h3>
                <p className="text-muted-foreground mb-4">
                  Explore activities and dining options during your stay.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/guest/activities">
                  <Button className="w-full sm:w-auto">
                    <IconActivities className="h-4 w-4 mr-2" />
                    Explore Activities
                  </Button>
                </Link>
                <Link to="/guest/restaurants">
                  <Button variant="outline" className="w-full sm:w-auto">
                    <IconRestaurants className="h-4 w-4 mr-2" />
                    Book a Restaurant
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Schedule */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <IconClock className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Today's Schedule</h2>
        </div>
        
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : todaySchedule.length === 0 ? (
          <Card className="border-dashed border-2 bg-muted/20">
            <CardContent className="py-10 text-center">
              <IconCalendar className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-1">No plans for today yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                You can book activities or a restaurant directly from below.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {todaySchedule.map((item, idx) => (
              <Card
                key={idx}
                className="shadow-soft hover:shadow-card-hover hover:border-primary/30 transition-all duration-300"
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 shadow-sm">
                    {item.type === 'activity' ? (
                      <IconActivities className="h-7 w-7 text-primary" />
                    ) : (
                      <IconRestaurants className="h-7 w-7 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground truncate">
                      {item.title}
                    </p>
                    <p className="text-sm text-muted-foreground font-medium">
                      {item.time.slice(0, 5)}
                      {item.type === 'restaurant' && item.mealPeriod && (
                        <span className="ml-2">• {item.mealPeriod}</span>
                      )}
                    </p>
                  </div>
                  <Badge
                    variant={item.status === 'CONFIRMED' ? 'confirmed' : 'pending'}
                    className="shrink-0 rounded-full px-3"
                  >
                    {item.status === 'CONFIRMED' ? 'Confirmed' : 'Pending'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">Explore & Book</h2>
        
        {/* Explore Activities - links to resort-specific activity explorer */}
        {resort?.code && (
          <Link to={`/resort/${resort.code}/guest/activities`}>
            <Card className="shadow-soft hover:shadow-card-hover hover:border-primary/30 transition-all duration-300 cursor-pointer group bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-primary/15 shadow-sm group-hover:from-primary/40 group-hover:to-primary/20 transition-all duration-300">
                  <Compass className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                    Explore Activities
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Learn about all experiences we offer
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </CardContent>
            </Card>
          </Link>
        )}

        <Link to="/guest/activities">
          <Card className="shadow-soft hover:shadow-card-hover hover:border-primary/30 transition-all duration-300 cursor-pointer group">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-sm group-hover:from-primary/30 group-hover:to-primary/15 transition-all duration-300">
                <IconActivities className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                  Book Activities
                </h3>
                <p className="text-sm text-muted-foreground">
                  Browse available sessions and book
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/guest/restaurants">
          <Card className="shadow-soft hover:shadow-card-hover hover:border-primary/30 transition-all duration-300 cursor-pointer group">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-sm group-hover:from-primary/30 group-hover:to-primary/15 transition-all duration-300">
                <IconRestaurants className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                  Book a Restaurant
                </h3>
                <p className="text-sm text-muted-foreground">
                  Reserve your dining experience
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/guest/bookings">
          <Card className="shadow-soft hover:shadow-card-hover hover:border-primary/30 transition-all duration-300 cursor-pointer group">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-sm group-hover:from-primary/30 group-hover:to-primary/15 transition-all duration-300">
                <IconBookings className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                  My Bookings
                </h3>
                <p className="text-sm text-muted-foreground">
                  View and manage your reservations
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
