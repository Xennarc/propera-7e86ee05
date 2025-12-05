import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Restaurant, RestaurantTimeSlot, RestaurantRecurringRule, RestaurantClosure } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, Users, Utensils, TrendingUp, RepeatIcon, CalendarX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { StatusBadge } from '@/components/bookings/StatusBadge';
import { RestaurantSlotDialog } from './RestaurantSlotDialog';
import { RestaurantRecurringRuleDialog } from '@/components/recurring/RestaurantRecurringRuleDialog';
import { RecurringRulesList } from '@/components/recurring/RecurringRulesList';
import { ClosureDialog } from '@/components/closures/ClosureDialog';
import { ClosuresList } from '@/components/closures/ClosuresList';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { FilterBar, FilterBarGroup } from '@/components/ui/filter-bar';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingPage } from '@/components/ui/loading-spinner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SlotWithBookings extends RestaurantTimeSlot {
  restaurant?: Restaurant;
  bookedCovers: number;
}

export default function RestaurantSlotsPage() {
  const [slots, setSlots] = useState<SlotWithBookings[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [recurringRules, setRecurringRules] = useState<RestaurantRecurringRule[]>([]);
  const [closures, setClosures] = useState<RestaurantClosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [restaurantFilter, setRestaurantFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('OPEN');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [closureDialogOpen, setClosureDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RestaurantRecurringRule | null>(null);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [closuresOpen, setClosuresOpen] = useState(false);

  const { currentResort } = useResort();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Get selected restaurant for recurring dialog
  const selectedRestaurantForRecurring = restaurantFilter !== 'all' 
    ? restaurants.find(r => r.id === restaurantFilter) 
    : restaurants[0];

  useEffect(() => {
    if (currentResort) {
      fetchRestaurants();
    }
  }, [currentResort]);

  useEffect(() => {
    if (currentResort) {
      fetchSlots();
      fetchRecurringRules();
      fetchClosures();
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

  const fetchRecurringRules = async () => {
    if (!currentResort) return;
    let query = supabase
      .from('restaurant_recurring_rules')
      .select('*, restaurant:restaurants(*)')
      .eq('resort_id', currentResort.id)
      .order('created_at', { ascending: false });
    
    if (restaurantFilter !== 'all') {
      query = query.eq('restaurant_id', restaurantFilter);
    }
    
    const { data } = await query;
    if (data) setRecurringRules(data as RestaurantRecurringRule[]);
  };

  const fetchClosures = async () => {
    if (!currentResort) return;
    let query = supabase
      .from('restaurant_closures')
      .select('*, restaurant:restaurants(*)')
      .eq('resort_id', currentResort.id)
      .order('closure_date', { ascending: true });
    
    if (restaurantFilter !== 'all') {
      query = query.eq('restaurant_id', restaurantFilter);
    }
    
    const { data } = await query;
    if (data) setClosures(data as RestaurantClosure[]);
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

  // Calculate stats
  const stats = useMemo(() => {
    const totalCovers = slots.reduce((sum, s) => sum + s.bookedCovers, 0);
    const openSlots = slots.filter(s => s.status === 'OPEN').length;
    const totalCapacity = slots.reduce((sum, s) => sum + s.capacity, 0);
    const avgCovers = slots.length > 0 ? Math.round(totalCovers / slots.length) : 0;
    return { totalCovers, openSlots, avgCovers };
  }, [slots]);

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
      <PageHeader
        title="Restaurant Time Slots"
        description="Manage dining availability"
        action={
          <Button onClick={() => navigate('/staff/restaurants/slots/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Slot
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Covers"
          value={stats.totalCovers}
          icon={Users}
          variant="success"
          description={format(parseISO(selectedDate), 'MMMM d, yyyy')}
        />
        <StatCard
          title="Open Slots"
          value={stats.openSlots}
          icon={Clock}
          variant="primary"
        />
        <StatCard
          title="Avg. Covers/Slot"
          value={stats.avgCovers}
          icon={TrendingUp}
          variant="default"
        />
      </div>

      {/* Filters and Table */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border/50">
            <FilterBar>
              <FilterBarGroup>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-40 bg-background"
                />
              </FilterBarGroup>
              <FilterBarGroup>
                <Select value={restaurantFilter} onValueChange={setRestaurantFilter}>
                  <SelectTrigger className="w-44 bg-background">
                    <SelectValue placeholder="All restaurants" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Restaurants</SelectItem>
                    {restaurants.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36 bg-background">
                    <SelectValue placeholder="Open" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="FULL">Full</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                    <SelectItem value="all">All Statuses</SelectItem>
                  </SelectContent>
                </Select>
              </FilterBarGroup>
            </FilterBar>
          </div>

          {loading ? (
            <LoadingPage />
          ) : slots.length === 0 ? (
            <EmptyState
              icon={Utensils}
              title="No time slots"
              description={restaurants.length === 0 
                ? "You need to create restaurants first before adding time slots."
                : "No time slots found for this date. Create slots to make restaurants available for reservations."}
              action={
                restaurants.length === 0 ? (
                  <Button variant="outline" onClick={() => window.location.href = '/staff/restaurants'}>
                    Go to Restaurants
                  </Button>
                ) : (
                <Button onClick={() => navigate('/staff/restaurants/slots/new')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Slot
                  </Button>
                )
              }
            />
          ) : (
            <DataTable
              data={slots}
              onRowClick={(slot) => navigate(`/restaurants/slots/${slot.id}`)}
              columns={[
                {
                  header: 'Restaurant',
                  accessor: (slot) => (
                    <span className="font-medium">{slot.restaurant?.name}</span>
                  ),
                },
                {
                  header: 'Time',
                  accessor: (slot) => (
                    <span className="text-muted-foreground">
                      {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                    </span>
                  ),
                },
                {
                  header: 'Meal Period',
                  accessor: (slot) => (
                    <Badge variant="outline">{slot.meal_period}</Badge>
                  ),
                },
                {
                  header: 'Capacity',
                  accessor: (slot) => slot.capacity,
                },
                {
                  header: 'Booked',
                  accessor: (slot) => (
                    <span className="text-success font-medium">{slot.bookedCovers}</span>
                  ),
                },
                {
                  header: 'Remaining',
                  accessor: (slot) => {
                    const remaining = slot.capacity - slot.bookedCovers;
                    return (
                      <span className={
                        remaining <= 0 ? 'text-destructive font-medium' : 
                        remaining <= 10 ? 'text-warning font-medium' : ''
                      }>
                        {remaining}
                      </span>
                    );
                  },
                },
                {
                  header: 'Status',
                  accessor: (slot) => <StatusBadge status={slot.status} />,
                },
              ]}
            />
          )}
        </CardContent>
      </Card>

      {/* Recurring Schedules */}
      {restaurants.length > 0 && (
        <Collapsible open={recurringOpen} onOpenChange={setRecurringOpen}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                    <CardTitle className="text-base flex items-center gap-2">
                      <RepeatIcon className="h-4 w-4" />
                      Recurring Schedules
                      <span className="text-muted-foreground font-normal">({recurringRules.length})</span>
                    </CardTitle>
                  </Button>
                </CollapsibleTrigger>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingRule(null);
                    setRecurringDialogOpen(true);
                  }}
                  disabled={!selectedRestaurantForRecurring}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Schedule
                </Button>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <RecurringRulesList
                  rules={recurringRules}
                  type="restaurant"
                  onEdit={(rule) => {
                    setEditingRule(rule as RestaurantRecurringRule);
                    setRecurringDialogOpen(true);
                  }}
                  onRefresh={fetchRecurringRules}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Closures */}
      {restaurants.length > 0 && (
        <Collapsible open={closuresOpen} onOpenChange={setClosuresOpen}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarX className="h-4 w-4" />
                      Closure Dates
                      <span className="text-muted-foreground font-normal">({closures.length})</span>
                    </CardTitle>
                  </Button>
                </CollapsibleTrigger>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setClosureDialogOpen(true)}
                  disabled={!selectedRestaurantForRecurring}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Closure
                </Button>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <ClosuresList
                  closures={closures}
                  type="restaurant"
                  onRefresh={fetchClosures}
                  showEntityName={restaurantFilter === 'all'}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      <RestaurantSlotDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        slot={null}
        resortId={currentResort.id}
        restaurants={restaurants}
        onSuccess={fetchSlots}
      />

      {selectedRestaurantForRecurring && (
        <>
          <RestaurantRecurringRuleDialog
            open={recurringDialogOpen}
            onOpenChange={setRecurringDialogOpen}
            rule={editingRule}
            restaurant={selectedRestaurantForRecurring}
            resortId={currentResort.id}
            onSuccess={() => {
              fetchRecurringRules();
              fetchSlots();
            }}
          />
          <ClosureDialog
            open={closureDialogOpen}
            onOpenChange={setClosureDialogOpen}
            type="restaurant"
            entityId={selectedRestaurantForRecurring.id}
            entityName={selectedRestaurantForRecurring.name}
            resortId={currentResort.id}
            onSuccess={fetchClosures}
          />
        </>
      )}
    </div>
  );
}
