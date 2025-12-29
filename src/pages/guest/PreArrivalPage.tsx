import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isSameDay } from 'date-fns';
import { Calendar, Utensils, Clock, Users, AlertCircle, Plus, X, CheckCircle2, CalendarCheck, Sparkles } from 'lucide-react';
import { IconActivities, IconRestaurants } from '@/components/icons/ProperaIcons';
import { createActivityBookingFromPreArrival, createRestaurantReservationFromPreArrival } from '@/lib/booking-source-helpers';
import { getBookingErrorMessage } from '@/lib/booking-errors';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  activity_id: string;
  activity_name: string;
  activity_description: string | null;
  category: string;
  price_per_person: number;
  duration_minutes: number;
}

interface RestaurantSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  meal_period: string;
  capacity: number;
  remaining_covers: number;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_description: string | null;
}

interface ItineraryItem {
  type: 'activity' | 'restaurant';
  id: string;
  sessionId: string;
  name: string;
  date: string;
  time: string;
  details: string;
  status: 'planned' | 'booked';
  bookingId?: string;
}

const STORAGE_KEY = 'propera_prearrival_itinerary';

export default function PreArrivalPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [validating, setValidating] = useState(true);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);

  // Load itinerary from localStorage
  useEffect(() => {
    if (!token) return;
    const stored = localStorage.getItem(`${STORAGE_KEY}_${token}`);
    if (stored) {
      try {
        setItinerary(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse itinerary', e);
      }
    }
  }, [token]);

  // Save itinerary to localStorage
  useEffect(() => {
    if (!token) return;
    localStorage.setItem(`${STORAGE_KEY}_${token}`, JSON.stringify(itinerary));
  }, [itinerary, token]);

  // Validate token
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Invalid link');
        setValidating(false);
        return;
      }

      try {
        // Use secure RPC function instead of direct table query
        const { data: result, error: rpcError } = await supabase
          .rpc('validate_prearrival_token', { p_token: token });

        const validationResult = result as { success: boolean; error?: string; token?: { id: string; resort_id: string; guest_id: string; expires_at: string } } | null;

        if (rpcError || !validationResult?.success) {
          const errorCode = validationResult?.error || 'UNKNOWN_ERROR';
          const errorMessages: Record<string, string> = {
            'TOKEN_NOT_FOUND': 'This link is no longer available. It may have expired or is invalid. Please contact the resort if you need assistance.',
            'TOKEN_REVOKED': 'This link has been revoked. Please contact the resort for a new one.',
            'TOKEN_EXPIRED': 'This link has expired. Please contact the resort for a new one.',
            'GUEST_NOT_FOUND': 'Guest not found. Please contact the resort for assistance.',
          };
          setError(errorMessages[errorCode] || 'Something went wrong. Please try again or contact the resort.');
          setValidating(false);
          return;
        }

        // Extract token data from RPC response
        const tokenInfo = validationResult.token;
        if (tokenInfo) {
          setTokenData({
            id: tokenInfo.id,
            resort_id: tokenInfo.resort_id,
            guest_id: tokenInfo.guest_id,
            expires_at: tokenInfo.expires_at,
          } as TokenData);
        }
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

  // Book activity mutation
  const bookActivityMutation = useMutation({
    mutationFn: async (params: { sessionId: string; numAdults: number; numChildren: number }) => {
      if (!tokenData) throw new Error('No token data');
      return createActivityBookingFromPreArrival({
        guestId: tokenData.guest_id,
        sessionId: params.sessionId,
        numAdults: params.numAdults,
        numChildren: params.numChildren,
      });
    },
    onSuccess: (result, variables) => {
      if (result.error || !(result.data as any)?.success) {
        const errorMsg = getBookingErrorMessage((result.data as any)?.error || 'UNKNOWN');
        toast({
          variant: 'destructive',
          title: 'Booking failed',
          description: errorMsg,
        });
        return;
      }

      const bookingId = (result.data as any).booking_id;
      
      // Update itinerary status
      setItinerary(prev => prev.map(item =>
        item.sessionId === variables.sessionId && item.type === 'activity'
          ? { ...item, status: 'booked' as const, bookingId }
          : item
      ));

      toast({
        title: 'Activity booked!',
        description: 'Your booking has been confirmed.',
      });

      queryClient.invalidateQueries({ queryKey: ['prearrival-activities'] });
    },
  });

  // Book restaurant mutation
  const bookRestaurantMutation = useMutation({
    mutationFn: async (params: { slotId: string; numAdults: number; numChildren: number }) => {
      if (!tokenData) throw new Error('No token data');
      return createRestaurantReservationFromPreArrival({
        guestId: tokenData.guest_id,
        slotId: params.slotId,
        numAdults: params.numAdults,
        numChildren: params.numChildren,
      });
    },
    onSuccess: (result, variables) => {
      if (result.error || !(result.data as any)?.success) {
        const errorMsg = getBookingErrorMessage((result.data as any)?.error || 'UNKNOWN');
        toast({
          variant: 'destructive',
          title: 'Reservation failed',
          description: errorMsg,
        });
        return;
      }

      const reservationId = (result.data as any).reservation_id;
      
      // Update itinerary status
      setItinerary(prev => prev.map(item =>
        item.sessionId === variables.slotId && item.type === 'restaurant'
          ? { ...item, status: 'booked' as const, bookingId: reservationId }
          : item
      ));

      toast({
        title: 'Table reserved!',
        description: 'Your reservation has been confirmed.',
      });

      queryClient.invalidateQueries({ queryKey: ['prearrival-restaurants'] });
    },
  });

  const addToItinerary = (item: Omit<ItineraryItem, 'status'>) => {
    setItinerary(prev => [...prev, { ...item, status: 'planned' }]);
    toast({
      title: 'Added to itinerary',
      description: `${item.name} added to your plan.`,
    });
  };

  const removeFromItinerary = (sessionId: string) => {
    setItinerary(prev => prev.filter(item => item.sessionId !== sessionId));
    toast({
      title: 'Removed',
      description: 'Item removed from your itinerary.',
    });
  };

  const isInItinerary = (sessionId: string) => {
    return itinerary.some(item => item.sessionId === sessionId);
  };

  const bookFromItinerary = (item: ItineraryItem) => {
    if (item.type === 'activity') {
      bookActivityMutation.mutate({
        sessionId: item.sessionId,
        numAdults: 2, // Default for pre-arrival
        numChildren: 0,
      });
    } else {
      bookRestaurantMutation.mutate({
        slotId: item.sessionId,
        numAdults: 2, // Default for pre-arrival
        numChildren: 0,
      });
    }
  };

  // Group itinerary by date
  const groupedItinerary = itinerary.reduce((acc, item) => {
    const dateKey = item.date;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {} as Record<string, ItineraryItem[]>);

  const sortedDates = Object.keys(groupedItinerary).sort();

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
              <h2 className="text-xl font-bold mb-2">Link No Longer Available</h2>
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
            <div>
              <span className="font-bold text-lg">{resort?.name}</span>
              <p className="text-xs text-muted-foreground">Pre-arrival planning</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-7xl px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column - Suggested Experiences */}
          <div className="lg:col-span-2 space-y-6">
            {/* Welcome Section */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">
                      Hi {firstName}, welcome to {resort?.name}!
                    </h1>
                    <p className="text-muted-foreground">
                      Get a head start on planning your stay. Browse activities and dining, add them to your itinerary, and book the ones you're sure about.
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

            {/* Activities Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <IconActivities className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Suggested Experiences</h2>
              </div>

              {loading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-48 rounded-xl" />
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
                  {activities.map((activity) => {
                    const inItinerary = isInItinerary(activity.id);
                    const itineraryItem = itinerary.find(i => i.sessionId === activity.id);
                    
                    return (
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
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>{format(parseISO(activity.date), 'EEE, MMM d')}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>{activity.start_time.slice(0, 5)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Users className="h-4 w-4" />
                              <span>{activity.remaining_spots} spots</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {!inItinerary ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => addToItinerary({
                                    type: 'activity',
                                    id: activity.activity_id,
                                    sessionId: activity.id,
                                    name: activity.activity_name,
                                    date: activity.date,
                                    time: activity.start_time.slice(0, 5),
                                    details: activity.category,
                                  })}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add to itinerary
                                </Button>
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => {
                                    addToItinerary({
                                      type: 'activity',
                                      id: activity.activity_id,
                                      sessionId: activity.id,
                                      name: activity.activity_name,
                                      date: activity.date,
                                      time: activity.start_time.slice(0, 5),
                                      details: activity.category,
                                    });
                                    bookActivityMutation.mutate({
                                      sessionId: activity.id,
                                      numAdults: 2,
                                      numChildren: 0,
                                    });
                                  }}
                                  disabled={bookActivityMutation.isPending}
                                >
                                  Book now
                                </Button>
                              </>
                            ) : (
                              <Badge variant={itineraryItem?.status === 'booked' ? 'default' : 'secondary'} className="w-full justify-center py-2">
                                {itineraryItem?.status === 'booked' ? (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Booked
                                  </>
                                ) : (
                                  <>
                                    <CalendarCheck className="h-4 w-4 mr-1" />
                                    In itinerary
                                  </>
                                )}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Restaurants Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <IconRestaurants className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Dining During Your Stay</h2>
              </div>

              {loading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-40 rounded-xl" />
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
                  {restaurants.map((slot) => {
                    const inItinerary = isInItinerary(slot.id);
                    const itineraryItem = itinerary.find(i => i.sessionId === slot.id);
                    
                    return (
                      <Card key={slot.id} className="hover:border-primary/30 transition-colors">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base">{slot.restaurant_name}</CardTitle>
                            <Badge variant="outline">{slot.meal_period}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>{format(parseISO(slot.date), 'EEE, MMM d')}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>{slot.start_time.slice(0, 5)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Users className="h-4 w-4" />
                              <span>{slot.remaining_covers} covers</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {!inItinerary ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => addToItinerary({
                                    type: 'restaurant',
                                    id: slot.restaurant_id,
                                    sessionId: slot.id,
                                    name: slot.restaurant_name,
                                    date: slot.date,
                                    time: slot.start_time.slice(0, 5),
                                    details: slot.meal_period,
                                  })}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add to itinerary
                                </Button>
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => {
                                    addToItinerary({
                                      type: 'restaurant',
                                      id: slot.restaurant_id,
                                      sessionId: slot.id,
                                      name: slot.restaurant_name,
                                      date: slot.date,
                                      time: slot.start_time.slice(0, 5),
                                      details: slot.meal_period,
                                    });
                                    bookRestaurantMutation.mutate({
                                      slotId: slot.id,
                                      numAdults: 2,
                                      numChildren: 0,
                                    });
                                  }}
                                  disabled={bookRestaurantMutation.isPending}
                                >
                                  Reserve now
                                </Button>
                              </>
                            ) : (
                              <Badge variant={itineraryItem?.status === 'booked' ? 'default' : 'secondary'} className="w-full justify-center py-2">
                                {itineraryItem?.status === 'booked' ? (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Reserved
                                  </>
                                ) : (
                                  <>
                                    <CalendarCheck className="h-4 w-4 mr-1" />
                                    In itinerary
                                  </>
                                )}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right column - Itinerary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Your Itinerary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {itinerary.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <CalendarCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>You haven't added anything yet.</p>
                    <p className="mt-1">Pick a few activities or dinners to create your plan.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-6">
                      {sortedDates.map(date => (
                        <div key={date} className="space-y-2">
                          <h4 className="font-semibold text-sm text-muted-foreground">
                            {format(parseISO(date), 'EEEE, MMM d')}
                          </h4>
                          <div className="space-y-2">
                            {groupedItinerary[date]
                              .sort((a, b) => a.time.localeCompare(b.time))
                              .map((item, idx) => (
                              <Card key={`${item.sessionId}-${idx}`} className="p-3">
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm truncate">{item.name}</p>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        <Clock className="h-3 w-3" />
                                        <span>{item.time}</span>
                                        <span>•</span>
                                        <span>{item.details}</span>
                                      </div>
                                    </div>
                                    {item.status === 'planned' && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 shrink-0"
                                        onClick={() => removeFromItinerary(item.sessionId)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                  {item.status === 'booked' ? (
                                    <Badge variant="default" className="text-xs">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Booked
                                    </Badge>
                                  ) : (
                                    <Button
                                      size="sm"
                                      className="w-full text-xs h-7"
                                      onClick={() => bookFromItinerary(item)}
                                      disabled={bookActivityMutation.isPending || bookRestaurantMutation.isPending}
                                    >
                                      {item.type === 'activity' ? 'Book this activity' : 'Reserve this table'}
                                    </Button>
                                  )}
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
