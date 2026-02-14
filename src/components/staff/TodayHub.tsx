import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { format, addDays, isToday, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiGrid, KpiCard } from '@/components/ui/kpi-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { SmartFAB } from '@/components/staff/dashboard';
import { DriverModeCard } from '@/components/staff/DriverModeCard';
import {
  Calendar,
  Users,
  UtensilsCrossed,
  Activity,
  Plane,
  Clock,
  ArrowRight,
  AlertCircle,
  TrendingUp,
  Plus,
  Eye,
  ChevronRight,
  Sparkles,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
} from 'lucide-react';

interface TodayHubProps {
  className?: string;
}

export function TodayHub({ className }: TodayHubProps) {
  const { currentResort } = useResort();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'guests' | 'activities' | 'dining'>('all');

  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  // Fetch arrivals/departures
  const { data: guestStats, isLoading: loadingGuests } = useQuery({
    queryKey: ['today-guests', currentResort?.id, today],
    queryFn: async () => {
      if (!currentResort) return null;

      const [arrivalsRes, departuresRes, inHouseRes] = await Promise.all([
        supabase
          .from('guests')
          .select('id, full_name, room_number, is_vip')
          .eq('resort_id', currentResort.id)
          .eq('check_in_date', today)
          .limit(10),
        supabase
          .from('guests')
          .select('id, full_name, room_number')
          .eq('resort_id', currentResort.id)
          .eq('check_out_date', today)
          .limit(10),
        supabase
          .from('guests')
          .select('id', { count: 'exact' })
          .eq('resort_id', currentResort.id)
          .lte('check_in_date', today)
          .gte('check_out_date', today),
      ]);

      return {
        arrivals: arrivalsRes.data || [],
        departures: departuresRes.data || [],
        inHouseCount: inHouseRes.count || 0,
        arrivalsCount: arrivalsRes.data?.length || 0,
        departuresCount: departuresRes.data?.length || 0,
      };
    },
    enabled: !!currentResort,
  });

  // Fetch today's sessions
  const { data: sessionStats, isLoading: loadingSessions } = useQuery({
    queryKey: ['today-sessions', currentResort?.id, today],
    queryFn: async () => {
      if (!currentResort) return null;

      const { data: sessions, error } = await supabase
        .from('activity_sessions')
        .select(`
          id, date, start_time, end_time, capacity, status,
          activity:activities(name, icon_key),
          bookings:activity_bookings(num_adults, num_children, status)
        `)
        .eq('resort_id', currentResort.id)
        .eq('date', today)
        .eq('status', 'SCHEDULED')
        .order('start_time')
        .limit(8);

      if (error) throw error;

      const mapped = (sessions || []).map(session => {
        const confirmedPax = session.bookings
          ?.filter((b: any) => b.status === 'CONFIRMED')
          .reduce((sum: number, b: any) => sum + b.num_adults + b.num_children, 0) || 0;
        return {
          ...session,
          confirmedPax,
          activityName: session.activity?.name || 'Activity',
        };
      });

      return {
        sessions: mapped,
        totalSessions: mapped.length,
        totalPax: mapped.reduce((sum, s) => sum + s.confirmedPax, 0),
      };
    },
    enabled: !!currentResort,
  });

  // Fetch today's dining slots
  const { data: diningStats, isLoading: loadingDining } = useQuery({
    queryKey: ['today-dining', currentResort?.id, today],
    queryFn: async () => {
      if (!currentResort) return null;

      const { data: slots, error } = await supabase
        .from('restaurant_time_slots')
        .select(`
          id, date, start_time, end_time, capacity, meal_period, status,
          restaurant:restaurants(name),
          reservations:restaurant_reservations(num_adults, num_children, status)
        `)
        .eq('resort_id', currentResort.id)
        .eq('date', today)
        .eq('status', 'OPEN')
        .order('start_time')
        .limit(8);

      if (error) throw error;

      const mapped = (slots || []).map(slot => {
        const confirmedCovers = slot.reservations
          ?.filter((r: any) => r.status === 'CONFIRMED')
          .reduce((sum: number, r: any) => sum + r.num_adults + r.num_children, 0) || 0;
        return {
          ...slot,
          confirmedCovers,
          restaurantName: slot.restaurant?.name || 'Restaurant',
        };
      });

      return {
        slots: mapped,
        totalSlots: mapped.length,
        totalCovers: mapped.reduce((sum, s) => sum + s.confirmedCovers, 0),
      };
    },
    enabled: !!currentResort,
  });

  // Fetch guest requests
  const { data: requests, isLoading: loadingRequests } = useQuery({
    queryKey: ['today-requests', currentResort?.id],
    queryFn: async () => {
      if (!currentResort) return [];

      const { data, error } = await supabase
        .from('guest_requests')
        .select('id, special_request_text, status, guest:guests(full_name, room_number)')
        .eq('resort_id', currentResort.id)
        .in('status', ['OPEN', 'IN_PROGRESS'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentResort,
  });

  if (!currentResort) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Select a resort to view today's operations.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Driver Mode Card - Only shown to registered drivers */}
      <DriverModeCard />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Today at {currentResort?.name ?? 'Resort'}
        </h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/staff/today">
              <Sparkles className="h-4 w-4 mr-2" />
              Opportunities
            </Link>
          </Button>
          <Button asChild>
            <Link to="/staff/activities/sessions/new">
              <Plus className="h-4 w-4 mr-2" />
              New Session
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <KpiGrid columns="grid-cols-2 lg:grid-cols-4" maxWidth="full" spacing="dense">
        <KpiCard label="In-House" value={guestStats?.inHouseCount ?? 0} icon={Users} loading={loadingGuests} />
        <KpiCard label="Arrivals" value={guestStats?.arrivalsCount ?? 0} icon={ArrowUpRight} variant="success" loading={loadingGuests} />
        <KpiCard label="Sessions" value={sessionStats?.totalSessions ?? 0} icon={Activity} variant="primary" loading={loadingSessions} helperText={`${sessionStats?.totalPax ?? 0} pax`} />
        <KpiCard label="Covers" value={diningStats?.totalCovers ?? 0} icon={UtensilsCrossed} variant="warning" loading={loadingDining} helperText={`${diningStats?.totalSlots ?? 0} slots`} />
      </KpiGrid>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="guests">Guests</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="dining">Dining</TabsTrigger>
        </TabsList>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Column 1: Arrivals & Requests */}
          {(activeTab === 'all' || activeTab === 'guests') && (
            <div className="space-y-6">
              {/* Arrivals */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Plane className="h-4 w-4 text-success" />
                      Arrivals Today
                    </CardTitle>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/staff/guests?filter=arrivals">
                        View all <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {loadingGuests ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
                    </div>
                  ) : guestStats?.arrivals && guestStats.arrivals.length > 0 ? (
                    <div className="space-y-2">
                      {guestStats.arrivals.map((guest: any) => (
                        <Link
                          key={guest.id}
                          to={`/staff/guests/${guest.id}`}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success text-xs font-bold shrink-0">
                              {guest.room_number}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{guest.full_name}</p>
                              {guest.is_vip && (
                                <Badge variant="default" className="text-2xs mt-0.5">VIP</Badge>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No arrivals today</p>
                  )}
                </CardContent>
              </Card>

              {/* Guest Requests */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-warning" />
                      Open Requests
                      {requests && requests.length > 0 && (
                        <Badge variant="warning" className="text-2xs">{requests.length}</Badge>
                      )}
                    </CardTitle>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/staff/requests-dashboard">
                        View all <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {loadingRequests ? (
                    <div className="space-y-2">
                      {[1, 2].map(i => <Skeleton key={i} className="h-12" />)}
                    </div>
                  ) : requests && requests.length > 0 ? (
                    <div className="space-y-2">
                      {requests.map((req: any) => (
                        <Link
                          key={req.id}
                          to="/staff/requests-dashboard"
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{req.guest?.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{req.special_request_text}</p>
                          </div>
                          <Badge variant={req.status === 'OPEN' ? 'warning' : 'secondary'} className="text-2xs shrink-0 ml-2">
                            {req.status}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No open requests</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Column 2: Activities */}
          {(activeTab === 'all' || activeTab === 'activities') && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Today's Sessions
                  </CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/staff/activities/sessions">
                      View all <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {loadingSessions ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14" />)}
                  </div>
                ) : sessionStats?.sessions && sessionStats.sessions.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2 pr-2">
                      {sessionStats.sessions.map((session: any) => (
                        <Link
                          key={session.id}
                          to={`/staff/activities/sessions/${session.id}`}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{session.activityName}</p>
                            <p className="text-xs text-muted-foreground">
                              {session.start_time.slice(0, 5)} – {session.end_time.slice(0, 5)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant={session.confirmedPax >= session.capacity * 0.8 ? 'success' : 'secondary'} className="text-2xs">
                              {session.confirmedPax}/{session.capacity}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="py-8 text-center">
                    <Calendar className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">No sessions scheduled</p>
                    <Button variant="link" size="sm" asChild className="mt-2">
                      <Link to="/staff/activities/sessions/new">Create session</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Column 3: Dining */}
          {(activeTab === 'all' || activeTab === 'dining') && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UtensilsCrossed className="h-4 w-4 text-sunset" />
                    Dining Today
                  </CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/staff/restaurants/slots">
                      View all <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {loadingDining ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14" />)}
                  </div>
                ) : diningStats?.slots && diningStats.slots.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2 pr-2">
                      {diningStats.slots.map((slot: any) => (
                        <Link
                          key={slot.id}
                          to={`/staff/restaurants/slots/${slot.id}`}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{slot.restaurantName}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{slot.meal_period}</span>
                              <span>•</span>
                              <span>{slot.start_time.slice(0, 5)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant={slot.confirmedCovers >= slot.capacity * 0.7 ? 'success' : 'secondary'} className="text-2xs">
                              {slot.confirmedCovers}/{slot.capacity}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="py-8 text-center">
                    <UtensilsCrossed className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">No dining slots today</p>
                    <Button variant="link" size="sm" asChild className="mt-2">
                      <Link to="/staff/restaurants/slots/new">Create slot</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </Tabs>

      {/* Quick Actions */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Quick actions:</span>
            <Button variant="outline" size="sm" asChild>
              <Link to="/staff/activities/sessions/new">
                <Plus className="h-4 w-4 mr-1" />
                New Session
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/staff/restaurants/slots/new">
                <Plus className="h-4 w-4 mr-1" />
                New Slot
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/staff/prearrival">
                <Plane className="h-4 w-4 mr-1" />
                Pre-Arrivals
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Smart FAB for quick actions (mobile only) */}
      <SmartFAB />
    </div>
  );
}

// Quick Stat Card Component
interface QuickStatCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  variant?: 'default' | 'primary' | 'success' | 'warning';
  subtitle?: string;
}

function QuickStatCard({ title, value, icon: Icon, loading, variant = 'default', subtitle }: QuickStatCardProps) {
  const variantStyles = {
    default: 'bg-card',
    primary: 'bg-primary/5 border-primary/20',
    success: 'bg-success/5 border-success/20',
    warning: 'bg-warning/5 border-warning/20',
  };

  const iconStyles = {
    default: 'text-muted-foreground',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
  };

  return (
    <Card className={cn('transition-colors', variantStyles[variant])}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{value}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
            {subtitle && <p className="text-2xs text-muted-foreground/70">{subtitle}</p>}
          </div>
          <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center bg-background/50', iconStyles[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TodayHub;
