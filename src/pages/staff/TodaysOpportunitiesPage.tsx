import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  Utensils, 
  Eye,
  AlertCircle,
  Sparkles,
  Clock
} from 'lucide-react';

export default function TodaysOpportunitiesPage() {
  const { currentResort } = useResort();
  const [selectedDay, setSelectedDay] = useState<'today' | 'tomorrow'>('today');
  
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const targetDate = selectedDay === 'today' ? today : tomorrow;
  const targetDateStr = format(targetDate, 'yyyy-MM-dd');

  // Fetch low-occupancy activity sessions
  const { data: lowOccupancySessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['low-occupancy-sessions', currentResort?.id, targetDateStr],
    queryFn: async () => {
      if (!currentResort) return [];
      
      const { data: sessions, error } = await supabase
        .from('activity_sessions')
        .select(`
          *,
          activity:activities(name, default_max_capacity),
          bookings:activity_bookings(num_adults, num_children, status)
        `)
        .eq('resort_id', currentResort.id)
        .eq('date', targetDateStr)
        .eq('status', 'SCHEDULED')
        .gte('start_time', selectedDay === 'today' ? format(new Date(), 'HH:mm:ss') : '00:00:00');
      
      if (error) throw error;
      
      // Map sessions and calculate occupancy
      const mappedSessions = (sessions || []).map(session => {
        const confirmedPax = session.bookings
          ?.filter((b: any) => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
          .reduce((sum: number, b: any) => sum + b.num_adults + b.num_children, 0) || 0;
        const capacity = session.capacity || session.activity?.default_max_capacity || 10;
        const occupancy = capacity > 0 ? confirmedPax / capacity : 1;
        
        return {
          ...session,
          confirmedPax,
          capacity,
          occupancy,
          activityName: session.activity?.name || 'Unknown Activity'
        };
      });
      
      // Deduplicate by session.id (in case of any duplicate records)
      const uniqueSessions = mappedSessions.filter((session, index, self) => 
        index === self.findIndex(s => s.id === session.id)
      );
      
      return uniqueSessions.filter(s => s.occupancy < 0.4);
    },
    enabled: !!currentResort
  });

  // Fetch low-occupancy restaurant slots
  const { data: lowOccupancySlots, isLoading: loadingSlots } = useQuery({
    queryKey: ['low-occupancy-slots', currentResort?.id, targetDateStr],
    queryFn: async () => {
      if (!currentResort) return [];
      
      const { data: slots, error } = await supabase
        .from('restaurant_time_slots')
        .select(`
          *,
          restaurant:restaurants(name),
          reservations:restaurant_reservations(num_adults, num_children, status)
        `)
        .eq('resort_id', currentResort.id)
        .eq('date', targetDateStr)
        .eq('status', 'OPEN')
        .gte('start_time', selectedDay === 'today' ? format(new Date(), 'HH:mm:ss') : '00:00:00');
      
      if (error) throw error;
      
      // Map slots and calculate occupancy
      const mappedSlots = (slots || []).map(slot => {
        const confirmedCovers = slot.reservations
          ?.filter((r: any) => r.status === 'CONFIRMED' || r.status === 'COMPLETED')
          .reduce((sum: number, r: any) => sum + r.num_adults + r.num_children, 0) || 0;
        const capacity = slot.capacity || 50;
        const occupancy = capacity > 0 ? confirmedCovers / capacity : 1;
        
        return {
          ...slot,
          confirmedCovers,
          capacity,
          occupancy,
          restaurantName: slot.restaurant?.name || 'Unknown Restaurant'
        };
      });
      
      // Deduplicate by slot.id (in case of any duplicate records)
      const uniqueSlots = mappedSlots.filter((slot, index, self) => 
        index === self.findIndex(s => s.id === slot.id)
      );
      
      return uniqueSlots.filter(s => s.occupancy < 0.5);
    },
    enabled: !!currentResort
  });

  // Fetch in-house guests with no/few bookings
  const { data: guestsWithNoPlans, isLoading: loadingGuests } = useQuery({
    queryKey: ['guests-no-plans', currentResort?.id],
    queryFn: async () => {
      if (!currentResort) return [];
      
      const todayStr = format(today, 'yyyy-MM-dd');
      
      // Get in-house guests
      const { data: guests, error } = await supabase
        .from('guests')
        .select('*')
        .eq('resort_id', currentResort.id)
        .lte('check_in_date', todayStr)
        .gte('check_out_date', todayStr);
      
      if (error) throw error;
      if (!guests) return [];
      
      // Get booking counts for each guest
      const guestIds = guests.map(g => g.id);
      
      const [{ data: activityBookings }, { data: restaurantReservations }] = await Promise.all([
        supabase
          .from('activity_bookings')
          .select('guest_id, session:activity_sessions(date)')
          .in('guest_id', guestIds)
          .in('status', ['CONFIRMED', 'PENDING'])
          .gte('session.date', todayStr),
        supabase
          .from('restaurant_reservations')
          .select('guest_id, slot:restaurant_time_slots(date)')
          .in('guest_id', guestIds)
          .in('status', ['CONFIRMED', 'PENDING'])
          .gte('slot.date', todayStr)
      ]);
      
      const bookingCounts: Record<string, number> = {};
      activityBookings?.forEach(b => {
        if (b.session) bookingCounts[b.guest_id] = (bookingCounts[b.guest_id] || 0) + 1;
      });
      restaurantReservations?.forEach(r => {
        if (r.slot) bookingCounts[r.guest_id] = (bookingCounts[r.guest_id] || 0) + 1;
      });
      
      return guests
        .map(g => ({
          ...g,
          upcomingBookings: bookingCounts[g.id] || 0
        }))
        .filter(g => g.upcomingBookings <= 1)
        .sort((a, b) => a.upcomingBookings - b.upcomingBookings)
        .slice(0, 15);
    },
    enabled: !!currentResort
  });

  if (!currentResort) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Please select a resort to view opportunities.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getOccupancyColor = (occupancy: number) => {
    if (occupancy < 0.2) return 'text-destructive';
    if (occupancy < 0.4) return 'text-orange-500';
    return 'text-muted-foreground';
  };

  const getTimeLabel = (time: string, date: string) => {
    const hour = parseInt(time.split(':')[0]);
    const isToday = date === format(today, 'yyyy-MM-dd');
    
    if (isToday) {
      if (hour < 12) return 'This morning';
      if (hour < 17) return 'This afternoon';
      return 'This evening';
    }
    if (hour < 12) return 'Tomorrow morning';
    if (hour < 17) return 'Tomorrow afternoon';
    return 'Tomorrow evening';
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Today's Opportunities"
          description="Quick snapshot of where you can add more bookings."
        />
        
        <Tabs value={selectedDay} onValueChange={(v) => setSelectedDay(v as 'today' | 'tomorrow')}>
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="tomorrow">Tomorrow</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <p className="text-sm text-foreground/80">
            Use these suggestions to guide upsell conversations at check-in, during meals, or at the front desk.
          </p>
        </CardContent>
      </Card>

      {/* Section 1: Fill these activities */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle>Fill these activities</CardTitle>
          </div>
          <CardDescription>
            Low-occupancy sessions that could use more guests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSessions ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : lowOccupancySessions && lowOccupancySessions.length > 0 ? (
            <div className="space-y-3">
              {lowOccupancySessions.map((session) => (
                <div 
                  key={session.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{session.activityName}</h4>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {getTimeLabel(session.start_time, session.date)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {session.start_time.slice(0, 5)}
                      </span>
                      <span className={`flex items-center gap-1 font-medium ${getOccupancyColor(session.occupancy)}`}>
                        <Users className="h-3.5 w-3.5" />
                        {session.confirmedPax} / {session.capacity} guests
                        <span className="text-xs">({Math.round(session.occupancy * 100)}%)</span>
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/staff/activities/sessions/${session.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <TrendingUp className="h-10 w-10 mx-auto text-green-500 mb-3" />
              <p className="text-muted-foreground">No under-filled activities for {selectedDay}. Great job!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Fill these time slots */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Utensils className="h-5 w-5 text-primary" />
            <CardTitle>Fill these time slots</CardTitle>
          </div>
          <CardDescription>
            Restaurant slots with availability
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSlots ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : lowOccupancySlots && lowOccupancySlots.length > 0 ? (
            <div className="space-y-3">
              {lowOccupancySlots.map((slot) => (
                <div 
                  key={slot.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{slot.restaurantName}</h4>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {slot.meal_period}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                      </span>
                      <span className={`flex items-center gap-1 font-medium ${getOccupancyColor(slot.occupancy)}`}>
                        <Users className="h-3.5 w-3.5" />
                        {slot.confirmedCovers} / {slot.capacity} covers
                        <span className="text-xs">({Math.round(slot.occupancy * 100)}%)</span>
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/staff/restaurants/slots/${slot.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <TrendingUp className="h-10 w-10 mx-auto text-green-500 mb-3" />
              <p className="text-muted-foreground">No under-filled dining slots for {selectedDay}.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Guests with no plans */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>Guests with no plans</CardTitle>
          </div>
          <CardDescription>
            In-house guests with few or no upcoming bookings — great candidates for upsell conversations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingGuests ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : guestsWithNoPlans && guestsWithNoPlans.length > 0 ? (
            <div className="space-y-3">
              {guestsWithNoPlans.map((guest) => (
                <div 
                  key={guest.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{guest.full_name}</h4>
                      {guest.is_vip && (
                        <Badge variant="default" className="text-xs">VIP</Badge>
                      )}
                      {guest.upcomingBookings === 0 && (
                        <Badge variant="destructive" className="text-xs">No bookings</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Room {guest.room_number}</span>
                      <span>
                        {format(new Date(guest.check_in_date), 'MMM d')} – {format(new Date(guest.check_out_date), 'MMM d')}
                      </span>
                      {guest.nationality && <span>{guest.nationality}</span>}
                      <span className="text-xs">
                        {guest.upcomingBookings} upcoming booking{guest.upcomingBookings !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/staff/guests/${guest.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Link>
                  </Button>
                </div>
              ))}
              {guestsWithNoPlans.length >= 15 && (
                <div className="text-center pt-2">
                  <Button variant="link" asChild>
                    <Link to="/staff/guests">View all guests →</Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center">
              <TrendingUp className="h-10 w-10 mx-auto text-green-500 mb-3" />
              <p className="text-muted-foreground">All in-house guests have bookings. Excellent!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
