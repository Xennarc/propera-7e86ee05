import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GuestDatePicker } from '@/components/ui/guest-date-picker';
import { 
  Calendar, 
  Clock, 
  Users, 
  ChevronRight, 
  Sparkles, 
  HelpCircle,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CategoryBadge, CategoryChip, CategoryIcon } from '@/components/ui/category-badge';
import { coreActivityCategories, ActivityCategoryKey, getCategoryConfig } from '@/lib/activity-category-config';

const categories: Array<{ value: ActivityCategoryKey | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  ...coreActivityCategories.map(cat => ({ 
    value: cat, 
    label: cat === 'DIVE' ? 'Diving' : cat === 'EXCURSION' ? 'Excursions' : cat === 'WATERSPORT' ? 'Watersports' : cat === 'SPA' ? 'Spa' : 'Other'
  })),
];

export default function GuestActivitySessionsPage() {
  const { guest } = useGuestAuth();
  const navigate = useNavigate();
  
  // Default to today, but clamp to guest's stay dates
  const getInitialDate = () => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    if (guest) {
      if (todayStr < guest.checkInDate) return guest.checkInDate;
      if (todayStr > guest.checkOutDate) return guest.checkInDate;
    }
    return todayStr;
  };
  
  const [selectedDate, setSelectedDate] = useState(getInitialDate);
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

  if (!guest) return null;

  const minDate = guest.checkInDate;
  const maxDate = guest.checkOutDate;

  return (
    <div className="space-y-5">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/guest/activities')}
          className="shrink-0 h-9 w-9"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Available Sessions</h1>
          <p className="text-sm text-muted-foreground">Book activities during your stay</p>
        </div>
      </div>

      {/* Category Pills with Icons */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-thin">
        {categories.map((cat) => (
          <CategoryChip
            key={cat.value}
            category={cat.value}
            label={cat.label}
            isActive={selectedCategory === cat.value}
            onClick={() => setSelectedCategory(cat.value)}
          />
        ))}
      </div>

      {/* Date Picker with Month Navigation */}
      <GuestDatePicker
        value={selectedDate}
        onChange={setSelectedDate}
        minDate={minDate}
        maxDate={maxDate}
        hint="Select a date to see available sessions"
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <p className="text-sm text-center text-muted-foreground">Loading sessions...</p>
        </div>
      ) : isError ? (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-destructive/10 p-4 mb-4">
              <HelpCircle className="h-10 w-10 text-destructive/50" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Unable to load sessions</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">
              We couldn't load the available sessions. Please try again.
            </p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
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
            <h3 className="font-semibold text-foreground mb-2">No sessions available</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">
              There are no activity sessions scheduled for this date. Try selecting another day.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions?.map((session: any) => {
            const spotsLeft = session.remaining_spots;
            const isLowAvailability = spotsLeft > 0 && spotsLeft <= 3;
            const config = getCategoryConfig(session.category);
            
            return (
              <Card
                key={session.id}
                className={cn(
                  "hover:shadow-card-hover transition-all cursor-pointer overflow-hidden",
                  `hover:${config.borderClass}`
                )}
                onClick={() => navigate(`/guest/activities/book/${session.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Category Icon with colored background */}
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl shrink-0",
                      config.bgClass
                    )}>
                      <CategoryIcon category={session.category} size={24} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={cn("font-mono font-semibold text-sm", config.colorClass)}>
                            {session.start_time?.slice(0, 5)}
                          </span>
                          {session.date && session.date !== selectedDate && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(session.date), 'MMM d')}
                            </span>
                          )}
                          <CategoryBadge category={session.category} size="sm" showLabel={false} />
                        </div>
                        {session.requires_approval ? (
                          <Badge variant="pending" className="text-xs">
                            <Sparkles className="h-3 w-3 mr-1" />Request
                          </Badge>
                        ) : (
                          <Badge variant="confirmed" className="text-xs">Instant</Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-foreground mb-1 truncate">{session.activity_name}</h3>
                      {session.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{session.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-sm">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {session.duration_minutes}min
                          </span>
                          <span className={cn(
                            "flex items-center gap-1",
                            isLowAvailability ? 'text-coral font-medium' : 'text-muted-foreground'
                          )}>
                            <Users className="h-3.5 w-3.5" />
                            {spotsLeft} left
                          </span>
                        </div>
                        <ChevronRight className={cn("h-5 w-5", config.colorClass)} />
                      </div>
                    </div>
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
