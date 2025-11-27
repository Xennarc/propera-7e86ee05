import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, parseISO, isToday } from 'date-fns';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Utensils, ClipboardList, Clock, MapPin } from 'lucide-react';
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
      {/* Greeting */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">
          Hello, {firstName}!
        </h1>
        <p className="text-muted-foreground">
          Room {guest.roomNumber} • {format(parseISO(guest.checkInDate), 'MMM d')} – {format(parseISO(guest.checkOutDate), 'MMM d, yyyy')}
        </p>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Today's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : todaySchedule.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No bookings for today. Explore activities and restaurants below!
            </p>
          ) : (
            <div className="space-y-3">
              {todaySchedule.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    {item.type === 'activity' ? (
                      <Calendar className="h-5 w-5 text-primary" />
                    ) : (
                      <Utensils className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
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
                  >
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4">
        <Link to="/guest/activities">
          <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Book Activities</h3>
                <p className="text-sm text-muted-foreground">
                  Explore excursions, diving, and more
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/guest/restaurants">
          <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Utensils className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Book a Restaurant</h3>
                <p className="text-sm text-muted-foreground">
                  Reserve your dining experience
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/guest/bookings">
          <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">My Bookings</h3>
                <p className="text-sm text-muted-foreground">
                  View and manage your reservations
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
