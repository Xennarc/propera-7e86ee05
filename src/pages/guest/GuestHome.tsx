import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sun, Sunset, Moon, ChevronRight, Compass } from 'lucide-react';
import {
  IconActivities,
  IconRestaurants,
  IconBookings,
  IconCalendar,
  IconClock,
  IconFeedback,
  IconStay,
} from '@/components/icons/ProperaIcons';

export default function GuestHome() {
  const { guest } = useGuestAuth();

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
