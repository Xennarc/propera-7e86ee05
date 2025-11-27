import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, addDays } from 'date-fns';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Utensils, Clock, Users, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const MEAL_PERIOD_ORDER = ['BREAKFAST', 'LUNCH', 'DINNER', 'EVENT'];

export default function GuestRestaurantBrowser() {
  const { guest } = useGuestAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('all');

  // Fetch restaurants
  const { data: restaurants } = useQuery({
    queryKey: ['guest-restaurants', guest?.resortId],
    queryFn: async () => {
      if (!guest) return [];
      const { data, error } = await supabase.rpc('guest_get_restaurants', {
        p_resort_id: guest.resortId,
      });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!guest,
  });

  // Fetch available slots
  const { data: slots, isLoading } = useQuery({
    queryKey: ['guest-available-slots', guest?.guestId, selectedDate, selectedRestaurant],
    queryFn: async () => {
      if (!guest) return [];
      const { data, error } = await supabase.rpc('guest_get_available_slots', {
        p_guest_id: guest.guestId,
        p_date: selectedDate || null,
        p_restaurant_id: selectedRestaurant === 'all' ? null : selectedRestaurant,
      });
      if (error) throw error;
      const slotsData = (data as any[]) || [];
      // Sort by meal period then time
      return slotsData.sort((a, b) => {
        const periodDiff = MEAL_PERIOD_ORDER.indexOf(a.meal_period) - MEAL_PERIOD_ORDER.indexOf(b.meal_period);
        if (periodDiff !== 0) return periodDiff;
        return a.start_time.localeCompare(b.start_time);
      });
    },
    enabled: !!guest,
  });

  if (!guest) return null;

  // Generate date options within guest stay
  const dateOptions: string[] = [];
  let currentDate = new Date(Math.max(
    new Date(guest.checkInDate).getTime(),
    new Date().getTime()
  ));
  const checkOutDate = new Date(guest.checkOutDate);
  while (currentDate <= checkOutDate) {
    dateOptions.push(currentDate.toISOString().split('T')[0]);
    currentDate = addDays(currentDate, 1);
  }

  // Group slots by meal period
  const slotsByPeriod = slots?.reduce((acc: Record<string, any[]>, slot: any) => {
    if (!acc[slot.meal_period]) acc[slot.meal_period] = [];
    acc[slot.meal_period].push(slot);
    return acc;
  }, {}) || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Restaurants</h1>
        <p className="text-muted-foreground">Reserve your dining experience</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateOptions.map((date) => (
                    <SelectItem key={date} value={date}>
                      {format(parseISO(date), 'EEE, MMM d')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Restaurant</Label>
              <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Restaurants</SelectItem>
                  {restaurants?.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slots by Meal Period */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : Object.keys(slotsByPeriod).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Utensils className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No available time slots for this date.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Try selecting a different date or restaurant.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {MEAL_PERIOD_ORDER.filter(period => slotsByPeriod[period]).map((period) => (
            <div key={period} className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">
                {period.charAt(0) + period.slice(1).toLowerCase()}
              </h2>
              <div className="space-y-3">
                {slotsByPeriod[period].map((slot: any) => (
                  <Card
                    key={slot.id}
                    className="hover:border-primary/50 transition-all cursor-pointer"
                    onClick={() => navigate(`/guest/restaurants/book/${slot.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <h3 className="font-semibold text-foreground">
                            {slot.restaurant_name}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {slot.remaining_covers} available
                            </span>
                          </div>
                          {slot.requires_approval && (
                            <Badge variant="warning" className="mt-1">Request Only</Badge>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
