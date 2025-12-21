import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, X, Clock, TrendingUp, Building2, AlertTriangle, Plane } from 'lucide-react';
import { useDailyBriefing } from '@/hooks/usePlatformActivity';

interface Favorite {
  type: 'resort' | 'user' | 'page';
  id: string;
  label: string;
  url: string;
}

interface SavedView {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const DEFAULT_SAVED_VIEWS: SavedView[] = [
  { id: 'top-resorts', name: 'My Top Resorts', description: 'Favorite resorts', icon: Building2 },
  { id: 'p0-incidents', name: 'P0 Incidents', description: 'Critical issues only', icon: AlertTriangle },
  { id: 'arrivals-72h', name: 'Arrivals 72h', description: 'Upcoming arrivals', icon: Plane },
];

interface FounderControlsProps {
  resortIds?: string[];
}

export function FounderControls({ resortIds }: FounderControlsProps) {
  const [favorites, setFavorites] = useState<Favorite[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('superadmin-favorites') || '[]');
    } catch {
      return [];
    }
  });

  // Real daily briefing data from the database
  const { data: briefing, isLoading: loadingBriefing } = useDailyBriefing(resortIds);

  const removeFavorite = (id: string) => {
    setFavorites(prev => {
      const updated = prev.filter(f => f.id !== id);
      localStorage.setItem('superadmin-favorites', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div className="space-y-4">
      {/* Daily Briefing */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Daily Briefing
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingBriefing ? (
            <div className="grid grid-cols-3 gap-4 text-center">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : briefing ? (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{briefing.changes}</p>
                <p className="text-xs text-muted-foreground">Changes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">{briefing.issues}</p>
                <p className="text-xs text-muted-foreground">Issues</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1">
                  <p className="text-2xl font-bold text-success">{briefing.growth}</p>
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
                <p className="text-xs text-muted-foreground">Growth</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
          )}
        </CardContent>
      </Card>

      {/* Favorites */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Star className="h-4 w-4 text-warning" />
            Favorites
          </CardTitle>
        </CardHeader>
        <CardContent>
          {favorites.length > 0 ? (
            <div className="space-y-2">
              {favorites.slice(0, 5).map(fav => (
                <div key={fav.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px]">{fav.type}</Badge>
                    <span className="text-sm font-medium">{fav.label}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFavorite(fav.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              Use ⌘K to add favorites
            </p>
          )}
        </CardContent>
      </Card>

      {/* Saved Views */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Saved Views</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {DEFAULT_SAVED_VIEWS.map(view => (
              <Button 
                key={view.id} 
                variant="ghost" 
                className="w-full justify-start h-auto py-2"
              >
                <view.icon className="h-4 w-4 mr-2 text-muted-foreground" />
                <div className="text-left">
                  <p className="text-sm font-medium">{view.name}</p>
                  <p className="text-xs text-muted-foreground">{view.description}</p>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
