import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Users,
  UtensilsCrossed,
  Activity,
  Plane,
  ArrowRight,
  AlertCircle,
  Plus,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
} from 'lucide-react';

interface TodayHubProps {
  className?: string;
}

export function TodayHub({ className }: TodayHubProps) {
  const { currentResort } = useResort();
  const navigate = useNavigate();

  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch all data in one query batch
  const { data, isLoading } = useQuery({
    queryKey: ['today-hub', currentResort?.id, today],
    queryFn: async () => {
      if (!currentResort) return null;

      const [guestsRes, sessionsRes, diningRes, flagsRes] = await Promise.all([
        // Guests: arrivals, departures, in-house
        supabase
          .from('guests')
          .select('id, full_name, room_number, is_vip, check_in_date, check_out_date')
          .eq('resort_id', currentResort.id)
          .or(`check_in_date.eq.${today},check_out_date.eq.${today}`)
          .limit(20),
        
        // Sessions today
        supabase
          .from('activity_sessions')
          .select(`
            id, start_time, end_time, capacity, status,
            activity:activities(name)
          `)
          .eq('resort_id', currentResort.id)
          .eq('date', today)
          .eq('status', 'SCHEDULED')
          .order('start_time')
          .limit(6),
        
        // Dining slots today
        supabase
          .from('restaurant_time_slots')
          .select(`
            id, start_time, end_time, capacity, meal_period, status,
            restaurant:restaurants(name)
          `)
          .eq('resort_id', currentResort.id)
          .eq('date', today)
          .eq('status', 'OPEN')
          .order('start_time')
          .limit(6),
        
        // Flags: VIPs, special occasions
        supabase
          .from('guests')
          .select('id, full_name, room_number, is_vip')
          .eq('resort_id', currentResort.id)
          .eq('is_vip', true)
          .lte('check_in_date', today)
          .gte('check_out_date', today)
          .limit(5),
      ]);

      const guests = guestsRes.data || [];
      const arrivals = guests.filter(g => g.check_in_date === today);
      const departures = guests.filter(g => g.check_out_date === today);

      return {
        arrivals,
        departures,
        sessions: sessionsRes.data || [],
        diningSlots: diningRes.data || [],
        vipGuests: flagsRes.data || [],
      };
    },
    enabled: !!currentResort,
    staleTime: 60000, // 1 minute
  });

  if (!currentResort) {
    return (
      <div className={cn('flex items-center justify-center py-16', className)}>
        <div className="text-center">
          <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Select a resort to view operations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-8', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM d')}
          </p>
          <h1 className="text-2xl font-semibold text-foreground mt-1">
            {currentResort.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/staff/restaurants/slots/new">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Slot
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/staff/activities/sessions/new">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Session
            </Link>
          </Button>
        </div>
      </div>

      {/* 4-column grid on desktop, 2 on tablet, 1 on mobile */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Section 1: Arrivals */}
        <Section
          title="Arrivals"
          icon={ArrowUpRight}
          iconColor="text-success"
          count={data?.arrivals.length}
          loading={isLoading}
          viewAllLink="/staff/guests?filter=arrivals"
        >
          {data?.arrivals.length === 0 ? (
            <EmptyMessage>No arrivals today</EmptyMessage>
          ) : (
            <div className="space-y-1.5">
              {data?.arrivals.slice(0, 5).map((guest: any) => (
                <Link
                  key={guest.id}
                  to={`/staff/guests/${guest.id}`}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors group"
                >
                  <span className="text-xs font-mono text-muted-foreground w-8">{guest.room_number}</span>
                  <span className="text-sm truncate flex-1">{guest.full_name}</span>
                  {guest.is_vip && <Badge variant="default" className="text-2xs shrink-0">VIP</Badge>}
                </Link>
              ))}
            </div>
          )}
        </Section>

        {/* Section 2: Sessions */}
        <Section
          title="Sessions"
          icon={Activity}
          iconColor="text-primary"
          count={data?.sessions.length}
          loading={isLoading}
          viewAllLink="/staff/activities/sessions"
        >
          {data?.sessions.length === 0 ? (
            <EmptyMessage>No sessions scheduled</EmptyMessage>
          ) : (
            <div className="space-y-1.5">
              {data?.sessions.map((session: any) => (
                <Link
                  key={session.id}
                  to={`/staff/activities/sessions/${session.id}`}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <span className="text-xs text-muted-foreground w-12">{session.start_time.slice(0, 5)}</span>
                  <span className="text-sm truncate flex-1">{session.activity?.name}</span>
                </Link>
              ))}
            </div>
          )}
        </Section>

        {/* Section 3: Dining */}
        <Section
          title="Dining"
          icon={UtensilsCrossed}
          iconColor="text-orange-500"
          count={data?.diningSlots.length}
          loading={isLoading}
          viewAllLink="/staff/restaurants/slots"
        >
          {data?.diningSlots.length === 0 ? (
            <EmptyMessage>No dining slots open</EmptyMessage>
          ) : (
            <div className="space-y-1.5">
              {data?.diningSlots.map((slot: any) => (
                <Link
                  key={slot.id}
                  to={`/staff/restaurants/slots/${slot.id}`}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <span className="text-xs text-muted-foreground w-12">{slot.start_time.slice(0, 5)}</span>
                  <span className="text-sm truncate flex-1">{slot.restaurant?.name}</span>
                  <Badge variant="outline" className="text-2xs shrink-0">{slot.meal_period}</Badge>
                </Link>
              ))}
            </div>
          )}
        </Section>

        {/* Section 4: Flags */}
        <Section
          title="Flags"
          icon={AlertTriangle}
          iconColor="text-warning"
          count={data?.vipGuests.length}
          loading={isLoading}
          viewAllLink="/staff/guests"
        >
          {data?.vipGuests.length === 0 ? (
            <EmptyMessage>No special flags</EmptyMessage>
          ) : (
            <div className="space-y-1.5">
              {data?.vipGuests.map((guest: any) => (
                <Link
                  key={guest.id}
                  to={`/staff/guests/${guest.id}`}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <span className="text-xs font-mono text-muted-foreground w-8">{guest.room_number}</span>
                  <span className="text-sm truncate flex-1">{guest.full_name}</span>
                  <Badge variant="default" className="text-2xs shrink-0">VIP</Badge>
                </Link>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Departures row */}
      {(data?.departures.length ?? 0) > 0 && (
        <Section
          title="Departures"
          icon={ArrowDownRight}
          iconColor="text-muted-foreground"
          count={data?.departures.length}
          loading={isLoading}
          viewAllLink="/staff/guests?filter=departures"
          horizontal
        >
          <div className="flex flex-wrap gap-2">
            {data?.departures.slice(0, 8).map((guest: any) => (
              <Link
                key={guest.id}
                to={`/staff/guests/${guest.id}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 hover:bg-muted text-sm transition-colors"
              >
                <span className="font-mono text-xs text-muted-foreground">{guest.room_number}</span>
                <span className="truncate max-w-[120px]">{guest.full_name}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// Section component
interface SectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  count?: number;
  loading?: boolean;
  viewAllLink?: string;
  children: React.ReactNode;
  horizontal?: boolean;
}

function Section({ title, icon: Icon, iconColor, count, loading, viewAllLink, children, horizontal }: SectionProps) {
  return (
    <div className={cn(horizontal && 'lg:col-span-4')}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', iconColor || 'text-muted-foreground')} />
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
          {typeof count === 'number' && (
            <span className="text-xs text-muted-foreground">({count})</span>
          )}
        </div>
        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className="min-h-[100px]">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function EmptyMessage({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-muted-foreground py-4 text-center">{children}</p>
  );
}
