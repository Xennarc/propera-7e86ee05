import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, ChevronRight, Sparkles, HelpCircle, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { GuestDatePicker } from '@/components/ui/guest-date-picker';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const categories = [
  { value: 'all', label: 'All' },
  { value: 'DIVE', label: 'Diving' },
  { value: 'EXCURSION', label: 'Excursions' },
  { value: 'WATERSPORT', label: 'Watersports' },
  { value: 'SPA', label: 'Spa' },
  { value: 'OTHER', label: 'Other' },
];

export default function GuestActivitiesBrowser() {
  const { guest } = useGuestAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { data: sessions, isLoading, isError } = useQuery({
    queryKey: ['guest-available-sessions', guest?.guestId, selectedDate, selectedCategory],
    queryFn: async () => {
      if (!guest) return [];
      const { data, error } = await supabase.rpc('guest_get_available_sessions', {
        p_guest_id: guest.guestId,
        p_date: selectedDate,
        p_category: selectedCategory === 'all' ? null : selectedCategory as any,
      });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!guest,
  });

  // Check if resort has any activities defined at all
  const { data: activitiesExist } = useQuery({
    queryKey: ['guest-activities-exist', guest?.resortId],
    queryFn: async () => {
      if (!guest) return false;
      const { count, error } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('resort_id', guest.resortId)
        .eq('is_active', true);
      if (error) return false;
      return (count ?? 0) > 0;
    },
    enabled: !!guest,
  });

  if (!guest) return null;

  const minDate = guest.checkInDate;
  const maxDate = guest.checkOutDate;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-foreground">Activities</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[250px]">
                <p>Activities only appear on dates with available sessions. If you don't see an activity, it may not be scheduled yet.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-sm text-muted-foreground">Discover experiences for your stay</p>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-thin">
        {categories.map((cat) => (
          <Button
            key={cat.value}
            variant={selectedCategory === cat.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat.value)}
            className={cn("shrink-0 rounded-full h-10 px-4", selectedCategory === cat.value && "shadow-sm")}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Date Picker with Month Navigation */}
      <GuestDatePicker
        value={selectedDate}
        onChange={setSelectedDate}
        minDate={minDate}
        maxDate={maxDate}
        hint="Select a date to see available activities"
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <p className="text-sm text-center text-muted-foreground">Loading activities...</p>
        </div>
      ) : isError ? (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-destructive/10 p-4 mb-4">
              <HelpCircle className="h-10 w-10 text-destructive/50" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Unable to load activities</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">
              We couldn't load the available activities. Please try again or contact your concierge for assistance.
            </p>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : sessions?.length === 0 ? (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Calendar className="h-10 w-10 text-muted-foreground/50" />
            </div>
            {activitiesExist === false ? (
              <>
                <h3 className="font-semibold text-foreground mb-2">Activities coming soon</h3>
                <p className="text-sm text-muted-foreground max-w-xs mb-4">
                  This resort hasn't added any activities yet. Please check back later or contact your concierge for more information.
                </p>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-foreground mb-2">No sessions available</h3>
                <p className="text-sm text-muted-foreground max-w-xs mb-4">
                  There are no activity sessions scheduled for this date. Please try selecting another day or contact your concierge for assistance.
                </p>
              </>
            )}
            <Button variant="outline" size="sm" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              Contact Concierge
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions?.map((session: any) => {
            const spotsLeft = session.remaining_spots;
            const isLowAvailability = spotsLeft > 0 && spotsLeft <= 3;
            
            return (
              <Card
                key={session.session_id}
                className="hover:shadow-card-hover hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => navigate(`/guest/activities/book/${session.session_id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="font-mono font-medium">{session.start_time?.slice(0, 5)}</span>
                      <Badge variant="outline" className="text-xs">{session.category}</Badge>
                    </div>
                    {session.requires_approval ? (
                      <Badge variant="pending" className="text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />On request
                      </Badge>
                    ) : (
                      <Badge variant="confirmed" className="text-xs">Instant</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{session.activity_name}</h3>
                  {session.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{session.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span className={isLowAvailability ? 'text-warning font-medium' : ''}>
                        {spotsLeft} spots left
                      </span>
                    </span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
