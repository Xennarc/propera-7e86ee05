import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Utensils, Clock, Users, ChevronRight, Sparkles, Phone, Info, CalendarX } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { GuestDatePicker } from '@/components/ui/guest-date-picker';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const MEAL_PERIOD_ORDER = ['BREAKFAST', 'LUNCH', 'DINNER', 'EVENT'];

export default function GuestRestaurantBrowser() {
  const { guest } = useGuestAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('all');

  const { data: restaurants } = useQuery({
    queryKey: ['guest-restaurants', guest?.resortId],
    queryFn: async () => {
      if (!guest) return [];
      const { data, error } = await supabase.rpc('guest_get_restaurants', { p_resort_id: guest.resortId });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!guest,
  });

  const { data: slots, isLoading } = useQuery({
    queryKey: ['guest-available-slots', guest?.guestId, selectedDate, selectedRestaurant],
    queryFn: async () => {
      if (!guest) return [];
      const { data, error } = await supabase.rpc('guest_get_available_slots', {
        p_guest_id: guest.guestId,
        p_date: selectedDate,
        p_restaurant_id: selectedRestaurant === 'all' ? null : selectedRestaurant,
      });
      if (error) throw error;
      return ((data as any[]) || []).sort((a, b) => {
        const periodDiff = MEAL_PERIOD_ORDER.indexOf(a.meal_period) - MEAL_PERIOD_ORDER.indexOf(b.meal_period);
        return periodDiff !== 0 ? periodDiff : a.start_time.localeCompare(b.start_time);
      });
    },
    enabled: !!guest,
  });

  // Check if there are any slots configured for the date (even if full)
  const { data: allSlotsForDate } = useQuery({
    queryKey: ['guest-all-slots-for-date', guest?.resortId, selectedDate, selectedRestaurant],
    queryFn: async () => {
      if (!guest) return [];
      // Query all slots for the date regardless of availability
      let query = supabase
        .from('restaurant_time_slots')
        .select('id, capacity, status, restaurant_id')
        .eq('resort_id', guest.resortId)
        .eq('date', selectedDate);
      
      if (selectedRestaurant !== 'all') {
        query = query.eq('restaurant_id', selectedRestaurant);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!guest,
  });

  if (!guest) return null;

  const slotsByPeriod = slots?.reduce((acc: Record<string, any[]>, slot: any) => {
    if (!acc[slot.meal_period]) acc[slot.meal_period] = [];
    acc[slot.meal_period].push(slot);
    return acc;
  }, {}) || {};

  // Determine empty state message
  const hasConfiguredSlots = allSlotsForDate && allSlotsForDate.length > 0;
  const hasAvailableSlots = Object.keys(slotsByPeriod).length > 0;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-foreground">Restaurants</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[250px]">
                <p>Restaurants appear when they have available time slots for the selected date.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-sm text-muted-foreground">Reserve your dining experience</p>
      </div>

      {/* Restaurant Filter */}
      <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
        <SelectTrigger className="h-12">
          <div className="flex items-center gap-2">
            <Utensils className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="All Restaurants" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Restaurants</SelectItem>
          {restaurants?.map((r: any) => (
            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date Picker with Month Navigation */}
      <GuestDatePicker
        value={selectedDate}
        onChange={setSelectedDate}
        minDate={guest.checkInDate}
        maxDate={guest.checkOutDate}
        hint="Select a date to see available dining times"
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <p className="text-sm text-center text-muted-foreground">Loading restaurants...</p>
        </div>
      ) : !hasAvailableSlots ? (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              {hasConfiguredSlots ? (
                <Users className="h-10 w-10 text-muted-foreground/50" />
              ) : (
                <CalendarX className="h-10 w-10 text-muted-foreground/50" />
              )}
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              {hasConfiguredSlots ? 'Fully booked for this date' : 'No reservations available'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">
              {hasConfiguredSlots 
                ? 'All dining times are fully booked for this date. Please try another day or contact Guest Services for assistance.'
                : 'This restaurant is not accepting reservations for this date. Please try selecting another day or contact your concierge.'}
            </p>
            <Button variant="outline" size="sm" className="gap-2">
              <Phone className="h-4 w-4" />
              Contact Concierge
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {MEAL_PERIOD_ORDER.filter(p => slotsByPeriod[p]).map((period) => (
            <div key={period}>
              <h2 className="font-semibold text-foreground mb-3">{period.charAt(0) + period.slice(1).toLowerCase()}</h2>
              <div className="space-y-3">
                {slotsByPeriod[period].map((slot: any) => (
                  <Card
                    key={slot.id}
                    className="hover:shadow-card-hover hover:border-primary/30 transition-all cursor-pointer"
                    onClick={() => navigate(`/guest/restaurants/book/${slot.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold">{slot.restaurant_name}</h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {slot.start_time?.slice(0, 5)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {slot.remaining_covers} available
                            </span>
                            {slot.requires_approval ? (
                              <Badge variant="pending" className="text-xs">
                                <Sparkles className="h-3 w-3 mr-1" />On request
                              </Badge>
                            ) : (
                              <Badge variant="confirmed" className="text-xs">Instant</Badge>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
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
