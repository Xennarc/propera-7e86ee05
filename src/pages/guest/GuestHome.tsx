import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sun, Sunset, Moon, ChevronRight, Compass, Sparkles, Calendar, X, ClipboardCheck } from 'lucide-react';
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
import { GuestOnboardingTour, useGuestOnboarding } from '@/components/guest/GuestOnboardingTour';
import { GuestSmartSuggestions } from '@/components/guest/GuestSmartSuggestions';
import { GuestTodayTimeline } from '@/components/guest/GuestTodayTimeline';
import { TravelPartyCard } from '@/components/guest/TravelPartyCard';
import { useIsPrearrivalGuest, usePrearrivalData } from '@/hooks/usePrearrivalData';
import GuestPrearrivalHome from '@/pages/guest/GuestPrearrivalHome';
import { PrearrivalWizard } from '@/components/guest/prearrival/PrearrivalWizard';

export default function GuestHome() {
  const { guest } = useGuestAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isPrearrival } = useIsPrearrivalGuest();
  const { data: prearrivalData } = usePrearrivalData();

  // Pre-arrival nudge state
  const [prearrivalNudgeDismissed, setPrearrivalNudgeDismissed] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Show pre-arrival home if guest hasn't checked in yet
  if (isPrearrival) {
    return <GuestPrearrivalHome />;
  }

  interface BookingItem {
    booking_id: string;
    booking_type: string;
    name: string;
    date: string;
    start_time: string;
    end_time: string;
    status: string;
    location: string;
    notes: string;
    num_adults: number;
    num_children: number;
    booked_by_guest_id: string;
    booked_by_name: string;
  }

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['guest-bookings', guest?.guestId],
    queryFn: async () => {
      if (!guest) return null;
      const { data, error } = await supabase.rpc('guest_get_bookings', {
        p_guest_id: guest.guestId,
      });
      if (error) throw error;
      return data as BookingItem[];
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

  // Session-based dismissed suggestions
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);

  // Onboarding tour
  const { showOnboarding, completeOnboarding, skipOnboarding } = useGuestOnboarding(
    guest?.guestId || '',
    guest?.resortId || ''
  );

  if (!guest) return null;

  const firstName = guest.fullName.split(' ')[0];
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = addDays(new Date(), 1).toISOString().split('T')[0];
  const hour = new Date().getHours();

  // Calculate stay nights
  const stayNights = differenceInDays(
    parseISO(guest.checkOutDate),
    parseISO(guest.checkInDate)
  );

  // Get greeting based on time of day
  const getGreeting = () => {
    if (hour < 12) return { text: t('home.goodMorning'), icon: Sun, emoji: '☀️' };
    if (hour < 17) return { text: t('home.goodAfternoon'), icon: Sun, emoji: '🌤️' };
    if (hour < 21) return { text: t('home.goodEvening'), icon: Sunset, emoji: '🌅' };
    return { text: t('home.goodEvening'), icon: Moon, emoji: '🌙' };
  };

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  // Filter bookings by type - now using flat array with booking_type
  const allBookings = bookings || [];
  
  // Filter today's bookings
  const todayActivities = allBookings.filter(
    (b) => b.booking_type === 'activity' && b.date === todayStr && (b.status === 'CONFIRMED' || b.status === 'PENDING')
  );

  const todayReservations = allBookings.filter(
    (b) => b.booking_type === 'restaurant' && b.date === todayStr && (b.status === 'CONFIRMED' || b.status === 'PENDING')
  );

  const todaySchedule = [
    ...todayActivities.map((b) => ({
      type: 'activity' as const,
      id: b.booking_id,
      time: b.start_time,
      title: b.name,
      status: b.status,
      category: (b as any).category,
      duration_minutes: (b as any).duration_minutes,
      num_adults: b.num_adults || 1,
      num_children: b.num_children || 0,
    })),
    ...todayReservations.map((r) => ({
      type: 'restaurant' as const,
      id: r.booking_id,
      time: r.start_time,
      title: r.name,
      mealPeriod: (r as any).meal_period,
      status: r.status,
      num_adults: r.num_adults || 1,
      num_children: r.num_children || 0,
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  // Tomorrow's bookings count
  const tomorrowActivities = allBookings.filter(
    (b) => b.booking_type === 'activity' && b.date === tomorrowStr && (b.status === 'CONFIRMED' || b.status === 'PENDING')
  );
  const tomorrowReservations = allBookings.filter(
    (b) => b.booking_type === 'restaurant' && b.date === tomorrowStr && (b.status === 'CONFIRMED' || b.status === 'PENDING')
  );
  const tomorrowCount = tomorrowActivities.length + tomorrowReservations.length;

  // Calculate if guest has "no plans yet" - check if they have few bookings
  const upcomingActivities = allBookings.filter(
    (b) => b.booking_type === 'activity' && b.date >= todayStr && (b.status === 'CONFIRMED' || b.status === 'PENDING')
  );
  const upcomingReservations = allBookings.filter(
    (b) => b.booking_type === 'restaurant' && b.date >= todayStr && (b.status === 'CONFIRMED' || b.status === 'PENDING')
  );
  
  const totalUpcomingBookings = upcomingActivities.length + upcomingReservations.length;
  const showNudge = !isLoading && totalUpcomingBookings <= 1 && todaySchedule.length === 0;

  // Check for dining tonight (after 5pm = 17:00)
  const hasDiningTonight = hour >= 17 
    ? false 
    : todayReservations.some(r => r.start_time >= '17:00');

  // Has any activity bookings
  const hasActivities = upcomingActivities.length > 0;

  const handleDismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestions(prev => [...prev, suggestionId]);
  };

  if (isLoading) {
    return <GuestHomeLoading />;
  }

  return (
    <>
      {/* Onboarding Tour */}
      {showOnboarding && (
        <GuestOnboardingTour
          onComplete={completeOnboarding}
          onSkip={skipOnboarding}
        />
      )}

      <div className="space-y-6">
      {/* Soft Pre-arrival Nudge for In-Stay Guests */}
      {!isPrearrival && 
       prearrivalData?.settings?.is_enabled && 
       prearrivalData?.profile?.prearrival_status !== 'completed' &&
       !prearrivalNudgeDismissed && (
        <Card className="guest-card bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                <ClipboardCheck className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground mb-0.5">
                  Complete your pre-arrival info
                </h3>
                <p className="text-xs text-muted-foreground">
                  Share your preferences in 2 minutes to help us personalize your stay.
                </p>
              </div>
              <button
                onClick={() => setPrearrivalNudgeDismissed(true)}
                className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Button 
              size="sm" 
              className="mt-3 w-full"
              onClick={() => setWizardOpen(true)}
            >
              Complete Now
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

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
                  ? t('home.eventsToday', { count: todaySchedule.length })
                  : t('home.whatToDo')}
              </p>
            </div>
          </div>
          
          {/* Today's Date Display */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(), 'EEEE, MMMM d, yyyy')}</span>
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

      {/* Travel Party Card */}
      <TravelPartyCard />

      {/* Smart Suggestions - contextual nudges */}
      {!showNudge && (
        <GuestSmartSuggestions
          stayNights={stayNights}
          hasActivities={hasActivities}
          hasDiningTonight={hasDiningTonight}
          todayBookingsCount={todaySchedule.length}
          dismissedIds={dismissedSuggestions}
          onDismiss={handleDismissSuggestion}
        />
      )}

      {/* Today's Schedule */}
      <div>
        <GuestSectionHeader
          title={t('common.today')}
          icon={<IconClock className="h-5 w-5 text-primary" />}
          actionLabel={todaySchedule.length > 0 ? t('common.viewAll') : undefined}
          actionHref="/guest/bookings"
        />
        
        {/* Today & Tomorrow Timeline */}
        {todaySchedule.length > 0 && (
          <GuestTodayTimeline
            todaySchedule={todaySchedule}
            tomorrowCount={tomorrowCount}
            className="mb-4"
          />
        )}
        
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
                const isActivity = booking.booking_type === 'activity';
                return (
                  <GuestBookingCard
                    key={booking.booking_id}
                    booking={{
                      id: booking.booking_id,
                      type: isActivity ? 'activity' : 'restaurant',
                      title: booking.name,
                      date: booking.date,
                      start_time: booking.start_time,
                      status: booking.status,
                      num_adults: booking.num_adults || 1,
                      num_children: booking.num_children || 0,
                      category: (booking as any).category,
                      meal_period: (booking as any).meal_period,
                      duration_minutes: (booking as any).duration_minutes,
                    }}
                    compact
                  />
                );
              })}
          </div>
        </div>
      )}
    </div>

    {/* Pre-arrival Wizard Dialog for in-stay nudge */}
    {prearrivalData?.settings && (
      <PrearrivalWizard 
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        profile={prearrivalData?.profile || null}
        settings={prearrivalData.settings}
        checkInDate={guest.checkInDate}
      />
    )}
    </>
  );
}
