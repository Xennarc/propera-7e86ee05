import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, UserMinus, Calendar, Utensils, Star, 
  MessageSquare, Palette, X, ChevronRight, ChevronDown, Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { OnboardingBanner } from '@/components/onboarding/OnboardingBanner';
import { useState, useEffect } from 'react';
import {
  DashboardHeader,
  PriorityCard,
  PriorityCardGrid,
  OperationsSection,
  OperationsListItem,
  NeedsAttentionCard,
  SmartFAB,
  HorizontalCardCarousel,
  SessionCard,
  SlotCard,
} from '@/components/staff/dashboard';

export default function ResortAdminHome() {
  const { currentResort } = useResort();
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const [showWelcome, setShowWelcome] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Check if this is a new resort needing branding setup
  useEffect(() => {
    if (currentResort?.onboarding_status === 'NOT_STARTED' && !dismissed) {
      const dismissedKey = `propera-welcome-dismissed-${currentResort.id}`;
      const wasDismissed = sessionStorage.getItem(dismissedKey);
      if (!wasDismissed) {
        setShowWelcome(true);
      }
    } else {
      setShowWelcome(false);
    }
  }, [currentResort, dismissed]);

  const handleDismiss = () => {
    if (currentResort) {
      sessionStorage.setItem(`propera-welcome-dismissed-${currentResort.id}`, 'true');
    }
    setDismissed(true);
    setShowWelcome(false);
  };

  // Fetch resort stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['resort-admin-stats', currentResort?.id, today],
    queryFn: async () => {
      if (!currentResort) return null;

      // Parallel fetch for performance
      const [inHouseRes, arrivalsRes, departuresRes] = await Promise.all([
        supabase
          .from('guests')
          .select('*', { count: 'exact', head: true })
          .eq('resort_id', currentResort.id)
          .lte('check_in_date', today)
          .gte('check_out_date', today),
        supabase
          .from('guests')
          .select('id, full_name, room_number, is_vip', { count: 'exact' })
          .eq('resort_id', currentResort.id)
          .eq('check_in_date', today)
          .limit(10),
        supabase
          .from('guests')
          .select('*', { count: 'exact', head: true })
          .eq('resort_id', currentResort.id)
          .eq('check_out_date', today),
      ]);

      // VIP arrivals
      const vipArrivals = arrivalsRes.data?.filter((g: any) => g.is_vip) || [];

      // Today's activity pax
      const { data: sessions } = await supabase
        .from('activity_sessions')
        .select('id, capacity')
        .eq('resort_id', currentResort.id)
        .eq('date', today)
        .eq('status', 'SCHEDULED');

      let activityPax = 0;
      let fullyBookedSessions = 0;
      
      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id);
        const { data: bookings } = await supabase
          .from('activity_bookings')
          .select('session_id, num_adults, num_children')
          .in('session_id', sessionIds)
          .eq('status', 'CONFIRMED');
        
        // Calculate per-session pax
        const sessionPax: Record<string, number> = {};
        bookings?.forEach(b => {
          const pax = (b.num_adults || 0) + (b.num_children || 0);
          sessionPax[b.session_id] = (sessionPax[b.session_id] || 0) + pax;
          activityPax += pax;
        });
        
        // Count fully booked sessions
        sessions.forEach(s => {
          if ((sessionPax[s.id] || 0) >= s.capacity) {
            fullyBookedSessions++;
          }
        });
      }

      // Today's restaurant covers
      const { data: slots } = await supabase
        .from('restaurant_time_slots')
        .select('id')
        .eq('resort_id', currentResort.id)
        .eq('date', today);

      let covers = 0;
      if (slots && slots.length > 0) {
        const slotIds = slots.map(s => s.id);
        const { data: reservations } = await supabase
          .from('restaurant_reservations')
          .select('num_adults, num_children')
          .in('restaurant_slot_id', slotIds)
          .eq('status', 'CONFIRMED');
        covers = reservations?.reduce(
          (sum, r) => sum + (r.num_adults || 0) + (r.num_children || 0),
          0
        ) || 0;
      }

      // Last 7 days average feedback
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: feedback } = await supabase
        .from('stay_feedback')
        .select('overall_rating')
        .eq('resort_id', currentResort.id)
        .gte('created_at', sevenDaysAgo.toISOString());

      const avgRating = feedback && feedback.length > 0
        ? (feedback.reduce((sum, f) => sum + f.overall_rating, 0) / feedback.length).toFixed(1)
        : null;

      return {
        guestsInHouse: inHouseRes.count || 0,
        arrivalsToday: arrivalsRes.count || 0,
        arrivals: arrivalsRes.data || [],
        vipArrivals,
        departuresToday: departuresRes.count || 0,
        activityPax,
        fullyBookedSessions,
        covers,
        avgRating,
      };
    },
    enabled: !!currentResort,
  });

  // Fetch open guest requests
  const { data: openRequests, isLoading: loadingRequests } = useQuery({
    queryKey: ['open-requests', currentResort?.id],
    queryFn: async () => {
      if (!currentResort) return [];
      const { data } = await supabase
        .from('guest_requests')
        .select('id, special_request_text, status, guest:guests(full_name, room_number)')
        .eq('resort_id', currentResort.id)
        .in('status', ['OPEN', 'IN_PROGRESS'])
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!currentResort,
  });

  // Fetch today's activity sessions
  const { data: todaySessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['today-sessions', currentResort?.id, today],
    queryFn: async () => {
      if (!currentResort) return [];

      const { data: sessions } = await supabase
        .from('activity_sessions')
        .select(`
          id,
          start_time,
          end_time,
          capacity,
          status,
          activities!inner(name)
        `)
        .eq('resort_id', currentResort.id)
        .eq('date', today)
        .eq('status', 'SCHEDULED')
        .order('start_time', { ascending: true });

      if (!sessions) return [];

      const sessionsWithPax = await Promise.all(
        sessions.map(async (session) => {
          const { data: bookings } = await supabase
            .from('activity_bookings')
            .select('num_adults, num_children')
            .eq('session_id', session.id)
            .eq('status', 'CONFIRMED');

          const confirmedPax = bookings?.reduce(
            (sum, b) => sum + (b.num_adults || 0) + (b.num_children || 0),
            0
          ) || 0;

          return {
            ...session,
            confirmedPax,
            occupancy: session.capacity > 0 ? Math.round((confirmedPax / session.capacity) * 100) : 0,
          };
        })
      );

      return sessionsWithPax;
    },
    enabled: !!currentResort,
  });

  // Fetch tonight's restaurant slots
  const { data: tonightSlots, isLoading: loadingSlots } = useQuery({
    queryKey: ['tonight-slots', currentResort?.id, today],
    queryFn: async () => {
      if (!currentResort) return [];

      const { data: slots } = await supabase
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
        .eq('status', 'OPEN')
        .order('start_time', { ascending: true });

      if (!slots) return [];

      const slotsWithCovers = await Promise.all(
        slots.map(async (slot) => {
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

  // Fetch recent feedback
  const { data: recentFeedback, isLoading: loadingFeedback } = useQuery({
    queryKey: ['recent-feedback', currentResort?.id],
    queryFn: async () => {
      if (!currentResort) return [];

      const { data } = await supabase
        .from('stay_feedback')
        .select(`
          id,
          overall_rating,
          highlight_comment,
          improvement_comment,
          check_out_date,
          guests!inner(full_name)
        `)
        .eq('resort_id', currentResort.id)
        .order('created_at', { ascending: false })
        .limit(5);

      return data || [];
    },
    enabled: !!currentResort,
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

  // Format requests for NeedsAttentionCard
  const formattedRequests = openRequests?.map((req: any) => ({
    id: req.id,
    guestName: req.guest?.full_name || 'Unknown Guest',
    roomNumber: req.guest?.room_number || '',
    requestText: req.special_request_text,
    status: req.status,
  })) || [];

  const formattedVipArrivals = stats?.vipArrivals?.map((vip: any) => ({
    id: vip.id,
    name: vip.full_name,
    roomNumber: vip.room_number,
  })) || [];

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-fade-in">
      {/* Sticky Dashboard Header */}
      <DashboardHeader
        resortName={currentResort?.name || 'Resort'}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/staff/guest-requests">
                <MessageSquare className="h-4 w-4 mr-1.5" />
                <span className="hidden xs:inline">Requests</span>
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/staff/guests/new">
                <Plus className="h-4 w-4 mr-1.5" />
                <span className="hidden xs:inline">Add Guest</span>
              </Link>
            </Button>
          </div>
        }
      />

      {/* Welcome/Branding Prompt for new resorts */}
      {showWelcome && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 overflow-hidden">
          <CardContent className="py-5 sm:py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 rounded-xl bg-primary/10 shrink-0">
                  <Palette className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-base sm:text-lg mb-1">Welcome to {currentResort?.name}!</h3>
                  <p className="text-muted-foreground text-sm mb-3 sm:mb-4">
                    Set up your brand so the guest portal reflects your resort.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => navigate('/staff/settings/branding')}>
                      <Palette className="h-4 w-4 mr-2" />
                      Set Up Branding
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleDismiss}>
                      Skip for Now
                    </Button>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleDismiss} className="shrink-0 h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Onboarding Banner */}
      <OnboardingBanner />

      {/* SECTION 1: Needs Attention - Always first on mobile, sticky */}
      <NeedsAttentionCard
        openRequests={formattedRequests}
        vipArrivals={formattedVipArrivals}
        fullySessions={stats?.fullyBookedSessions || 0}
        loading={isLoading || loadingRequests}
        sticky
      />

      {/* SECTION 2: Today at a Glance - Priority Metrics */}
      <section className="space-y-3">
        <h2 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
          Today at a Glance
        </h2>
        <PriorityCardGrid>
          <PriorityCard
            title="Guests In-House"
            value={stats?.guestsInHouse || 0}
            subtitle="currently staying"
            icon={Users}
            href="/staff/guests"
            variant="primary"
            loading={isLoading}
          />
          <PriorityCard
            title="Arrivals Today"
            value={stats?.arrivalsToday || 0}
            subtitle="checking in"
            icon={UserPlus}
            href="/staff/guests?filter=arrivals"
            variant="success"
            loading={isLoading}
          />
          <PriorityCard
            title="Departures Today"
            value={stats?.departuresToday || 0}
            subtitle="checking out"
            icon={UserMinus}
            href="/staff/guests?filter=departures"
            variant="warning"
            loading={isLoading}
          />
          <PriorityCard
            title="Dining Covers"
            value={stats?.covers || 0}
            subtitle="restaurant bookings"
            icon={Utensils}
            href="/staff/restaurants/slots"
            variant="default"
            loading={isLoading}
          />
        </PriorityCardGrid>
      </section>

      {/* SECTION 3: Operations - Mobile Carousels + Desktop OperationsSections */}
      
      {/* Mobile: Horizontal Carousels */}
      <div className="space-y-5 md:hidden">
        <HorizontalCardCarousel
          title="Today's Activities"
          icon={<Calendar className="h-4 w-4 text-primary" />}
          viewAllHref="/staff/activities/sessions"
          hasItems={!!(todaySessions && todaySessions.length > 0)}
          emptyMessage="No sessions scheduled today"
          mobileOnly={false}
        >
          {todaySessions?.slice(0, 6).map((session: any) => (
            <SessionCard
              key={session.id}
              id={session.id}
              activityName={session.activities?.name || 'Unknown Activity'}
              startTime={session.start_time}
              endTime={session.end_time}
              confirmedPax={session.confirmedPax}
              capacity={session.capacity}
            />
          ))}
        </HorizontalCardCarousel>

        <HorizontalCardCarousel
          title="Dining Today"
          icon={<Utensils className="h-4 w-4 text-chart-3" />}
          viewAllHref="/staff/restaurants/slots"
          hasItems={!!(tonightSlots && tonightSlots.length > 0)}
          emptyMessage="No slots scheduled today"
          mobileOnly={false}
        >
          {tonightSlots?.slice(0, 6).map((slot: any) => (
            <SlotCard
              key={slot.id}
              id={slot.id}
              restaurantName={slot.restaurants?.name || 'Unknown Restaurant'}
              mealPeriod={slot.meal_period}
              startTime={slot.start_time}
              endTime={slot.end_time}
              confirmedCovers={slot.confirmedCovers}
              capacity={slot.capacity}
            />
          ))}
        </HorizontalCardCarousel>
      </div>

      {/* Tablet/Desktop: Original OperationsSections grid */}
      <section className="hidden md:grid gap-4 sm:gap-5 lg:gap-6 lg:grid-cols-2">
        {/* Today's Activities */}
        <OperationsSection
          title="Today's Activities"
          icon={Calendar}
          iconColor="text-primary"
          viewAllHref="/staff/activities/sessions"
          loading={loadingSessions}
          emptyIcon={Calendar}
          emptyMessage="No sessions scheduled today"
          hasItems={!!(todaySessions && todaySessions.length > 0)}
          collapsibleMobile
        >
          {todaySessions?.slice(0, 6).map((session: any) => (
            <OperationsListItem
              key={session.id}
              href={`/staff/activities/sessions/${session.id}`}
              time={session.start_time.slice(0, 5)}
              title={session.activities?.name || 'Unknown Activity'}
              capacity={`${session.confirmedPax}/${session.capacity}`}
              occupancy={session.occupancy}
            />
          ))}
        </OperationsSection>

        {/* Today's Restaurants */}
        <OperationsSection
          title="Today's Restaurants"
          icon={Utensils}
          iconColor="text-chart-3"
          viewAllHref="/staff/restaurants/slots"
          loading={loadingSlots}
          emptyIcon={Utensils}
          emptyMessage="No slots scheduled today"
          hasItems={!!(tonightSlots && tonightSlots.length > 0)}
          collapsibleMobile
          defaultCollapsed
        >
          {tonightSlots?.slice(0, 6).map((slot: any) => (
            <OperationsListItem
              key={slot.id}
              href={`/staff/restaurants/slots/${slot.id}`}
              time={slot.start_time.slice(0, 5)}
              title={slot.restaurants?.name || 'Unknown Restaurant'}
              capacity={`${slot.confirmedCovers}/${slot.capacity}`}
              occupancy={slot.occupancy}
              badge={{
                label: slot.meal_period,
                className: getMealPeriodBadge(slot.meal_period),
              }}
            />
          ))}
        </OperationsSection>
      </section>

      {/* SECTION 4: Analytics & Feedback - Collapsible on mobile */}
      <Collapsible open={showAnalytics} onOpenChange={setShowAnalytics}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between py-3 px-1 text-left sm:hidden group">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Trends & Feedback
            </h2>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showAnalytics ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>
        
        {/* Always visible on desktop */}
        <div className="hidden sm:block">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-3">
            Trends & Feedback
          </h2>
        </div>

        <CollapsibleContent className="sm:!block">
          <div className="grid gap-4 sm:gap-5 lg:gap-6 lg:grid-cols-2 pt-2 sm:pt-0">
            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Performance Snapshot</CardTitle>
                <CardDescription>7-day overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-muted/30 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Star className="h-5 w-5 text-warning fill-warning" />
                      <span className="text-2xl font-bold">{stats?.avgRating || '—'}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Avg Rating</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/30 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Calendar className="h-5 w-5 text-primary" />
                      <span className="text-2xl font-bold">{stats?.activityPax || 0}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Activity Pax</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Feedback */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base sm:text-lg">Recent Feedback</CardTitle>
                    <CardDescription>Latest guest comments</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/staff/reports/stay-feedback" className="text-primary">
                      View all <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingFeedback ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 rounded-lg" />
                    ))}
                  </div>
                ) : recentFeedback && recentFeedback.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-auto">
                    {recentFeedback.map((fb: any) => (
                      <div key={fb.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-warning/10 shrink-0">
                          <Star className="h-4 w-4 text-warning fill-warning" />
                          <span className="font-bold text-sm text-warning">{fb.overall_rating}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium text-sm">{fb.guests?.full_name || 'Anonymous'}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(fb.check_out_date), 'MMM d')}
                            </span>
                          </div>
                          {(fb.highlight_comment || fb.improvement_comment) && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {fb.highlight_comment || fb.improvement_comment}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No feedback received yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Smart FAB for quick actions (mobile only) */}
      <SmartFAB />
    </div>
  );
}
