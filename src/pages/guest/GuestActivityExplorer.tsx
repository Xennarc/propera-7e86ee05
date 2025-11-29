import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Activity, DifficultyLevel } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Clock, ChevronRight, Waves, ArrowLeft } from 'lucide-react';
import { IconActivities } from '@/components/icons/ProperaIcons';

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

export default function GuestActivityExplorer() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { guest } = useGuestAuth();
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');

  // Fetch activities for the guest's resort
  const { data: activities, isLoading } = useQuery({
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

  // Filter activities
  const filteredActivities = activities?.filter((activity) => {
    const matchesSearch = activity.name.toLowerCase().includes(search.toLowerCase()) ||
      activity.short_description?.toLowerCase().includes(search.toLowerCase());
    
    const matchesDifficulty = difficultyFilter === 'all' || 
      activity.difficulty_level === difficultyFilter;
    
    return matchesSearch && matchesDifficulty;
  }) || [];

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="space-y-6">
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search activities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="EASY">Easy</SelectItem>
            <SelectItem value="MODERATE">Moderate</SelectItem>
            <SelectItem value="ADVANCED">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Activities Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : filteredActivities.length === 0 ? (
        <Card className="border-dashed border-2 bg-muted/20">
          <CardContent className="py-12 text-center">
            <IconActivities className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No activities found</h3>
            <p className="text-sm text-muted-foreground">
              {search || difficultyFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No activities are currently available'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredActivities.map((activity) => (
            <Link
              key={activity.id}
              to={`/resort/${code}/guest/activities/${activity.id}`}
            >
              <Card className="h-full shadow-soft hover:shadow-card-hover hover:border-primary/30 transition-all duration-300 cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <IconActivities className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {activity.difficulty_level && (
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${difficultyColors[activity.difficulty_level]}`}
                        >
                          {difficultyLabels[activity.difficulty_level]}
                        </Badge>
                      )}
                      {activity.suitable_for_non_swimmers && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Waves className="h-3 w-3" />
                          Non-swimmers OK
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {activity.name}
                  </h3>
                  
                  {activity.short_description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {activity.short_description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {activity.duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDuration(activity.duration_minutes)}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                      View details
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
