import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Link } from 'react-router-dom';
import { Utensils, Users, Clock, AlertCircle, Search, Plus, Check, X, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function FnbHome() {
  const { currentResort } = useResort();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  // Fetch stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['fnb-stats', currentResort?.id, today],
    queryFn: async () => {
      if (!currentResort) return null;

      // Get all slots for today
      const { data: slots } = await supabase
        .from('restaurant_time_slots')
        .select('id, meal_period, capacity')
        .eq('resort_id', currentResort.id)
        .eq('date', today);

      if (!slots) return { totalCovers: 0, breakfastCovers: 0, lunchCovers: 0, dinnerCovers: 0, pendingRequests: 0 };

      const slotIds = slots.map(s => s.id);

      // Get all reservations for today
      const { data: reservations } = await supabase
        .from('restaurant_reservations')
        .select('restaurant_slot_id, num_adults, num_children, status, source')
        .in('restaurant_slot_id', slotIds);

      let totalCovers = 0;
      let breakfastCovers = 0;
      let lunchCovers = 0;
      let dinnerCovers = 0;
      let pendingRequests = 0;

      reservations?.forEach(r => {
        const pax = (r.num_adults || 0) + (r.num_children || 0);
        const slot = slots.find(s => s.id === r.restaurant_slot_id);

        if (r.status === 'CONFIRMED') {
          totalCovers += pax;
          if (slot?.meal_period === 'BREAKFAST') breakfastCovers += pax;
          if (slot?.meal_period === 'LUNCH') lunchCovers += pax;
          if (slot?.meal_period === 'DINNER') dinnerCovers += pax;
        }

        if (r.status === 'PENDING' && r.source === 'GUEST_PORTAL') {
          pendingRequests++;
        }
      });

      return {
        totalCovers,
        breakfastCovers,
        lunchCovers,
        dinnerCovers,
        pendingRequests,
      };
    },
    enabled: !!currentResort,
  });

  // Fetch slots
  const { data: slots, isLoading: loadingSlots } = useQuery({
    queryKey: ['fnb-slots', currentResort?.id, today],
    queryFn: async () => {
      if (!currentResort) return [];

      const { data: slotData } = await supabase
        .from('restaurant_time_slots')
        .select(`
          id,
          start_time,
          end_time,
          capacity,
          meal_period,
          status,
          restaurants!inner(name)
        `)
        .eq('resort_id', currentResort.id)
        .eq('date', today)
        .order('start_time', { ascending: true });

      if (!slotData) return [];

      const slotsWithCovers = await Promise.all(
        slotData.map(async (slot) => {
          const { data: reservations } = await supabase
            .from('restaurant_reservations')
            .select('num_adults, num_children')
            .eq('restaurant_slot_id', slot.id)
            .eq('status', 'CONFIRMED');

          const confirmedCovers = reservations?.reduce(
            (sum, r) => sum + (r.num_adults || 0) + (r.num_children || 0),
            0
          ) || 0;

          return {
            ...slot,
            confirmedCovers,
            occupancy: slot.capacity > 0 ? Math.round((confirmedCovers / slot.capacity) * 100) : 0,
          };
        })
      );

      return slotsWithCovers;
    },
    enabled: !!currentResort,
  });

  // Fetch pending requests
  const { data: pendingRequests, isLoading: loadingRequests } = useQuery({
    queryKey: ['fnb-pending-requests', currentResort?.id, today],
    queryFn: async () => {
      if (!currentResort) return [];

      const { data: slotIds } = await supabase
        .from('restaurant_time_slots')
        .select('id')
        .eq('resort_id', currentResort.id)
        .eq('date', today);

      if (!slotIds || slotIds.length === 0) return [];

      const ids = slotIds.map(s => s.id);
      const { data: requests } = await supabase
        .from('restaurant_reservations')
        .select(`
          id,
          num_adults,
          num_children,
          special_requests,
          guests!inner(full_name, room_number),
          restaurant_time_slots!inner(
            start_time,
            meal_period,
            restaurants!inner(name)
          )
        `)
        .in('restaurant_slot_id', ids)
        .eq('status', 'PENDING')
        .eq('source', 'GUEST_PORTAL')
        .order('created_at', { ascending: true });

      return requests || [];
    },
    enabled: !!currentResort,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      const { error } = await supabase
        .from('restaurant_reservations')
        .update({ status: 'CONFIRMED' })
        .eq('id', reservationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fnb-pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['fnb-stats'] });
      queryClient.invalidateQueries({ queryKey: ['fnb-slots'] });
      toast.success('Reservation approved');
    },
    onError: () => {
      toast.error('Failed to approve reservation');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      const { error } = await supabase
        .from('restaurant_reservations')
        .update({ status: 'CANCELLED' })
        .eq('id', reservationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fnb-pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['fnb-stats'] });
      toast.success('Reservation rejected');
    },
    onError: () => {
      toast.error('Failed to reject reservation');
    },
  });

  const getMealPeriodBadge = (period: string) => {
    const colors: Record<string, string> = {
      BREAKFAST: 'bg-warning/10 text-warning',
      LUNCH: 'bg-primary/10 text-primary',
      DINNER: 'bg-chart-3/10 text-chart-3',
      EVENT: 'bg-chart-4/10 text-chart-4',
    };
    return colors[period] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Restaurants – Today's Covers"
        description="Overview of bookings for today's service."
      />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/staff/restaurants/slots">
            <Plus className="mr-2 h-4 w-4" />
            Create Slot
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/staff/guests">
            <Search className="mr-2 h-4 w-4" />
            Search Guest
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/staff/restaurants/slots">
            <Plus className="mr-2 h-4 w-4" />
            Add Reservation
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Covers"
          value={isLoading ? '—' : stats?.totalCovers || 0}
          icon={Utensils}
          variant="primary"
        />
        <StatCard
          title="Breakfast"
          value={isLoading ? '—' : stats?.breakfastCovers || 0}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Lunch"
          value={isLoading ? '—' : stats?.lunchCovers || 0}
          icon={Clock}
        />
        <StatCard
          title="Dinner"
          value={isLoading ? '—' : stats?.dinnerCovers || 0}
          icon={Clock}
          variant="success"
        />
        <StatCard
          title="Pending Requests"
          value={isLoading ? '—' : stats?.pendingRequests || 0}
          icon={AlertCircle}
          variant={stats?.pendingRequests && stats.pendingRequests > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Slots Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg">Restaurant Time Slots</CardTitle>
              <CardDescription>{format(new Date(today), 'EEEE, MMMM d')}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/staff/restaurants/slots" className="text-primary">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loadingSlots ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : slots && slots.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Restaurant</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-center">Capacity</TableHead>
                    <TableHead className="text-center">Covers</TableHead>
                    <TableHead className="text-center">Occupancy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slots.map((slot: any) => (
                    <TableRow
                      key={slot.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => window.location.href = `/staff/restaurants/slots/${slot.id}`}
                    >
                      <TableCell className="font-medium">
                        {slot.start_time.slice(0, 5)}
                      </TableCell>
                      <TableCell>{slot.restaurants?.name}</TableCell>
                      <TableCell>
                        <Badge className={getMealPeriodBadge(slot.meal_period)}>
                          {slot.meal_period}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{slot.capacity}</TableCell>
                      <TableCell className="text-center">{slot.confirmedCovers}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={slot.occupancy >= 80 ? 'destructive' : slot.occupancy >= 50 ? 'default' : 'secondary'}>
                          {slot.occupancy}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Utensils className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No slots scheduled today</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Requests */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Reservation Requests
            </CardTitle>
            <CardDescription>Pending approvals for today</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRequests ? (
              <div className="space-y-3">
                {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : pendingRequests && pendingRequests.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-auto">
                {pendingRequests.map((request: any) => (
                  <div key={request.id} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{request.restaurant_time_slots?.restaurants?.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {request.restaurant_time_slots?.start_time.slice(0, 5)}
                          <Badge className={getMealPeriodBadge(request.restaurant_time_slots?.meal_period)} variant="outline">
                            {request.restaurant_time_slots?.meal_period}
                          </Badge>
                        </p>
                      </div>
                      <Badge variant="outline">
                        {request.num_adults + request.num_children} pax
                      </Badge>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">{request.guests?.full_name}</span>
                      <span className="text-muted-foreground"> • Room {request.guests?.room_number}</span>
                    </div>
                    {request.special_requests && (
                      <p className="text-xs text-muted-foreground italic">
                        "{request.special_requests}"
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => approveMutation.mutate(request.id)}
                        disabled={approveMutation.isPending}
                      >
                        <Check className="mr-1 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => rejectMutation.mutate(request.id)}
                        disabled={rejectMutation.isPending}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Check className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No pending requests</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
