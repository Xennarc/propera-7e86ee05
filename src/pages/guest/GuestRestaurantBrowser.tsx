import { useState } from 'react';
import { GuestPageShell } from '@/components/guest/GuestPageShell';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Utensils, Clock, Users, ChevronRight, Sparkles, Phone, Info, CalendarX, Coffee, Sun, Moon, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobilePageHeader } from '@/components/guest/MobilePageHeader';
import { IconRestaurants } from '@/components/icons/ProperaIcons';
import { Skeleton } from '@/components/ui/skeleton';
import { GuestDatePicker } from '@/components/ui/guest-date-picker';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useGuestDiningSync } from '@/hooks/useDiningBookingSync';

const MEAL_PERIOD_ORDER = ['BREAKFAST', 'LUNCH', 'DINNER', 'EVENT'];

// Removed hardcoded config - now defined inside component with translations

export default function GuestRestaurantBrowser() {
  const { guest } = useGuestAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('all');

  // Enable real-time sync for dining
  useGuestDiningSync(guest?.guestId);

  const mealPeriodConfig: Record<string, { icon: typeof Coffee; label: string; colorClass: string; bgClass: string }> = {
    BREAKFAST: { icon: Coffee, label: t('dining.mealPeriods.BREAKFAST'), colorClass: 'text-sunset', bgClass: 'bg-sunset/10' },
    LUNCH: { icon: Sun, label: t('dining.mealPeriods.LUNCH'), colorClass: 'text-lagoon', bgClass: 'bg-lagoon/10' },
    DINNER: { icon: Moon, label: t('dining.mealPeriods.DINNER'), colorClass: 'text-orchid', bgClass: 'bg-orchid/10' },
    EVENT: { icon: PartyPopper, label: t('dining.mealPeriods.EVENT'), colorClass: 'text-coral', bgClass: 'bg-coral/10' },
  };

  const { data: restaurants } = useQuery({
    queryKey: ['guest-restaurants', guest?.resortId],
    queryFn: async () => {
      if (!guest) return [];
      const { data, error } = await supabase.rpc('guest_get_restaurants', { p_resort_id: guest.resortId });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!guest,
  });

  const { data: slots, isLoading } = useQuery({
    queryKey: ['guest-available-slots', guest?.guestId, selectedDate, selectedRestaurant],
    queryFn: async () => {
      if (!guest) return [];
      const { data, error } = await supabase.rpc('guest_get_available_slots', {
        p_guest_id: guest.guestId,
        p_date: selectedDate,
        p_restaurant_id: selectedRestaurant === 'all' ? null : selectedRestaurant,
      });
      if (error) throw error;
      return ((data as any[]) || []).sort((a, b) => {
        const periodDiff = MEAL_PERIOD_ORDER.indexOf(a.meal_period) - MEAL_PERIOD_ORDER.indexOf(b.meal_period);
        return periodDiff !== 0 ? periodDiff : a.start_time.localeCompare(b.start_time);
      });
    },
    enabled: !!guest,
  });

  // Check if there are any slots configured for the date (even if full or past cutoff)
  const { data: allSlotsForDate } = useQuery({
    queryKey: ['guest-all-slots-for-date', guest?.resortId, selectedDate, selectedRestaurant],
    queryFn: async () => {
      if (!guest) return [];
      // Query all slots for the date with restaurant info for cutoff calculation
      let query = supabase
        .from('restaurant_time_slots')
        .select(`
          id, 
          capacity, 
          status, 
          restaurant_id,
          start_time,
          restaurant:restaurants!inner(guest_cutoff_minutes)
        `)
        .eq('resort_id', guest.resortId)
        .eq('date', selectedDate)
        .eq('status', 'OPEN');
      
      if (selectedRestaurant !== 'all') {
        query = query.eq('restaurant_id', selectedRestaurant);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!guest,
  });

  // Determine if slots are past their booking cutoff (using resort timezone)
  const slotsArePastCutoff = (() => {
    if (!allSlotsForDate || allSlotsForDate.length === 0) return false;
    
    // Use resort timezone for accurate cutoff calculation
    const resortTimezone = guest?.resortTimezone || 'UTC';
    const nowInResort = toZonedTime(new Date(), resortTimezone);
    
    return allSlotsForDate.every((slot: any) => {
      // Parse slot time as resort-local time
      const [hours, minutes] = slot.start_time.split(':').map(Number);
      const slotDateTime = new Date(`${selectedDate}T${slot.start_time}`);
      const cutoffMinutes = slot.restaurant?.guest_cutoff_minutes || 30;
      const cutoffTime = new Date(slotDateTime.getTime() - cutoffMinutes * 60 * 1000);
      
      // Compare in resort timezone
      return nowInResort > cutoffTime;
    });
  })();

  if (!guest) return null;

  const slotsByPeriod = slots?.reduce((acc: Record<string, any[]>, slot: any) => {
    if (!acc[slot.meal_period]) acc[slot.meal_period] = [];
    acc[slot.meal_period].push(slot);
    return acc;
  }, {}) || {};

  // Determine empty state message
  const hasConfiguredSlots = allSlotsForDate && allSlotsForDate.length > 0;
  const hasAvailableSlots = Object.keys(slotsByPeriod).length > 0;

  return (
    <GuestPageShell>
    <motion.div 
      className="space-y-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <MobilePageHeader
        title={t('dining.title')}
        subtitle={t('dining.subtitle')}
        showBack={false}
        actions={
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors h-10 w-10 flex items-center justify-center">
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[250px]">
                <p>{t('dining.noRestaurantsDescription')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        }
      />

      {/* Restaurant Filter */}
      <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
        <SelectTrigger className="h-12">
          <div className="flex items-center gap-2">
            <Utensils className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="All Restaurants" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Restaurants</SelectItem>
          {restaurants?.map((r: any) => (
            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Compact Date Picker */}
      <GuestDatePicker
        value={selectedDate}
        onChange={setSelectedDate}
        minDate={guest.checkInDate}
        maxDate={guest.checkOutDate}
        compact={true}
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <p className="text-sm text-center text-muted-foreground">{t('common.loading')}</p>
        </div>
      ) : !hasAvailableSlots ? (
        <Card className="guest-card border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted/60 p-4 mb-4">
              {hasConfiguredSlots ? (
                slotsArePastCutoff ? (
                  <Clock className="h-12 w-12 text-muted-foreground/40" />
                ) : (
                  <Users className="h-12 w-12 text-muted-foreground/40" />
                )
              ) : (
                <CalendarX className="h-12 w-12 text-muted-foreground/40" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {hasConfiguredSlots 
                ? slotsArePastCutoff 
                  ? t('errors.cutoffPassed') 
                  : t('dining.fullyBooked')
                : t('dining.noRestaurants')}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-5">
              {hasConfiguredSlots 
                ? slotsArePastCutoff
                  ? t('dining.cutoffDescription')
                  : t('dining.fullyBookedDescription')
                : t('dining.noRestaurantsDescription')}
            </p>
            <Button variant="outline" size="default" className="gap-2 tap-target">
              <Phone className="h-4 w-4" />
              {t('profile.help')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {MEAL_PERIOD_ORDER.filter(p => slotsByPeriod[p]).map((period) => {
            const periodConfig = mealPeriodConfig[period] || mealPeriodConfig.DINNER;
            const PeriodIcon = periodConfig.icon;
            
            return (
              <div key={period}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn("p-1.5 rounded-lg", periodConfig.bgClass)}>
                    <PeriodIcon className={cn("h-4 w-4", periodConfig.colorClass)} />
                  </div>
                  <h2 className={cn("font-semibold", periodConfig.colorClass)}>{periodConfig.label}</h2>
                </div>
                <div className="space-y-3">
                  {slotsByPeriod[period].map((slot: any) => {
                    const remaining = slot.remaining_covers;
                    const isLowAvailability = remaining > 0 && remaining <= 4;
                    const isScarce = remaining > 0 && remaining <= 2;
                    
                    // Availability label logic
                    const getAvailabilityLabel = () => {
                      if (remaining <= 0) return t('dining.fullyBooked');
                      if (isScarce) return `${remaining} ${t('dining.tablesLeft')}`;
                      if (isLowAvailability) return `${t('dining.fillingFast')} • ${remaining} ${t('common.left')}`;
                      return `${remaining} ${t('common.available')}`;
                    };
                    
                    return (
                      <Card
                        key={slot.id}
                        className="guest-card-interactive"
                        onClick={() => navigate(`/guest/restaurants/book/${slot.id}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {/* Restaurant Icon with colored background */}
                            <div className={cn(
                              "flex h-12 w-12 items-center justify-center rounded-xl shrink-0",
                              periodConfig.bgClass
                            )}>
                              <IconRestaurants className={cn("h-6 w-6", periodConfig.colorClass)} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className={cn("font-mono font-semibold text-sm", periodConfig.colorClass)}>
                                  {slot.start_time?.slice(0, 5)}
                                </span>
                                {slot.requires_approval ? (
                                  <Badge variant="pending" className="text-xs">
                                    <Sparkles className="h-3 w-3 mr-1" />{t('common.request')}
                                  </Badge>
                                ) : (
                                  <Badge variant="confirmed" className="text-xs">{t('common.instant')}</Badge>
                                )}
                              </div>
                              <h3 className="font-semibold text-foreground mb-1.5 truncate">{slot.restaurant_name}</h3>
                              <div className="flex items-center justify-between">
                                <span className={cn(
                                  "flex items-center gap-1.5 text-sm",
                                  isScarce ? 'text-coral font-semibold' : 
                                  isLowAvailability ? 'text-warning font-medium' : 
                                  'text-muted-foreground'
                                )}>
                                  <Users className="h-3.5 w-3.5" />
                                  {getAvailabilityLabel()}
                                </span>
                                <ChevronRight className={cn("h-5 w-5", periodConfig.colorClass)} />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
    </GuestPageShell>
  );
}
