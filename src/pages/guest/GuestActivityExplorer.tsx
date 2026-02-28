import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Activity, DifficultyLevel } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { GuestDatePicker } from '@/components/ui/guest-date-picker';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Clock, ChevronRight, Waves, ArrowLeft, Users, Calendar, MapPin, Sparkles } from 'lucide-react';
import { getActivityIcon } from '@/lib/activity-icons';
import { getCategoryConfig, coreActivityCategories, ActivityCategoryKey } from '@/lib/activity-category-config';
import { CategoryChip, CategoryIcon } from '@/components/ui/category-badge';
import { cn } from '@/lib/utils';
import { GuestPageShell } from '@/components/guest/GuestPageShell';

const difficultyColors: Record<DifficultyLevel, string> = {
  EASY: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  MODERATE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  ADVANCED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
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

export default function GuestActivityExplorer() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { guest } = useGuestAuth();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Fetch available sessions with activity details
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['guest-explorer-sessions', guest?.guestId, selectedDate, selectedCategory],
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

  // Also fetch all activities for the "explore all" section
  const { data: activities } = useQuery({
    queryKey: ['guest-activities-explorer', guest?.resortId],
    queryFn: async () => {
      if (!guest) return [];
      
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('resort_id', guest.resortId)
        .eq('is_active', true)
        .eq('guest_can_book', true)
        .order('name');

      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!guest,
  });

  if (!guest) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view activities.</p>
      </div>
    );
  }

  // Filter sessions by search
  const filteredSessions = sessions?.filter((session: any) => {
    const matchesSearch = session.activity_name?.toLowerCase().includes(search.toLowerCase()) ||
      session.description?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  }) || [];

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const minDate = guest.checkInDate;
  const maxDate = guest.checkOutDate;

  return (
    <GuestPageShell className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Explore Activities</h1>
          <p className="text-muted-foreground">
            Discover experiences available during your stay
          </p>
        </div>
      </div>

      {/* Category Pills */}
      <div className="relative scroll-fade-x">
        <div className="guest-chip-row">
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
      </div>

      {/* Date Picker */}
      <GuestDatePicker
        value={selectedDate}
        onChange={setSelectedDate}
        minDate={minDate}
        maxDate={maxDate}
        hint="Select a date to see available sessions"
      />

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

      {/* Sessions Grid */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : filteredSessions.length === 0 ? (
        <Card className="border-dashed border-2 bg-muted/20">
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No sessions available</h3>
            <p className="text-sm text-muted-foreground">
              {search
                ? 'Try adjusting your search'
                : 'No activity sessions are scheduled for this date. Try another date.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session: any) => {
            const categoryConfig = getCategoryConfig(session.category);
            const spotsLeft = session.remaining_spots;
            const isLowAvailability = spotsLeft > 0 && spotsLeft <= 3;
            
            return (
              <Card
                key={session.id}
                className="overflow-hidden shadow-soft hover:shadow-card-hover hover:border-primary/30 transition-all duration-300 cursor-pointer group"
                onClick={() => navigate(`/resort/${code}/guest/activities/book/${session.id}`)}
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Image Section */}
                  <div className="relative sm:w-40 h-32 sm:h-auto shrink-0">
                    {session.image_url ? (
                      <img 
                        src={session.image_url} 
                        alt={session.activity_name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className={cn(
                        "absolute inset-0 flex items-center justify-center",
                        categoryConfig.bgClass
                      )}>
                        <CategoryIcon category={session.category} size={40} />
                      </div>
                    )}
                    {/* Time Overlay */}
                    <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm rounded-lg px-2 py-1 shadow-lg">
                      <span className="font-mono font-bold text-foreground">
                        {session.start_time?.slice(0, 5)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Content Section */}
                  <CardContent className="p-4 flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge 
                          variant="secondary" 
                          className={categoryConfig.chipClass}
                        >
                          {categoryConfig.label}
                        </Badge>
                        {session.difficulty_level && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${difficultyColors[session.difficulty_level as DifficultyLevel]}`}
                          >
                            {difficultyLabels[session.difficulty_level as DifficultyLevel]}
                          </Badge>
                        )}
                      </div>
                      {session.requires_approval ? (
                        <Badge variant="pending" className="text-xs shrink-0">
                          <Sparkles className="h-3 w-3 mr-1" />Request
                        </Badge>
                      ) : (
                        <Badge variant="confirmed" className="text-xs shrink-0">Instant</Badge>
                      )}
                    </div>
                    
                    <h3 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                      {session.activity_name}
                    </h3>
                    
                    {session.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {session.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDuration(session.duration_minutes)}
                        </span>
                        <span className={cn(
                          "flex items-center gap-1",
                          isLowAvailability ? 'text-coral font-medium' : ''
                        )}>
                          <Users className="h-4 w-4" />
                          {spotsLeft} spots
                        </span>
                      </div>
                      <span className="text-sm font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                        Book now
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </div>
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* View All Activities Link */}
      {activities && activities.length > 0 && (
        <div className="pt-4 border-t border-border">
          <h2 className="text-lg font-semibold text-foreground mb-3">Browse All Activities</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Learn more about each activity before booking
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {activities.slice(0, 4).map((activity) => {
              const categoryConfig = getCategoryConfig(activity.category);
              return (
                <Link
                  key={activity.id}
                  to={`/resort/${code}/guest/activities/${activity.id}`}
                >
                  <Card className="h-full hover:shadow-card-hover hover:border-primary/30 transition-all cursor-pointer group">
                    <CardContent className="p-3 flex items-center gap-3">
                      {/* Activity Image or Category Icon fallback */}
                      <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden">
                        {activity.image_url ? (
                          <img 
                            src={activity.image_url} 
                            alt={activity.name}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className={cn(
                            "flex h-full w-full items-center justify-center",
                            categoryConfig.bgClass
                          )}>
                            <CategoryIcon category={activity.category} size={20} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground text-sm truncate group-hover:text-primary transition-colors">
                          {activity.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(activity.duration_minutes)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
          {activities.length > 4 && (
            <Button variant="ghost" className="w-full mt-3" asChild>
              <Link to={`/resort/${code}/guest/activities`}>
                View all {activities.length} activities
              </Link>
            </Button>
          )}
        </div>
      )}
    </GuestPageShell>
  );
}