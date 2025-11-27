import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Restaurant, RestaurantTimeSlot } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { StatusBadge } from '@/components/bookings/StatusBadge';
import { RestaurantSlotDialog } from './RestaurantSlotDialog';

interface SlotWithBookings extends RestaurantTimeSlot {
  restaurant?: Restaurant;
  bookedCovers: number;
}

export default function RestaurantSlotsPage() {
  const [slots, setSlots] = useState<SlotWithBookings[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [restaurantFilter, setRestaurantFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { currentResort } = useResort();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentResort) {
      fetchRestaurants();
    }
  }, [currentResort]);

  useEffect(() => {
    if (currentResort) {
      fetchSlots();
    }
  }, [currentResort, selectedDate, restaurantFilter, statusFilter]);

  const fetchRestaurants = async () => {
    if (!currentResort) return;
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .eq('resort_id', currentResort.id)
      .eq('is_active', true)
      .order('name');
    if (data) setRestaurants(data as Restaurant[]);
  };

  const fetchSlots = async () => {
    if (!currentResort) return;
    setLoading(true);

    let query = supabase
      .from('restaurant_time_slots')
      .select(`*, restaurant:restaurants(*)`)
      .eq('resort_id', currentResort.id)
      .eq('date', selectedDate)
      .order('start_time');

    if (restaurantFilter !== 'all') {
      query = query.eq('restaurant_id', restaurantFilter);
    }
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter as 'OPEN' | 'CLOSED' | 'FULL');
    }

    const { data: slotsData, error } = await query;

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      setLoading(false);
      return;
    }

    // Fetch reservation counts
    const slotIds = slotsData?.map(s => s.id) || [];
    const { data: reservationsData } = await supabase
      .from('restaurant_reservations')
      .select('restaurant_slot_id, num_adults, num_children')
      .in('restaurant_slot_id', slotIds)
      .eq('status', 'CONFIRMED');

    const slotsWithCovers = slotsData?.map(slot => {
      const slotReservations = reservationsData?.filter(r => r.restaurant_slot_id === slot.id) || [];
      const bookedCovers = slotReservations.reduce((sum, r) => sum + r.num_adults + r.num_children, 0);
      return { ...slot, bookedCovers };
    }) || [];

    setSlots(slotsWithCovers as SlotWithBookings[]);
    setLoading(false);
  };

  if (!currentResort) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Please select a resort first</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Restaurant Time Slots</h1>
          <p className="text-muted-foreground">Manage dining availability</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Slot
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-3">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
            />
            <Select value={restaurantFilter} onValueChange={setRestaurantFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All restaurants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All restaurants</SelectItem>
                {restaurants.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
                <SelectItem value="FULL">Full</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : slots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No time slots for this date</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Restaurant</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Meal Period</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Booked</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slots.map((slot) => {
                    const remaining = slot.capacity - slot.bookedCovers;
                    return (
                      <TableRow 
                        key={slot.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/restaurants/slots/${slot.id}`)}
                      >
                        <TableCell className="font-medium">{slot.restaurant?.name}</TableCell>
                        <TableCell>{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</TableCell>
                        <TableCell><Badge variant="outline">{slot.meal_period}</Badge></TableCell>
                        <TableCell>{slot.capacity}</TableCell>
                        <TableCell className="text-success font-medium">{slot.bookedCovers}</TableCell>
                        <TableCell className={remaining <= 0 ? 'text-destructive' : remaining <= 10 ? 'text-warning' : ''}>
                          {remaining}
                        </TableCell>
                        <TableCell><StatusBadge status={slot.status} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <RestaurantSlotDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        slot={null}
        resortId={currentResort.id}
        restaurants={restaurants}
        onSuccess={fetchSlots}
      />
    </div>
  );
}
