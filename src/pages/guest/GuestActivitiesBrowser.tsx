import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, addDays } from 'date-fns';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, Users, ChevronRight, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

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

  const { data: sessions, isLoading } = useQuery({
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

  if (!guest) return null;

  const minDate = guest.checkInDate;
  const maxDate = guest.checkOutDate;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Activities</h1>
        <p className="text-sm text-muted-foreground">Discover experiences for your stay</p>
      </div>

      <div className="flex items-center gap-3">
        <Calendar className="h-5 w-5 text-primary shrink-0" />
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          min={minDate}
          max={maxDate}
          className="flex-1"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-thin">
        {categories.map((cat) => (
          <Button
            key={cat.value}
            variant={selectedCategory === cat.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat.value)}
            className={cn("shrink-0 rounded-full", selectedCategory === cat.value && "shadow-sm")}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : sessions?.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No activities available"
          description="Try a different date or category"
        />
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
                    {session.requires_approval && (
                      <Badge variant="pending" className="text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />Request
                      </Badge>
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
