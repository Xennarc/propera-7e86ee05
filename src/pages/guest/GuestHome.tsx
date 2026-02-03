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
import { Sun, Sunset, Moon, ChevronRight, Compass, Sparkles, Calendar, ClipboardCheck } from 'lucide-react';
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
import { GuestFeaturedActivities } from '@/components/guest/GuestFeaturedActivities';
import { useIsPrearrivalGuest, usePrearrivalData } from '@/hooks/usePrearrivalData';
import { useActiveStay } from '@/hooks/useActiveStay';
import GuestPrearrivalHome from '@/pages/guest/GuestPrearrivalHome';
import { PrearrivalWizard } from '@/components/guest/prearrival/PrearrivalWizard';
import { useResortBranding } from '@/hooks/useResortBranding';
import { GuestRealtimeDebugBadge } from '@/components/guest/GuestRealtimeDebugBadge';

// Define interface at module level (not inside component)
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

export default function GuestHome() {
  const { guest } = useGuestAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isPrearrival } = useIsPrearrivalGuest();
  const { activeStay, isLoading: stayLoading } = useActiveStay();
  const { data: prearrivalData } = usePrearrivalData();

  // Pre-arrival wizard state
  const [wizardOpen, setWizardOpen] = useState(false);

  // Session-based dismissed suggestions - moved before conditional returns
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);

  // Determine pre-arrival status for conditional data fetching
  const showPrearrival = activeStay?.status === 'pre_arrival' || isPrearrival;

  // ✅ ALL HOOKS CALLED UNCONDITIONALLY AT TOP LEVEL
  // Use `enabled` flag to conditionally fetch data
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
    enabled: !!guest && !showPrearrival, // Disable when pre-arrival
    staleTime: 30000,
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
    enabled: !!guest && !showPrearrival, // Disable when pre-arrival
  });

  // Fetch resort data including hero image
  const { data: resort } = useQuery({
    queryKey: ['guest-resort', guest?.resortId],
    queryFn: async () => {
      if (!guest) return null;
      const { data, error } = await supabase
        .from('resorts')
        .select('code, login_hero_image_url, home_hero_image_url')
        .eq('id', guest.resortId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!guest,
  });

  // Onboarding tour - called unconditionally
  const { showOnboarding, completeOnboarding, skipOnboarding } = useGuestOnboarding(
    guest?.guestId || '',
    guest?.resortId || ''
  );

  // ✅ NOW CONDITIONAL RETURNS ARE SAFE (all hooks called above)
  if (showPrearrival) {
    return <GuestPrearrivalHome activeStay={activeStay} />;
  }

  if (!guest) return null;
  
  // Show loading state while data is being fetched
  if (stayLoading || isLoading) {
    return <GuestHomeLoading />;
  }

  // Hero image with fallback chain: home_hero → login_hero → default
  const heroImage = resort?.home_hero_image_url 
    || resort?.login_hero_image_url 
    || 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80';

  // Calculate current day of stay
  const currentDay = differenceInDays(new Date(), parseISO(guest?.checkInDate || '')) + 1;
  const totalDays = differenceInDays(parseISO(guest?.checkOutDate || ''), parseISO(guest?.checkInDate || ''));
  const isCheckoutDay = new Date().toISOString().split('T')[0] === guest?.checkOutDate;

  // All hooks have been called above - safe to use computed values now
  const firstName = String(guest.fullName ?? 'Guest').split(' ')[0] || 'Guest';
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

  // Loading state already handled above after conditional returns

  return (
    <>
      {/* Debug Badge - only visible with ?debugRealtime=1 */}
      <GuestRealtimeDebugBadge />

      {/* Onboarding Tour */}
      {showOnboarding && (
        <GuestOnboardingTour
          onComplete={completeOnboarding}
          onSkip={skipOnboarding}
        />
      )}

      <div className="space-y-5 md:space-y-6 guest-safe-bottom">
      {/* Pre-arrival Nudge for In-Stay Guests - persistent until completed */}
      {!isPrearrival && 
       prearrivalData?.settings?.is_enabled && 
       prearrivalData?.profile?.prearrival_status !== 'completed' && (
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

      {/* Premium Image Hero Card */}
      <div className="guest-hero-card shadow-guest-hero">
        {/* Background Image with smooth loading */}
        <div 
          className="absolute inset-0 bg-cover bg-center scale-[1.02] transition-transform duration-700"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        
        {/* Multi-layer gradient for premium depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/65 via-black/40 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        
        {/* Content with glass backing for text */}
        <div className="relative z-10 h-full flex flex-col justify-between p-5 sm:p-6 aspect-[2.1/1] sm:aspect-[2.4/1] md:aspect-[2.8/1]">
          <div className="space-y-0.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight drop-shadow-sm">
              {String(greeting.text)}, {firstName}!
            </h1>
            <p className="text-white/75 text-sm sm:text-base font-medium">
              {format(new Date(), 'EEEE, MMMM d')}
            </p>
          </div>
          
          <div className="flex items-center justify-between gap-3">
            <span className="guest-stay-badge">
              {format(parseISO(guest.checkInDate), 'MMM d')} – {format(parseISO(guest.checkOutDate), 'MMM d')}
            </span>
            <span className={cn(
              "guest-stay-badge",
              isCheckoutDay ? "guest-stay-badge-accent" : "guest-stay-badge-accent"
            )}>
              {isCheckoutDay ? '✨ Check-out day' : `Day ${currentDay} of ${totalDays}`}
            </span>
          </div>
        </div>
      </div>

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
      <section>
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
            <Card className="guest-card border-primary/10 bg-gradient-to-br from-primary/[0.03] via-transparent to-transparent">
              <CardContent className="p-5 sm:p-6">
                <h3 className="text-lg font-bold mb-1">{t('home.noPlansYet')}</h3>
                <p className="text-sm text-muted-foreground mb-4">Discover experiences curated for your stay</p>
                <div className="flex gap-2 sm:gap-3">
                  <Link to="/guest/activities" className="flex-1">
                    <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold tap-target shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                      {t('home.exploreActivities')}
                    </Button>
                  </Link>
                  <Link to="/guest/restaurants" className="flex-1">
                    <Button variant="outline" className="w-full font-semibold tap-target hover:bg-muted/50 transition-all duration-200">
                      {t('home.exploreDining')}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="guest-card border-dashed border-border/40 bg-muted/10">
              <CardContent className="py-8 sm:py-10 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-muted/50 mb-4">
                  <IconCalendar className="h-7 w-7 text-muted-foreground/50" />
                </div>
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
      </section>

      {/* Featured Activities Grid */}
      <GuestFeaturedActivities resortId={guest.resortId} />

      {/* Upcoming Bookings Preview */}
      {totalUpcomingBookings > todaySchedule.length && (
        <section>
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
        </section>
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
