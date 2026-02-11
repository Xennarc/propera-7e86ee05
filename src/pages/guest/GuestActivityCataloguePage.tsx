import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { GUEST_ROUTES } from '@/routes/guestRoutes';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Activity, DifficultyLevel } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Clock, 
  ChevronRight, 
  Users, 
  Calendar,
  Sparkles,
  Filter,
  Waves,
  Star,
} from 'lucide-react';
import { getCategoryConfig, coreActivityCategories, ActivityCategoryKey } from '@/lib/activity-category-config';
import { CategoryChip, CategoryIcon } from '@/components/ui/category-badge';
import { cn } from '@/lib/utils';

const difficultyColors: Record<DifficultyLevel, string> = {
  EASY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  MODERATE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  ADVANCED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

const difficultyLabels: Record<DifficultyLevel, string> = {
  EASY: 'Easy',
  MODERATE: 'Moderate',
  ADVANCED: 'Advanced',
};

const categories: Array<{ value: ActivityCategoryKey | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  ...coreActivityCategories.map(cat => ({ 
    value: cat, 
    label: cat === 'DIVE' ? 'Diving' : cat === 'EXCURSION' ? 'Excursions' : cat === 'WATERSPORT' ? 'Watersports' : cat === 'SPA' ? 'Spa' : 'Other'
  })),
];

export default function GuestActivityCataloguePage() {
  const navigate = useNavigate();
  const { guest } = useGuestAuth();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'events'>('all');

  // Fetch all activities for the resort using secure RPC (resort-scoped, no cross-tenant leakage)
  const { data: activities, isLoading } = useQuery({
    queryKey: ['guest-activity-catalogue', guest?.resortId],
    queryFn: async () => {
      if (!guest) return [];
      
      const { data, error } = await supabase
        .rpc('guest_get_activity_details', { p_resort_id: guest.resortId });

      if (error) throw error;
      
      // Sort client-side since RPC doesn't support ordering
      return (data || []).sort((a: any, b: any) => {
        const catCompare = (a.category || '').localeCompare(b.category || '');
        if (catCompare !== 0) return catCompare;
        return (a.name || '').localeCompare(b.name || '');
      }) as Activity[];
    },
    enabled: !!guest,
  });

  // Fetch upcoming sessions to identify special events (one-off sessions)
  const { data: upcomingSessions } = useQuery({
    queryKey: ['guest-upcoming-sessions', guest?.guestId, guest?.checkInDate, guest?.checkOutDate],
    queryFn: async () => {
      if (!guest) return [];
      const today = new Date().toISOString().split('T')[0];
      const startDate = guest.checkInDate > today ? guest.checkInDate : today;
      
      // Use secure RPC to fetch activities (resort-scoped)
      const { data: activities, error: activitiesError } = await supabase
        .rpc('guest_get_activity_details', { p_resort_id: guest.resortId });
      
      if (activitiesError) throw activitiesError;
      if (!activities || activities.length === 0) return [];
      
      const activityIds = activities.map((a: any) => a.id);
      const activitiesMap = new Map(activities.map((a: any) => [a.id, a]));
      
      // Query sessions for these activities
      const { data: sessions, error } = await supabase
        .from('activity_sessions')
        .select('id, date, start_time, end_time, capacity, notes, status, activity_id')
        .in('activity_id', activityIds)
        .eq('status', 'SCHEDULED')
        .gte('date', startDate)
        .lte('date', guest.checkOutDate)
        .order('date')
        .order('start_time');

      if (error) throw error;
      
      // Fetch bookings to calculate remaining spots
      const sessionIds = sessions?.map(s => s.id) || [];
      if (sessionIds.length === 0) return [];
      
      const { data: bookings } = await supabase
        .from('activity_bookings')
        .select('session_id, num_adults, num_children')
        .in('session_id', sessionIds)
        .in('status', ['CONFIRMED', 'PENDING']);
      
      const bookedCounts: Record<string, number> = {};
      bookings?.forEach(b => {
        bookedCounts[b.session_id] = (bookedCounts[b.session_id] || 0) + b.num_adults + b.num_children;
      });
      
      return (sessions || []).map(s => {
        const activity = activitiesMap.get(s.activity_id);
        return {
          id: s.id,
          date: s.date,
          start_time: s.start_time,
          notes: s.notes,
          activity_name: activity?.name || 'Unknown Activity',
          category: activity?.category,
          requires_approval: activity?.requires_approval,
          remaining_spots: s.capacity - (bookedCounts[s.id] || 0),
        };
      });
    },
    enabled: !!guest,
  });

  // Identify special events (activities with sessions that aren't part of recurring patterns)
  // For simplicity, we'll show sessions that are marked as requiring approval or have unique notes
  const specialEvents = upcomingSessions?.filter((session: any) => 
    session.requires_approval || session.notes
  ) || [];

  if (!guest) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view activities.</p>
      </div>
    );
  }

  // Filter activities by search and category
  const filteredActivities = activities?.filter((activity) => {
    const matchesSearch = activity.name?.toLowerCase().includes(search.toLowerCase()) ||
      activity.short_description?.toLowerCase().includes(search.toLowerCase()) ||
      activity.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || activity.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Explore Activities</h1>
        <p className="text-sm text-muted-foreground">
          Discover all experiences available at our resort
        </p>
      </div>

      {/* Tabs for All Activities vs Special Events */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'events')}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="all" className="gap-2">
            <Star className="h-4 w-4" />
            All Activities
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-2 relative">
            <Sparkles className="h-4 w-4" />
            Special Events
            {specialEvents.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                {specialEvents.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === 'all' ? (
        <>
          {/* Category Pills */}
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

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Activities Grid */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-36 rounded-xl" />
              ))}
            </div>
          ) : filteredActivities.length === 0 ? (
            <Card className="border-dashed border-2 bg-muted/20">
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">No activities found</h3>
                <p className="text-sm text-muted-foreground">
                  {search ? 'Try adjusting your search terms' : 'No activities available in this category'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredActivities.map((activity) => {
                const categoryConfig = getCategoryConfig(activity.category);
                const difficulty = activity.difficulty_level as DifficultyLevel | null;
                
                return (
                  <Card
                    key={activity.id}
                    className="overflow-hidden hover:shadow-card-hover hover:border-primary/30 transition-all cursor-pointer group"
                    onClick={() => navigate(`/guest/activities/${activity.id}`)}
                  >
                    <div className="flex">
                      {/* Image or Category Icon */}
                      <div className="relative w-28 shrink-0">
                        {activity.image_url ? (
                          <img 
                            src={activity.image_url} 
                            alt={activity.name}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className={cn(
                            "absolute inset-0 flex items-center justify-center",
                            categoryConfig.bgClass
                          )}>
                            <CategoryIcon category={activity.category} size={32} />
                          </div>
                        )}
                      </div>
                      
                      {/* Content */}
                      <CardContent className="p-4 flex-1 flex flex-col">
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${categoryConfig.chipClass}`}
                          >
                            {categoryConfig.label}
                          </Badge>
                          {difficulty && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${difficultyColors[difficulty]}`}
                            >
                              {difficultyLabels[difficulty]}
                            </Badge>
                          )}
                          {activity.suitable_for_non_swimmers && (
                            <Badge variant="outline" className="text-xs gap-1 text-sky-600 dark:text-sky-400">
                              <Waves className="h-3 w-3" />
                              Non-swimmers
                            </Badge>
                          )}
                        </div>
                        
                        <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                          {activity.name}
                        </h3>
                        
                        {activity.short_description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2 flex-1">
                            {activity.short_description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDuration(activity.duration_minutes)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              Max {activity.max_pax_per_booking}
                            </span>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Book Sessions CTA */}
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Ready to book?</h3>
                  <p className="text-sm text-muted-foreground">
                    View available sessions during your stay
                  </p>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => navigate(GUEST_ROUTES.ACTIVITY_SESSIONS)}
                  className="shrink-0"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  View Sessions
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        /* Special Events Tab */
        <>
          {specialEvents.length === 0 ? (
            <Card className="border-dashed border-2 bg-muted/20">
              <CardContent className="py-12 text-center">
                <Sparkles className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">No special events</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  There are no special events scheduled during your stay. Check back later or browse our regular activities.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setActiveTab('all')}
                >
                  Browse All Activities
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Unique experiences and one-time events during your stay
              </p>
              {specialEvents.map((session: any) => {
                const categoryConfig = getCategoryConfig(session.category);
                const spotsLeft = session.remaining_spots;
                const isLowAvailability = spotsLeft > 0 && spotsLeft <= 3;
                
                return (
                  <Card
                    key={session.id}
                    className="overflow-hidden hover:shadow-card-hover hover:border-primary/30 transition-all cursor-pointer group border-2 border-dashed border-sunset/30"
                    onClick={() => navigate(`/guest/activities/book/${session.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Category Icon with special event indicator */}
                        <div className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-xl shrink-0 relative",
                          categoryConfig.bgClass
                        )}>
                          <CategoryIcon category={session.category} size={24} />
                          <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-sunset flex items-center justify-center">
                            <Sparkles className="h-2.5 w-2.5 text-white" />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="pending" className="text-xs gap-1">
                              <Sparkles className="h-3 w-3" />
                              Special Event
                            </Badge>
                          </div>
                          
                          <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                            {session.activity_name}
                          </h3>
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>
                              {new Date(session.date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                            <span>•</span>
                            <span>{session.start_time?.slice(0, 5)}</span>
                          </div>
                          
                          {session.notes && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2 italic">
                              "{session.notes}"
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "text-sm flex items-center gap-1",
                              isLowAvailability ? 'text-coral font-medium' : 'text-muted-foreground'
                            )}>
                              <Users className="h-3.5 w-3.5" />
                              {spotsLeft} spots left
                            </span>
                            <span className="text-sm font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                              Book now
                              <ChevronRight className="h-4 w-4" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
