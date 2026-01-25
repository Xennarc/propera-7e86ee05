import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Calendar, Utensils, Users, TrendingUp, AlertCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GlanceMetric {
  label: string;
  value: number | string;
  subValue?: string;
  icon: React.ReactNode;
  href: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  alert?: string;
}

export function TodayAtAGlance() {
  const { currentResort } = useResort();
  const today = new Date().toISOString().split('T')[0];

  const { data, isLoading } = useQuery({
    queryKey: ['today-at-a-glance', currentResort?.id, today],
    queryFn: async () => {
      if (!currentResort) return null;

      // Fetch today's activity sessions with booking counts
      const { data: sessions } = await supabase
        .from('activity_sessions')
        .select('id, capacity, status')
        .eq('resort_id', currentResort.id)
        .eq('date', today)
        .eq('status', 'SCHEDULED');

      let totalActivityPax = 0;
      let totalActivityCapacity = 0;
      let fullyBookedActivities = 0;

      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id);
        const { data: bookings } = await supabase
          .from('activity_bookings')
          .select('session_id, num_adults, num_children')
          .in('session_id', sessionIds)
          .eq('status', 'CONFIRMED');

        // Calculate per-session stats
        const sessionPax: Record<string, number> = {};
        bookings?.forEach(b => {
          const pax = (b.num_adults || 0) + (b.num_children || 0);
          sessionPax[b.session_id] = (sessionPax[b.session_id] || 0) + pax;
        });

        sessions.forEach(s => {
          const pax = sessionPax[s.id] || 0;
          totalActivityPax += pax;
          totalActivityCapacity += s.capacity;
          if (pax >= s.capacity) fullyBookedActivities++;
        });
      }

      // Fetch today's restaurant slots with reservation counts
      const { data: slots } = await supabase
        .from('restaurant_time_slots')
        .select('id, capacity, status')
        .eq('resort_id', currentResort.id)
        .eq('date', today)
        .eq('status', 'OPEN');

      let totalDiningCovers = 0;
      let totalDiningCapacity = 0;
      let fullyBookedSlots = 0;

      if (slots && slots.length > 0) {
        const slotIds = slots.map(s => s.id);
        const { data: reservations } = await supabase
          .from('restaurant_reservations')
          .select('restaurant_slot_id, num_adults, num_children')
          .in('restaurant_slot_id', slotIds)
          .eq('status', 'CONFIRMED');

        // Calculate per-slot stats
        const slotCovers: Record<string, number> = {};
        reservations?.forEach(r => {
          const covers = (r.num_adults || 0) + (r.num_children || 0);
          slotCovers[r.restaurant_slot_id] = (slotCovers[r.restaurant_slot_id] || 0) + covers;
        });

        slots.forEach(s => {
          const covers = slotCovers[s.id] || 0;
          totalDiningCovers += covers;
          totalDiningCapacity += s.capacity;
          if (covers >= s.capacity) fullyBookedSlots++;
        });
      }

      // Guests in house
      const { count: guestsInHouse } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .eq('resort_id', currentResort.id)
        .lte('check_in_date', today)
        .gte('check_out_date', today);

      return {
        activitySessions: sessions?.length || 0,
        activityPax: totalActivityPax,
        activityCapacity: totalActivityCapacity,
        fullyBookedActivities,
        diningSlots: slots?.length || 0,
        diningCovers: totalDiningCovers,
        diningCapacity: totalDiningCapacity,
        fullyBookedSlots,
        guestsInHouse: guestsInHouse || 0,
      };
    },
    enabled: !!currentResort,
    staleTime: 60000, // 1 minute
  });

  if (!currentResort) return null;

  const metrics: GlanceMetric[] = data ? [
    {
      label: 'Activity Sessions',
      value: data.activitySessions,
      subValue: `${data.activityPax} pax booked`,
      icon: <Calendar className="h-5 w-5" />,
      href: `/staff/activities/sessions?date=${today}`,
      variant: data.fullyBookedActivities > 0 ? 'warning' : 'default',
      alert: data.fullyBookedActivities > 0 ? `${data.fullyBookedActivities} full` : undefined,
    },
    {
      label: 'Dining Covers',
      value: data.diningCovers,
      subValue: `across ${data.diningSlots} slots`,
      icon: <Utensils className="h-5 w-5" />,
      href: `/staff/restaurants/slots?date=${today}`,
      variant: data.fullyBookedSlots > 0 ? 'warning' : 'default',
      alert: data.fullyBookedSlots > 0 ? `${data.fullyBookedSlots} full` : undefined,
    },
    {
      label: 'Guests In-House',
      value: data.guestsInHouse,
      subValue: 'currently staying',
      icon: <Users className="h-5 w-5" />,
      href: '/staff/guests',
      variant: 'default',
    },
  ] : [];

  const variantStyles = {
    default: 'bg-muted/50 text-muted-foreground',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-destructive/10 text-destructive',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Today at a Glance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          // Mobile: 1 column, sm: 3 columns
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-28 sm:h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          // Mobile: 1 column for easier reading, sm: 3 columns
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            {metrics.map((metric) => (
              <Link
                key={metric.label}
                to={metric.href}
                className={cn(
                  // Larger padding on mobile for touch
                  'group relative p-5 sm:p-4 rounded-xl border border-border/50 bg-card transition-all duration-200',
                  'hover:border-primary/30 hover:shadow-md hover:bg-primary/5',
                  'active:scale-[0.98]'
                )}
              >
                <div className="flex items-start justify-between mb-3 sm:mb-2">
                  <div className={cn(
                    // Larger icon container on mobile
                    'flex h-12 w-12 sm:h-10 sm:w-10 items-center justify-center rounded-lg',
                    variantStyles[metric.variant || 'default']
                  )}>
                    {React.cloneElement(metric.icon as React.ReactElement, {
                      className: 'h-6 w-6 sm:h-5 sm:w-5'
                    })}
                  </div>
                  <ChevronRight className="h-5 w-5 sm:h-4 sm:w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-2xl font-bold text-foreground">
                      {metric.value}
                    </span>
                    {metric.alert && (
                      // Minimum 11px text for mobile readability
                      <Badge variant="secondary" className="text-[11px] bg-warning/10 text-warning border-warning/20">
                        <AlertCircle className="h-3.5 w-3.5 mr-1" />
                        {metric.alert}
                      </Badge>
                    )}
                  </div>
                  <p className="text-base sm:text-sm font-medium text-foreground">{metric.label}</p>
                  {metric.subValue && (
                    <p className="text-sm sm:text-xs text-muted-foreground">{metric.subValue}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
