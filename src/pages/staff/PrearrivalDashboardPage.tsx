import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, parseISO, differenceInDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Card, CardContent } from '@/components/ui/card';
import { KpiGrid, KpiCard } from '@/components/ui/kpi-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Calendar, Users, CheckCircle2, Clock, AlertCircle, Plane, PartyPopper, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrearrivalProfile {
  id: string;
  prearrival_status: string;
  arrival_time: string | null;
  arrival_flight_number: string | null;
  special_occasions: any;
  special_requests: string | null;
}

interface PrearrivalGuest {
  id: string;
  full_name: string;
  room_number: string;
  check_in_date: string;
  check_out_date: string;
  loyalty_tier: string | null;
  is_vip: boolean;
  profile: PrearrivalProfile | null;
  activity_bookings_count: number;
  restaurant_bookings_count: number;
}

export default function PrearrivalDashboardPage() {
  const { currentResort } = useResort();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [daysFilter, setDaysFilter] = useState<string>('30');

  const { data: guests, isLoading } = useQuery({
    queryKey: ['prearrival-guests', currentResort?.id, daysFilter],
    queryFn: async () => {
      if (!currentResort?.id) return [];

      const today = new Date().toISOString().split('T')[0];
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + parseInt(daysFilter));
      const endDateStr = endDate.toISOString().split('T')[0];

      // Fetch guests arriving in the window
      const { data: guestsData, error: guestsError } = await supabase
        .from('guests')
        .select(`
          id, full_name, room_number, check_in_date, check_out_date, 
          loyalty_tier, is_vip
        `)
        .eq('resort_id', currentResort.id)
        .gt('check_in_date', today)
        .lte('check_in_date', endDateStr)
        .order('check_in_date', { ascending: true });

      if (guestsError) throw guestsError;

      // Fetch pre-arrival profiles for these guests
      const guestIds = guestsData.map(g => g.id);
      
      if (guestIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('prearrival_profiles')
        .select('*')
        .in('guest_id', guestIds);

      if (profilesError) throw profilesError;

      // Fetch booking counts
      const { data: activityBookings } = await supabase
        .from('activity_bookings')
        .select('guest_id')
        .in('guest_id', guestIds)
        .eq('booking_source', 'PRE_STAY')
        .in('status', ['CONFIRMED', 'PENDING']);

      const { data: restaurantBookings } = await supabase
        .from('restaurant_reservations')
        .select('guest_id')
        .in('guest_id', guestIds)
        .eq('booking_source', 'PRE_STAY')
        .in('status', ['CONFIRMED', 'PENDING']);

      // Map bookings count per guest
      const activityCounts: Record<string, number> = {};
      const restaurantCounts: Record<string, number> = {};
      
      activityBookings?.forEach(b => {
        activityCounts[b.guest_id] = (activityCounts[b.guest_id] || 0) + 1;
      });
      
      restaurantBookings?.forEach(b => {
        restaurantCounts[b.guest_id] = (restaurantCounts[b.guest_id] || 0) + 1;
      });

      // Combine data
      return guestsData.map(guest => {
        const profileData = profiles?.find(p => p.guest_id === guest.id);
        return {
          ...guest,
          profile: profileData ? {
            id: profileData.id,
            prearrival_status: profileData.prearrival_status,
            arrival_time: profileData.arrival_time,
            arrival_flight_number: profileData.arrival_flight_number,
            special_occasions: profileData.special_occasions,
            special_requests: profileData.special_requests,
          } : null,
          activity_bookings_count: activityCounts[guest.id] || 0,
          restaurant_bookings_count: restaurantCounts[guest.id] || 0,
        };
      }) as PrearrivalGuest[];
    },
    enabled: !!currentResort?.id,
  });

  // Filter guests
  const filteredGuests = guests?.filter(guest => {
    const matchesSearch = guest.full_name.toLowerCase().includes(search.toLowerCase()) ||
                          guest.room_number.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (statusFilter === 'all') return true;
    if (statusFilter === 'completed') return guest.profile?.prearrival_status === 'completed';
    if (statusFilter === 'partial') return guest.profile?.prearrival_status === 'partial';
    if (statusFilter === 'not_started') return !guest.profile || guest.profile.prearrival_status === 'not_started';
    if (statusFilter === 'special_occasion') {
      const occasions = guest.profile?.special_occasions;
      return Array.isArray(occasions) && occasions.length > 0;
    }
    
    return true;
  }) || [];

  // Stats
  const stats = {
    total: guests?.length || 0,
    completed: guests?.filter(g => g.profile?.prearrival_status === 'completed').length || 0,
    partial: guests?.filter(g => g.profile?.prearrival_status === 'partial').length || 0,
    notStarted: guests?.filter(g => !g.profile || g.profile.prearrival_status === 'not_started').length || 0,
    withBookings: guests?.filter(g => g.activity_bookings_count > 0 || g.restaurant_bookings_count > 0).length || 0,
    specialOccasions: guests?.filter(g => {
      const occasions = g.profile?.special_occasions;
      return Array.isArray(occasions) && occasions.length > 0;
    }).length || 0,
  };

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success/10 text-success border-success/20">Completed</Badge>;
      case 'partial':
        return <Badge className="bg-warning/10 text-warning border-warning/20">In Progress</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">Not Started</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pre-Arrival"
        description="Manage upcoming guest arrivals and their preferences"
        action={
          <Link to="/staff/settings/prearrival">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
        }
      />

      {/* Stats Cards */}
      <KpiGrid columns="grid-cols-2 md:grid-cols-3 lg:grid-cols-6" maxWidth="full" spacing="dense">
        <div onClick={() => setStatusFilter('all')} className="cursor-pointer">
          <KpiCard label="Arriving" value={stats.total} icon={Plane} variant="primary" />
        </div>
        <div onClick={() => setStatusFilter('completed')} className="cursor-pointer">
          <KpiCard label="Completed" value={stats.completed} icon={CheckCircle2} variant="success" />
        </div>
        <div onClick={() => setStatusFilter('partial')} className="cursor-pointer">
          <KpiCard label="In Progress" value={stats.partial} icon={Clock} variant="warning" />
        </div>
        <div onClick={() => setStatusFilter('not_started')} className="cursor-pointer">
          <KpiCard label="Not Started" value={stats.notStarted} icon={AlertCircle} />
        </div>
        <KpiCard label="Pre-Booked" value={stats.withBookings} icon={Calendar} />
        <div onClick={() => setStatusFilter('special_occasion')} className="cursor-pointer">
          <KpiCard label="Occasions" value={stats.specialOccasions} icon={PartyPopper} />
        </div>
      </KpiGrid>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="partial">In Progress</SelectItem>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="special_occasion">Special Occasions</SelectItem>
          </SelectContent>
        </Select>
        <Select value={daysFilter} onValueChange={setDaysFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Next 7 days</SelectItem>
            <SelectItem value="14">Next 14 days</SelectItem>
            <SelectItem value="30">Next 30 days</SelectItem>
            <SelectItem value="60">Next 60 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Guests Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredGuests.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Plane className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No upcoming arrivals found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Arrival</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Pre-Bookings</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGuests.map((guest) => {
                  const daysUntil = differenceInDays(parseISO(guest.check_in_date), new Date());
                  const specialOccasions = guest.profile?.special_occasions;
                  const hasSpecialOccasion = Array.isArray(specialOccasions) && specialOccasions.length > 0;
                  const totalBookings = guest.activity_bookings_count + guest.restaurant_bookings_count;

                  return (
                    <TableRow key={guest.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{guest.full_name}</span>
                              {guest.is_vip && (
                                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">VIP</Badge>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground">Room {guest.room_number}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{format(parseISO(guest.check_in_date), 'MMM d')}</div>
                          <div className={cn(
                            "text-xs",
                            daysUntil <= 3 ? "text-warning font-medium" : "text-muted-foreground"
                          )}>
                            In {daysUntil} day{daysUntil !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(guest.profile?.prearrival_status)}
                      </TableCell>
                      <TableCell className="text-center">
                        {totalBookings > 0 ? (
                          <Badge variant="secondary">{totalBookings}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {guest.profile?.arrival_flight_number && (
                            <Badge variant="outline" className="text-xs">
                              ✈ {guest.profile.arrival_flight_number}
                            </Badge>
                          )}
                          {hasSpecialOccasion && (
                            <Badge className="bg-pink-500/10 text-pink-600 border-pink-500/20 text-xs">
                              🎉 Occasion
                            </Badge>
                          )}
                          {guest.profile?.special_requests && (
                            <Badge variant="outline" className="text-xs">
                              📝 Requests
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link to={`/staff/guests/${guest.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
