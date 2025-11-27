import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Utensils, Clock, Users, ChevronRight, Calendar, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

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

  if (!guest) return null;

  const slotsByPeriod = slots?.reduce((acc: Record<string, any[]>, slot: any) => {
    if (!acc[slot.meal_period]) acc[slot.meal_period] = [];
    acc[slot.meal_period].push(slot);
    return acc;
  }, {}) || {};

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Restaurants</h1>
        <p className="text-sm text-muted-foreground">Reserve your dining experience</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-primary shrink-0" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={guest.checkInDate}
            max={guest.checkOutDate}
            className="flex-1"
          />
        </div>
        <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
          <SelectTrigger>
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
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : Object.keys(slotsByPeriod).length === 0 ? (
        <EmptyState icon={Utensils} title="No availability" description="Try a different date" />
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
                            {slot.requires_approval && (
                              <Badge variant="pending" className="text-xs">
                                <Sparkles className="h-3 w-3 mr-1" />Request
                              </Badge>
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
