import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, parseISO, addDays } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sun, Sunset, Moon, ChevronRight, Compass, Sparkles, Calendar } from 'lucide-react';
import {
  IconActivities,
  IconRestaurants,
  IconBookings,
  IconCalendar,
  IconClock,
  IconFeedback,
  IconStay,
} from '@/components/icons/ProperaIcons';
import { CategoryIcon, CategoryBadge } from '@/components/ui/category-badge';
import { getCategoryConfig } from '@/lib/activity-category-config';
import { cn } from '@/lib/utils';
import {
  createActivityBookingFromInStaySuggestion,
} from '@/lib/booking-source-helpers';
import { GuestQuickActions } from '@/components/guest/GuestQuickActions';
import { GuestStayProgress } from '@/components/guest/GuestStayProgress';
import { GuestSectionHeader } from '@/components/guest/GuestSectionHeader';
import { GuestBookingCard } from '@/components/guest/GuestBookingCard';
import { GuestHomeLoading } from '@/components/guest/GuestLoadingSkeleton';
import { GuestEmptyState } from '@/components/guest/GuestEmptyState';

export default function GuestHome() {
  const { guest } = useGuestAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['guest-bookings', guest?.guestId],
    queryFn: async () => {
      if (!guest) return null;
      const { data, error } = await supabase.rpc('guest_get_bookings', {
        p_guest_id: guest.guestId,
      });
      if (error) throw error;
      return data as {
        activity_bookings: any[];
        restaurant_reservations: any[];
      };
    },
    enabled: !!guest,
    staleTime: 30000, // 30 seconds
  });

  // Check if guest can submit feedback
  const { data: canSubmitFeedback } = useQuery({
    queryKey: ['can-submit-feedback', guest?.guestId],
    queryFn: async () => {
      if (!guest) return null;
      const { data, error } = await supabase.rpc('guest_can_submit_feedback', {
        p_guest_id: guest.guestId,
      });
      if (error) throw error;
      return data as { can_submit: boolean; reason?: string };
    },
    enabled: !!guest,
  });

  // Fetch resort code for activity explorer links
  const { data: resort } = useQuery({
    queryKey: ['guest-resort', guest?.resortId],
    queryFn: async () => {
      if (!guest) return null;
      const { data, error } = await supabase
        .from('resorts')
        .select('code')
        .eq('id', guest.resortId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!guest,
  });

  if (!guest) return null;

  const firstName = guest.fullName.split(' ')[0];
  const todayStr = new Date().toISOString().split('T')[0];
  const hour = new Date().getHours();

  // Get greeting based on time of day
  const getGreeting = () => {
    if (hour < 12) return { text: t('home.goodMorning'), icon: Sun, emoji: '☀️' };
    if (hour < 17) return { text: t('home.goodAfternoon'), icon: Sun, emoji: '🌤️' };
    if (hour < 21) return { text: t('home.goodEvening'), icon: Sunset, emoji: '🌅' };
    return { text: t('home.goodEvening'), icon: Moon, emoji: '🌙' };
  };

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  // Filter today's bookings
  const todayActivities = bookings?.activity_bookings?.filter(
    (b) => b.date === todayStr && (b.status === 'CONFIRMED' || b.status === 'PENDING')
  ) || [];

  const todayReservations = bookings?.restaurant_reservations?.filter(
    (r) => r.date === todayStr && (r.status === 'CONFIRMED' || r.status === 'PENDING')
  ) || [];

  const todaySchedule = [
    ...todayActivities.map((b) => ({
      type: 'activity' as const,
      id: b.id,
      time: b.start_time,
      title: b.activity_name,
      status: b.status,
      category: b.category,
      duration_minutes: b.duration_minutes,
      num_adults: b.num_adults || 1,
      num_children: b.num_children || 0,
    })),
    ...todayReservations.map((r) => ({
      type: 'restaurant' as const,
      id: r.id,
      time: r.start_time,
      title: r.restaurant_name,
      mealPeriod: r.meal_period,
      status: r.status,
      num_adults: r.num_adults || 1,
      num_children: r.num_children || 0,
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  // Calculate if guest has "no plans yet" - check if they have few bookings
  const upcomingActivities = bookings?.activity_bookings?.filter(
    (b) => b.date >= todayStr && (b.status === 'CONFIRMED' || b.status === 'PENDING')
  ) || [];
  const upcomingReservations = bookings?.restaurant_reservations?.filter(
    (r) => r.date >= todayStr && (r.status === 'CONFIRMED' || r.status === 'PENDING')
  ) || [];
  
  const totalUpcomingBookings = upcomingActivities.length + upcomingReservations.length;
  const showNudge = !isLoading && totalUpcomingBookings <= 1 && todaySchedule.length === 0;

  if (isLoading) {
    return <GuestHomeLoading />;
  }

  return (
    <div className="space-y-6">
      {/* Feedback Prompt - Show when eligible */}
      {canSubmitFeedback?.can_submit && (
        <Card className="guest-card bg-gradient-to-br from-warning/10 via-warning/5 to-transparent border-warning/20 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warning/15">
                <IconFeedback className="h-6 w-6 text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-foreground mb-0.5">
                  {t('feedback.title')}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t('profile.feedback')}
                </p>
              </div>
              <Link to="/guest/feedback">
                <Button size="sm" className="bg-warning hover:bg-warning/90 text-warning-foreground rounded-xl font-semibold shrink-0 tap-target">
                  {t('feedback.submit').split(' ')[0]}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Premium Greeting Card */}
      <Card className="guest-hero border-0 shadow-guest-card overflow-hidden">
        <CardContent className="p-5 relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 shadow-sm">
              <GreetingIcon className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                {greeting.text}, {firstName}!
              </h1>
              <p className="text-sm text-muted-foreground">
                {todaySchedule.length > 0 
                  ? `You have ${todaySchedule.length} ${todaySchedule.length === 1 ? 'event' : 'events'} today`
                  : "What would you like to do today?"}
              </p>
            </div>
          </div>
          
          {/* Stay Progress */}
          <GuestStayProgress 
            checkInDate={guest.checkInDate} 
            checkOutDate={guest.checkOutDate}
            className="pt-3 border-t border-border/30"
          />
        </CardContent>
      </Card>

      {/* Quick Actions Grid */}
      <GuestQuickActions />

      {/* Today's Schedule */}
      <div>
        <GuestSectionHeader
          title={t('common.today')}
          icon={<IconClock className="h-5 w-5 text-primary" />}
          actionLabel={todaySchedule.length > 0 ? t('common.viewAll') : undefined}
          actionHref="/guest/bookings"
        />
        
        {todaySchedule.length === 0 ? (
          showNudge ? (
            <Card className="guest-card border-dashed border-2 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-5">
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                      <Compass className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-1">{t('home.noPlansYet')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('home.noPlansDescription')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link to="/guest/activities">
                      <Button className="w-full tap-target">
                        <IconActivities className="h-4 w-4 mr-2" />
                        {t('home.exploreActivities')}
                      </Button>
                    </Link>
                    <Link to="/guest/restaurants">
                      <Button variant="outline" className="w-full tap-target">
                        <IconRestaurants className="h-4 w-4 mr-2" />
                        {t('home.exploreDining')}
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="guest-card border-dashed bg-muted/20">
              <CardContent className="py-8 text-center">
                <IconCalendar className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-1">Nothing scheduled</h3>
                <p className="text-sm text-muted-foreground">
                  Your bookings for today will appear here
                </p>
              </CardContent>
            </Card>
          )
        ) : (
          <div className="space-y-3">
            {todaySchedule.map((item) => (
              <GuestBookingCard
                key={item.id}
                booking={{
                  id: item.id,
                  type: item.type,
                  title: item.title,
                  date: todayStr,
                  start_time: item.time,
                  status: item.status,
                  num_adults: item.num_adults,
                  num_children: item.num_children,
                  category: item.type === 'activity' ? item.category : undefined,
                  meal_period: item.type === 'restaurant' ? item.mealPeriod : undefined,
                  duration_minutes: item.type === 'activity' ? item.duration_minutes : undefined,
                }}
                showDate={false}
                compact={todaySchedule.length > 3}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Bookings Preview */}
      {totalUpcomingBookings > todaySchedule.length && (
        <div>
          <GuestSectionHeader
            title={t('home.upcoming')}
            icon={<Calendar className="h-5 w-5 text-lagoon" />}
            actionLabel={t('common.seeMore')}
            actionHref="/guest/bookings"
          />
          
          <div className="space-y-2">
            {[...upcomingActivities, ...upcomingReservations]
              .filter(b => b.date > todayStr)
              .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
              .slice(0, 3)
              .map((booking) => {
                const isActivity = 'activity_name' in booking;
                return (
                  <GuestBookingCard
                    key={booking.id}
                    booking={{
                      id: booking.id,
                      type: isActivity ? 'activity' : 'restaurant',
                      title: isActivity ? booking.activity_name : booking.restaurant_name,
                      date: booking.date,
                      start_time: booking.start_time,
                      status: booking.status,
                      num_adults: booking.num_adults || 1,
                      num_children: booking.num_children || 0,
                      category: isActivity ? booking.category : undefined,
                      meal_period: !isActivity ? booking.meal_period : undefined,
                      duration_minutes: isActivity ? booking.duration_minutes : undefined,
                    }}
                    compact
                  />
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
