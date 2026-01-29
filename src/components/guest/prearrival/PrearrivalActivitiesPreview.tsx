import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format, parseISO, eachDayOfInterval, addDays } from 'date-fns';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ChevronRight, Calendar } from 'lucide-react';
import { IconActivities } from '@/components/icons/ProperaIcons';
import { CategoryIcon } from '@/components/ui/category-badge';
import { cn } from '@/lib/utils';

interface ActivitySession {
  id: string;
  activity_name: string;
  category: string;
  start_time: string;
  end_time: string;
  remaining_spots: number;
  duration_minutes: number | null;
}

export function PrearrivalActivitiesPreview() {
  const { guest } = useGuestAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Generate day chips for stay dates
  const stayDays = guest ? eachDayOfInterval({
    start: parseISO(guest.checkInDate),
    end: parseISO(guest.checkOutDate),
  }) : [];

  const [selectedDate, setSelectedDate] = useState<string>(
    guest?.checkInDate || new Date().toISOString().split('T')[0]
  );

  // Fetch available activities for selected date
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['prearrival-activities', guest?.resortId, selectedDate],
    queryFn: async () => {
      if (!guest) return [];

      const { data, error } = await supabase.rpc('guest_get_available_sessions', {
        p_guest_id: guest.guestId,
        p_date: selectedDate,
        p_category: null,
      });

      if (error) {
        console.error('Error fetching sessions:', error);
        return [];
      }

      return (data || []).slice(0, 4) as ActivitySession[];
    },
    enabled: !!guest && !!selectedDate,
    staleTime: 60000,
  });

  if (!guest) return null;

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour}:${minutes} ${suffix}`;
  };

  return (
    <Card className="guest-card overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <IconActivities className="h-5 w-5 text-primary" />
            {t('prearrival.planActivities', 'Plan your activities')}
          </CardTitle>
          <Link to="/guest/activities">
            <Button variant="ghost" size="sm" className="text-xs">
              {t('common.seeAll', 'See all')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Day Chips */}
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {stayDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === new Date().toISOString().split('T')[0];
              
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={cn(
                    'flex flex-col items-center px-3 py-2 rounded-lg min-w-[56px] transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 hover:bg-muted text-foreground'
                  )}
                >
                  <span className="text-[10px] uppercase font-medium opacity-70">
                    {format(day, 'EEE')}
                  </span>
                  <span className="text-lg font-bold">
                    {format(day, 'd')}
                  </span>
                  {isToday && (
                    <span className="text-[9px] font-medium">Today</span>
                  )}
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Activity List */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : sessions && sessions.length > 0 ? (
          <div className="space-y-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => navigate(`/guest/activities/book/${session.id}`)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <CategoryIcon category={session.category} className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{session.activity_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatTime(session.start_time)}</span>
                    {session.duration_minutes && (
                      <>
                        <span>•</span>
                        <span>{session.duration_minutes} min</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {session.remaining_spots > 0 ? (
                    <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                      {session.remaining_spots} spots
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Full
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {t('prearrival.noActivitiesOnDate', 'No activities available on this date')}
            </p>
            <Button
              variant="link"
              size="sm"
              className="mt-2"
              onClick={() => navigate('/guest/activities')}
            >
              Browse all dates
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
