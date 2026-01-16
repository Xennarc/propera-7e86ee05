import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GuestDatePicker } from '@/components/ui/guest-date-picker';
import { 
  Calendar, 
  Clock, 
  Users, 
  ChevronRight, 
  Sparkles, 
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCategoryConfig, coreActivityCategories, ActivityCategoryKey } from '@/lib/activity-category-config';

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
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);
  
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

  // Track scroll for header collapse
  useEffect(() => {
    const handleScroll = () => {
      setIsHeaderCompact(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    <div className="space-y-4">
      {/* Collapsible Sticky Header */}
      <div className={cn(
        "guest-sticky-header",
        isHeaderCompact && "is-compact"
      )}>
        <div className={cn(
          "transition-all duration-200",
          isHeaderCompact ? "flex items-center justify-between" : "mb-3"
        )}>
          <div>
            <h1 className={cn(
              "font-bold text-foreground transition-all",
              isHeaderCompact ? "text-base" : "text-xl"
            )}>
              {isHeaderCompact ? "Activities" : "Available Sessions"}
            </h1>
            {!isHeaderCompact && (
              <p className="text-sm text-muted-foreground">Book activities during your stay</p>
            )}
          </div>
          {isHeaderCompact && (
            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
              {format(new Date(selectedDate), 'EEE, MMM d')}
            </span>
          )}
        </div>
        
        {/* Category Chips - always visible in dedicated row */}
        <div className="guest-chip-row mt-2">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all tap-target border",
                selectedCategory === cat.value 
                  ? "bg-primary text-primary-foreground border-primary shadow-sm ring-1 ring-primary/30" 
                  : "bg-card text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground hover:border-border"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Compact Date Picker */}
      <GuestDatePicker
        value={selectedDate}
        onChange={setSelectedDate}
        minDate={minDate}
        maxDate={maxDate}
        compact={true}
      />

      {/* Loading State with Premium Skeletons */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="guest-card-surface animate-pulse">
              <div className="flex">
                <div className="w-[72px] h-[72px] bg-muted rounded-l-2xl" />
                <div className="flex-1 p-3 space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 w-2/3 bg-muted rounded" />
                    <div className="h-4 w-14 bg-muted rounded-full" />
                  </div>
                  <div className="h-3 w-1/2 bg-muted rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="guest-card-surface border-dashed">
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
              <HelpCircle className="h-8 w-8 text-destructive/50" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Unable to load sessions</h3>
            <p className="text-sm text-muted-foreground max-w-[200px]">
              Please try again or contact the front desk
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && sessions?.length === 0 && (
        <div className="guest-card-surface border-dashed">
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">No sessions available</h3>
            <p className="text-sm text-muted-foreground max-w-[200px]">
              Try selecting another date to find activities
            </p>
          </div>
        </div>
      )}

      {/* Session Cards - Improved Mobile Layout */}
      {!isLoading && !isError && sessions && sessions.length > 0 && (
        <div className="space-y-3">
          {sessions.map((session: any) => {
            const spotsLeft = session.remaining_spots;
            const isLowAvailability = spotsLeft > 0 && spotsLeft <= 3;
            const config = getCategoryConfig(session.category);
            
            return (
              <Card
                key={session.id}
                className="guest-card-interactive overflow-hidden"
                onClick={() => navigate(`/guest/activities/book/${session.id}`)}
              >
                <CardContent className="p-0">
                  <div className="flex">
                    {/* Time Block - prominent left side */}
                    <div className={cn(
                      "flex flex-col items-center justify-center px-4 py-3 min-w-[72px]",
                      config.bgClass
                    )}>
                      <span className="text-lg font-bold text-foreground">
                        {session.start_time?.slice(0, 5)}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium uppercase">
                        {parseInt(session.start_time?.slice(0, 2) || '0') < 12 ? 'AM' : 'PM'}
                      </span>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 p-3 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="font-semibold text-foreground line-clamp-2 text-sm leading-tight">
                          {session.activity_name}
                        </h3>
                        {/* Status Pill */}
                        <span className={cn(
                          "shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase",
                          session.requires_approval 
                            ? "bg-warning/15 text-warning" 
                            : "bg-success/15 text-success"
                        )}>
                          {session.requires_approval ? 'Request' : 'Instant'}
                        </span>
                      </div>
                      
                      {/* Meta row */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {session.duration_minutes}min
                        </span>
                        <span className={cn(
                          "flex items-center gap-1",
                          isLowAvailability && spotsLeft > 0 && "text-warning font-medium",
                          spotsLeft === 0 && "text-destructive"
                        )}>
                          <Users className="h-3 w-3" />
                          {spotsLeft > 0 ? `${spotsLeft} spots` : 'Full'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Chevron */}
                    <div className="flex items-center pr-3">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
