import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Utensils, ClipboardList, Clock, Sun, Sunset, Moon, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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
      {/* Premium Greeting Card */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <GreetingIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {greeting.text}, {firstName}!
              </h1>
              <p className="text-sm text-muted-foreground">
                Welcome to your island escape
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-primary/10">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Room {guest.roomNumber}</span>
              <span className="text-muted-foreground">
                {format(parseISO(guest.checkInDate), 'MMM d')} – {format(parseISO(guest.checkOutDate), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Schedule */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-foreground">Today's Schedule</h2>
        </div>
        
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : todaySchedule.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No bookings for today. Explore activities and restaurants below!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {todaySchedule.map((item, idx) => (
              <Card
                key={idx}
                className="hover:shadow-card-hover hover:border-primary/30 transition-all"
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    {item.type === 'activity' ? (
                      <Calendar className="h-6 w-6 text-primary" />
                    ) : (
                      <Utensils className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {item.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.time.slice(0, 5)}
                      {item.type === 'restaurant' && item.mealPeriod && (
                        <span className="ml-2">• {item.mealPeriod}</span>
                      )}
                    </p>
                  </div>
                  <Badge
                    variant={item.status === 'CONFIRMED' ? 'confirmed' : 'pending'}
                    className="shrink-0"
                  >
                    {item.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="font-semibold text-foreground">Explore & Book</h2>
        
        <Link to="/guest/activities">
          <Card className="hover:shadow-card-hover hover:border-primary/30 transition-all cursor-pointer group">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                <Calendar className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  Book Activities
                </h3>
                <p className="text-sm text-muted-foreground">
                  Explore excursions, diving, and more
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/guest/restaurants">
          <Card className="hover:shadow-card-hover hover:border-primary/30 transition-all cursor-pointer group">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                <Utensils className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
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
          <Card className="hover:shadow-card-hover hover:border-primary/30 transition-all cursor-pointer group">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                <ClipboardList className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
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
