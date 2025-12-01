import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { format, parseISO } from 'date-fns';
import { Compass, Calendar, Utensils, Clock, Users, AlertCircle } from 'lucide-react';
import { IconActivities, IconRestaurants } from '@/components/icons/ProperaIcons';

interface TokenData {
  id: string;
  resort_id: string;
  guest_id: string;
  expires_at: string;
}

interface GuestData {
  id: string;
  full_name: string;
  room_number: string;
  check_in_date: string;
  check_out_date: string;
}

interface ResortData {
  id: string;
  name: string;
  code: string;
  login_logo_url: string | null;
  login_primary_color: string | null;
}

interface ActivitySession {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  remaining_spots: number;
  activity_name: string;
  activity_description: string | null;
  category: string;
  price_per_person: number;
}

interface RestaurantSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  meal_period: string;
  capacity: number;
  remaining_covers: number;
  restaurant_name: string;
  restaurant_description: string | null;
}

export default function PreArrivalPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [validating, setValidating] = useState(true);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Validate token
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Invalid link');
        setValidating(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('prearrival_tokens')
          .select('*')
          .eq('token', token)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (fetchError || !data) {
          setError('This link is no longer valid. Please contact the resort.');
          setValidating(false);
          return;
        }

        setTokenData(data as TokenData);
        setValidating(false);
      } catch (err) {
        setError('Something went wrong. Please try again or contact the resort.');
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  // Fetch guest data
  const { data: guest, isLoading: guestLoading } = useQuery({
    queryKey: ['prearrival-guest', tokenData?.guest_id],
    queryFn: async () => {
      if (!tokenData) return null;
      const { data, error } = await supabase
        .from('guests')
        .select('id, full_name, room_number, check_in_date, check_out_date')
        .eq('id', tokenData.guest_id)
        .single();
      if (error) throw error;
      return data as GuestData;
    },
    enabled: !!tokenData,
  });

  // Fetch resort data
  const { data: resort, isLoading: resortLoading } = useQuery({
    queryKey: ['prearrival-resort', tokenData?.resort_id],
    queryFn: async () => {
      if (!tokenData) return null;
      const { data, error } = await supabase
        .from('resorts')
        .select('id, name, code, login_logo_url, login_primary_color')
        .eq('id', tokenData.resort_id)
        .single();
      if (error) throw error;
      return data as ResortData;
    },
    enabled: !!tokenData,
  });

  // Fetch available activity sessions for stay window
  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['prearrival-activities', tokenData?.guest_id],
    queryFn: async () => {
      if (!tokenData || !guest) return [];
      const { data, error } = await supabase.rpc('guest_get_available_sessions', {
        p_guest_id: tokenData.guest_id,
      });
      if (error) throw error;
      return (data as any) as ActivitySession[];
    },
    enabled: !!tokenData && !!guest,
  });

  // Fetch available restaurant slots for stay window
  const { data: restaurants = [], isLoading: restaurantsLoading } = useQuery({
    queryKey: ['prearrival-restaurants', tokenData?.guest_id],
    queryFn: async () => {
      if (!tokenData || !guest) return [];
      const { data, error } = await supabase.rpc('guest_get_available_slots', {
        p_guest_id: tokenData.guest_id,
      });
      if (error) throw error;
      return (data as any) as RestaurantSlot[];
    },
    enabled: !!tokenData && !!guest,
  });

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Validating your link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <div>
              <h2 className="text-xl font-bold mb-2">Link Invalid</h2>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <Button onClick={() => navigate('/')} variant="outline">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const loading = guestLoading || resortLoading || activitiesLoading || restaurantsLoading;
  const firstName = guest?.full_name.split(' ')[0] || '';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {resort?.login_logo_url && (
              <img src={resort.login_logo_url} alt={resort.name} className="h-8 w-auto" />
            )}
            <span className="font-bold text-lg">{resort?.name}</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-5xl px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  Welcome, {firstName}!
                </h1>
                <p className="text-muted-foreground">
                  We're excited to have you join us soon. Browse and plan your stay in advance.
                </p>
              </div>
              {guest && (
                <div className="flex flex-wrap gap-4 text-sm border-t border-primary/10 pt-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {format(parseISO(guest.check_in_date), 'MMM d')} – {format(parseISO(guest.check_out_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Room {guest.room_number}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Call to Action - Login to Book */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Compass className="h-8 w-8 text-blue-600 dark:text-blue-400 shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-2">Ready to Book?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  To make reservations, please log in to your guest portal using the credentials provided by the resort.
                </p>
                {resort && (
                  <Button asChild>
                    <Link to={`/resort/${resort.code}/guest/login`}>
                      Go to Guest Login
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activities Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <IconActivities className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Available Activities</h2>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : activities.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No activities available for your stay dates.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activities.slice(0, 6).map((activity) => (
                <Card key={activity.id} className="hover:border-primary/30 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{activity.activity_name}</CardTitle>
                      <Badge variant="outline">{activity.category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {activity.activity_description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {activity.activity_description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{activity.start_time.slice(0, 5)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{activity.remaining_spots} spots left</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Restaurants Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <IconRestaurants className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Restaurant Reservations</h2>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : restaurants.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No restaurant slots available for your stay dates.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {restaurants.slice(0, 4).map((slot) => (
                <Card key={slot.id} className="hover:border-primary/30 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{slot.restaurant_name}</CardTitle>
                      <Badge variant="outline">{slot.meal_period}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{slot.start_time.slice(0, 5)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{slot.remaining_covers} covers left</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
