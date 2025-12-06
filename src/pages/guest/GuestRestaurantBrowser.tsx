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
import { Utensils, Clock, Users, ChevronRight, Sparkles, Phone, Info, CalendarX, Coffee, Sun, Moon, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconRestaurants } from '@/components/icons/ProperaIcons';
import { Skeleton } from '@/components/ui/skeleton';
import { GuestDatePicker } from '@/components/ui/guest-date-picker';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const MEAL_PERIOD_ORDER = ['BREAKFAST', 'LUNCH', 'DINNER', 'EVENT'];

const MEAL_PERIOD_CONFIG: Record<string, { icon: typeof Coffee; label: string; colorClass: string; bgClass: string }> = {
  BREAKFAST: { icon: Coffee, label: 'Breakfast', colorClass: 'text-sunset', bgClass: 'bg-sunset/10' },
  LUNCH: { icon: Sun, label: 'Lunch', colorClass: 'text-lagoon', bgClass: 'bg-lagoon/10' },
  DINNER: { icon: Moon, label: 'Dinner', colorClass: 'text-orchid', bgClass: 'bg-orchid/10' },
  EVENT: { icon: PartyPopper, label: 'Event', colorClass: 'text-coral', bgClass: 'bg-coral/10' },
};

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

  // Check if there are any slots configured for the date (even if full or past cutoff)
  const { data: allSlotsForDate } = useQuery({
    queryKey: ['guest-all-slots-for-date', guest?.resortId, selectedDate, selectedRestaurant],
    queryFn: async () => {
      if (!guest) return [];
      // Query all slots for the date with restaurant info for cutoff calculation
      let query = supabase
        .from('restaurant_time_slots')
        .select(`
          id, 
          capacity, 
          status, 
          restaurant_id,
          start_time,
          restaurant:restaurants!inner(guest_cutoff_minutes)
        `)
        .eq('resort_id', guest.resortId)
        .eq('date', selectedDate)
        .eq('status', 'OPEN');
      
      if (selectedRestaurant !== 'all') {
        query = query.eq('restaurant_id', selectedRestaurant);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!guest,
  });

  // Determine if slots are past their booking cutoff
  const slotsArePastCutoff = (() => {
    if (!allSlotsForDate || allSlotsForDate.length === 0) return false;
    const now = new Date();
    
    return allSlotsForDate.every((slot: any) => {
      const slotDateTime = new Date(`${selectedDate}T${slot.start_time}`);
      const cutoffMinutes = slot.restaurant?.guest_cutoff_minutes || 30;
      const cutoffTime = new Date(slotDateTime.getTime() - cutoffMinutes * 60 * 1000);
      return now > cutoffTime;
    });
  })();

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
                slotsArePastCutoff ? (
                  <Clock className="h-10 w-10 text-muted-foreground/50" />
                ) : (
                  <Users className="h-10 w-10 text-muted-foreground/50" />
                )
              ) : (
                <CalendarX className="h-10 w-10 text-muted-foreground/50" />
              )}
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              {hasConfiguredSlots 
                ? slotsArePastCutoff 
                  ? 'Booking time has passed' 
                  : 'Fully booked for this date'
                : 'No reservations available'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">
              {hasConfiguredSlots 
                ? slotsArePastCutoff
                  ? "The booking deadline for today's dining times has passed. Please select a future date or contact Guest Services for walk-in availability."
                  : 'All dining times are fully booked for this date. Please try another day or contact Guest Services for assistance.'
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
          {MEAL_PERIOD_ORDER.filter(p => slotsByPeriod[p]).map((period) => {
            const periodConfig = MEAL_PERIOD_CONFIG[period] || MEAL_PERIOD_CONFIG.DINNER;
            const PeriodIcon = periodConfig.icon;
            
            return (
              <div key={period}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn("p-1.5 rounded-lg", periodConfig.bgClass)}>
                    <PeriodIcon className={cn("h-4 w-4", periodConfig.colorClass)} />
                  </div>
                  <h2 className={cn("font-semibold", periodConfig.colorClass)}>{periodConfig.label}</h2>
                </div>
                <div className="space-y-3">
                  {slotsByPeriod[period].map((slot: any) => {
                    const isLowAvailability = slot.remaining_covers > 0 && slot.remaining_covers <= 4;
                    
                    return (
                      <Card
                        key={slot.id}
                        className={cn(
                          "hover:shadow-card-hover transition-all cursor-pointer overflow-hidden",
                          `hover:border-${periodConfig.colorClass.replace('text-', '')}/30`
                        )}
                        onClick={() => navigate(`/guest/restaurants/book/${slot.id}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {/* Restaurant Icon with colored background */}
                            <div className={cn(
                              "flex h-12 w-12 items-center justify-center rounded-xl shrink-0",
                              periodConfig.bgClass
                            )}>
                              <IconRestaurants className={cn("h-6 w-6", periodConfig.colorClass)} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className={cn("font-mono font-semibold text-sm", periodConfig.colorClass)}>
                                  {slot.start_time?.slice(0, 5)}
                                </span>
                                {slot.requires_approval ? (
                                  <Badge variant="pending" className="text-xs">
                                    <Sparkles className="h-3 w-3 mr-1" />Request
                                  </Badge>
                                ) : (
                                  <Badge variant="confirmed" className="text-xs">Instant</Badge>
                                )}
                              </div>
                              <h3 className="font-semibold text-foreground mb-1 truncate">{slot.restaurant_name}</h3>
                              <div className="flex items-center justify-between">
                                <span className={cn(
                                  "flex items-center gap-1 text-sm",
                                  isLowAvailability ? 'text-coral font-medium' : 'text-muted-foreground'
                                )}>
                                  <Users className="h-3.5 w-3.5" />
                                  {slot.remaining_covers} {isLowAvailability ? 'left' : 'available'}
                                </span>
                                <ChevronRight className={cn("h-5 w-5", periodConfig.colorClass)} />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
