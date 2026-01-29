import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { differenceInHours, parseISO } from 'date-fns';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { usePrearrivalData, useIsPrearrivalGuest, DEFAULT_PREARRIVAL_SETTINGS } from '@/hooks/usePrearrivalData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { PrearrivalCountdown } from '@/components/guest/prearrival/PrearrivalCountdown';
import { PrearrivalChecklist } from '@/components/guest/prearrival/PrearrivalChecklist';
import { PrearrivalWizard } from '@/components/guest/prearrival/PrearrivalWizard';
import { PrearrivalSummaryCard } from '@/components/guest/prearrival/PrearrivalSummaryCard';
import { PrearrivalActivitiesPreview } from '@/components/guest/prearrival/PrearrivalActivitiesPreview';
import { GuestHomeLoading } from '@/components/guest/GuestLoadingSkeleton';
import { Plane, Sparkles, ChevronRight, RefreshCw } from 'lucide-react';
import { IconActivities, IconRestaurants } from '@/components/icons/ProperaIcons';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import type { ActiveStay } from '@/hooks/useActiveStay';

interface GuestPrearrivalHomeProps {
  activeStay?: ActiveStay | null;
}

export default function GuestPrearrivalHome({ activeStay }: GuestPrearrivalHomeProps) {
  const { guest } = useGuestAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isPrearrival, daysUntilArrival } = useIsPrearrivalGuest();
  const { data: prearrivalData, isLoading, error, refetch } = usePrearrivalData();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);

  // Fetch pre-arrival booking counts
  const { data: bookingCounts } = useQuery({
    queryKey: ['prearrival-booking-counts', guest?.guestId],
    queryFn: async () => {
      if (!guest) return { activities: 0, dining: 0 };

      const [activityResult, diningResult] = await Promise.all([
        supabase
          .from('activity_bookings')
          .select('id', { count: 'exact', head: true })
          .eq('guest_id', guest.guestId)
          .eq('booking_source', 'PRE_STAY')
          .in('status', ['CONFIRMED', 'PENDING']),
        supabase
          .from('restaurant_reservations')
          .select('id', { count: 'exact', head: true })
          .eq('guest_id', guest.guestId)
          .eq('booking_source', 'PRE_STAY')
          .in('status', ['CONFIRMED', 'PENDING']),
      ]);

      return {
        activities: activityResult.count || 0,
        dining: diningResult.count || 0,
      };
    },
    enabled: !!guest,
  });

  if (!guest) return null;

  if (isLoading) {
    return <GuestHomeLoading />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <ErrorState
          title="Unable to load pre-arrival data"
          description="We couldn't fetch your pre-arrival information. Please try again."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const firstName = String(guest.fullName ?? 'Guest').split(' ')[0] || 'Guest';
  const settings = prearrivalData?.settings ?? DEFAULT_PREARRIVAL_SETTINGS;
  const profile = prearrivalData?.profile;
  
  // Check if profile has data (user has submitted something)
  const hasSubmittedData = profile && (
    profile.arrival_time ||
    profile.arrival_flight_number ||
    profile.transfer_preference ||
    (Array.isArray(profile.dietary_preferences) && profile.dietary_preferences.length > 0) ||
    profile.allergies ||
    profile.water_comfort_level ||
    (Array.isArray(profile.special_occasions) && profile.special_occasions.length > 0) ||
    profile.special_requests
  );

  // Check if editing is locked (within 24 hours of check-in)
  const hoursUntilCheckin = differenceInHours(parseISO(guest.checkInDate), new Date());
  const editLocked = hoursUntilCheckin <= 24 && hoursUntilCheckin > 0;

  // If pre-arrival form is disabled, still show basic countdown + booking access
  if (!settings?.is_enabled) {
    return (
      <div className="space-y-6">
        {/* Welcome Banner (simplified) */}
        <Card className="guest-hero border-0 shadow-guest-card overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-transparent">
          <CardContent className="p-5 relative z-10">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 shadow-sm">
                <Plane className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  {t('prearrival.welcomeTitle', { name: firstName })}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t('prearrival.getReady', 'Get ready for your upcoming stay')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Countdown */}
        <PrearrivalCountdown 
          checkInDate={guest.checkInDate}
          checkOutDate={guest.checkOutDate}
          roomNumber={guest.roomNumber}
        />

        {/* Quick Actions to browse */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/guest/activities">
            <Card className="guest-card hover:border-primary/30 transition-colors h-full">
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <IconActivities className="h-6 w-6 text-primary" />
                </div>
                <span className="font-medium text-sm">{t('prearrival.browseActivities', 'Browse Activities')}</span>
              </CardContent>
            </Card>
          </Link>
          
          <Link to="/guest/restaurants">
            <Card className="guest-card hover:border-primary/30 transition-colors h-full">
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-lagoon/10">
                  <IconRestaurants className="h-6 w-6 text-lagoon" />
                </div>
                <span className="font-medium text-sm">{t('prearrival.browseDining', 'Browse Dining')}</span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    );
  }

  const handleOpenWizard = (step?: number) => {
    setWizardStep(step || 0);
    setWizardOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="guest-hero border-0 shadow-guest-card overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-transparent">
        <CardContent className="p-5 relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 shadow-sm">
              <Plane className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {t('prearrival.welcomeTitle', { name: firstName })}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('prearrival.welcomeSubtitle')}
              </p>
            </div>
          </div>
          
          {settings?.welcome_message && (
            <p className="text-sm text-muted-foreground border-t border-border/30 pt-3 mt-3">
              {settings.welcome_message}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Countdown */}
      <PrearrivalCountdown 
        checkInDate={guest.checkInDate}
        checkOutDate={guest.checkOutDate}
        roomNumber={guest.roomNumber}
      />

      {/* Pre-arrival Checklist OR Summary Card based on completion */}
      {hasSubmittedData && profile?.prearrival_status === 'completed' ? (
        <PrearrivalSummaryCard
          profile={profile}
          settings={settings}
          checkInDate={guest.checkInDate}
          onEdit={() => handleOpenWizard(0)}
          editLocked={editLocked}
          editLockedMessage="Some changes may require contacting reception"
        />
      ) : (
        <PrearrivalChecklist 
          profile={profile || null}
          settings={settings}
          onOpenWizard={handleOpenWizard}
          onOpenActivities={() => navigate('/guest/activities')}
          onOpenDining={() => navigate('/guest/restaurants')}
          activityBookingsCount={bookingCounts?.activities || 0}
          diningBookingsCount={bookingCounts?.dining || 0}
        />
      )}

      {/* Activities Preview with Day Chips */}
      {settings?.allow_activity_bookings && (
        <PrearrivalActivitiesPreview />
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        {settings?.allow_activity_bookings && (
          <Link to="/guest/activities">
            <Card className="guest-card hover:border-primary/30 transition-colors h-full">
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <IconActivities className="h-6 w-6 text-primary" />
                </div>
                <span className="font-medium text-sm">{t('prearrival.planActivities')}</span>
              </CardContent>
            </Card>
          </Link>
        )}
        
        {settings?.allow_dining_bookings && (
          <Link to="/guest/restaurants">
            <Card className="guest-card hover:border-primary/30 transition-colors h-full">
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-lagoon/10">
                  <IconRestaurants className="h-6 w-6 text-lagoon" />
                </div>
                <span className="font-medium text-sm">{t('prearrival.planDining')}</span>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Tips Card */}
      <Card className="guest-card border-dashed bg-muted/20">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/10">
              <Sparkles className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">{t('prearrival.tipTitle')}</h3>
              <p className="text-xs text-muted-foreground">
                {t('prearrival.tipDescription')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pre-arrival Wizard Dialog */}
      <PrearrivalWizard 
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        profile={profile || null}
        settings={settings}
        checkInDate={guest.checkInDate}
        initialStep={wizardStep}
      />
    </div>
  );
}
