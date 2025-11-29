import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useResort } from '@/contexts/ResortContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Activity, DifficultyLevel } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Search, 
  Clock, 
  Users, 
  Copy, 
  Link2, 
  QrCode,
  CheckCircle2,
  Waves,
} from 'lucide-react';
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

export default function ActivityCheatsheetPage() {
  const { currentResort } = useResort();
  const { isSuperAdmin, getResortRole } = useAuth();
  const { toast } = useToast();
  
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [nonSwimmerOnly, setNonSwimmerOnly] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedActivityUrl, setSelectedActivityUrl] = useState('');

  // Check access
  const resortRole = currentResort ? getResortRole(currentResort.id) : null;
  const hasAccess = isSuperAdmin() || 
    (resortRole && ['RESORT_ADMIN', 'FRONT_OFFICE', 'ACTIVITIES'].includes(resortRole));

  // Fetch activities
  const { data: activities, isLoading } = useQuery({
    queryKey: ['cheatsheet-activities', currentResort?.id],
    queryFn: async () => {
      if (!currentResort) return [];
      
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('resort_id', currentResort.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!currentResort && hasAccess,
  });

  if (!hasAccess) {
    return (
      <div className="p-6">
        <PageHeader
          title="Activity Cheat Sheet"
          description="Quick reference for guest inquiries"
        />
        <Card className="mt-6">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              You don't have permission to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentResort) {
    return (
      <div className="p-6">
        <PageHeader
          title="Activity Cheat Sheet"
          description="Quick reference for guest inquiries"
        />
        <Card className="mt-6">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Please select a resort to view activities.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter activities
  const filteredActivities = activities?.filter((activity) => {
    const matchesSearch = activity.name.toLowerCase().includes(search.toLowerCase());
    const matchesDifficulty = difficultyFilter === 'all' || 
      activity.difficulty_level === difficultyFilter;
    const matchesSwimmer = !nonSwimmerOnly || activity.suitable_for_non_swimmers;
    
    return matchesSearch && matchesDifficulty && matchesSwimmer;
  }) || [];

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getGuestLink = (activityId: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/resort/${currentResort.code}/guest/activities/${activityId}`;
  };

  const generateExplainerText = (activity: Activity) => {
    const lines = [`Quick info about ${activity.name}:`];
    
    if (activity.duration_minutes) {
      lines.push(`• Duration: ${formatDuration(activity.duration_minutes)}`);
    }
    
    if (activity.difficulty_level) {
      lines.push(`• Difficulty: ${difficultyLabels[activity.difficulty_level]}`);
    }
    
    if (activity.includes) {
      const includesShort = activity.includes.length > 100 
        ? activity.includes.substring(0, 100) + '...'
        : activity.includes;
      lines.push(`• Includes: ${includesShort}`);
    }
    
    if (activity.health_and_safety_notes) {
      const safetyShort = activity.health_and_safety_notes.length > 80
        ? activity.health_and_safety_notes.substring(0, 80) + '...'
        : activity.health_and_safety_notes;
      lines.push(`• Important: ${safetyShort}`);
    }
    
    if (activity.cancellation_policy_text) {
      const cancelShort = activity.cancellation_policy_text.length > 60
        ? activity.cancellation_policy_text.substring(0, 60) + '...'
        : activity.cancellation_policy_text;
      lines.push(`• Cancellation: ${cancelShort}`);
    }
    
    return lines.join('\n');
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: `${type} copied to clipboard`,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Failed to copy',
        description: 'Please try again',
      });
    }
  };

  const showQrCode = (activityId: string) => {
    setSelectedActivityUrl(getGuestLink(activityId));
    setQrDialogOpen(true);
  };

  // Parse highlights
  const parseHighlights = (activity: Activity): string[] => {
    if (!activity.highlights) return [];
    if (Array.isArray(activity.highlights)) return activity.highlights.slice(0, 3);
    if (typeof activity.highlights === 'string') {
      try {
        const parsed = JSON.parse(activity.highlights);
        return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
      } catch {
        return activity.highlights.split('\n').filter(Boolean).slice(0, 3);
      }
    }
    return [];
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Activity Cheat Sheet"
        description="Quick reference and copy-paste info for guest inquiries"
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
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
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="EASY">Easy</SelectItem>
                <SelectItem value="MODERATE">Moderate</SelectItem>
                <SelectItem value="ADVANCED">Advanced</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch
                id="non-swimmer"
                checked={nonSwimmerOnly}
                onCheckedChange={setNonSwimmerOnly}
              />
              <Label htmlFor="non-swimmer" className="text-sm whitespace-nowrap">
                Non-swimmer friendly
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activities Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : filteredActivities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <IconActivities className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No activities found</h3>
            <p className="text-sm text-muted-foreground">
              {search || difficultyFilter !== 'all' || nonSwimmerOnly
                ? 'Try adjusting your filters'
                : 'No activities configured for this resort'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredActivities.map((activity) => {
            const highlights = parseHighlights(activity);
            
            return (
              <Card key={activity.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <IconActivities className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{activity.name}</CardTitle>
                        <div className="flex flex-wrap gap-1 mt-1">
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
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 pb-3">
                  {activity.short_description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {activity.short_description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                    {activity.duration_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDuration(activity.duration_minutes)}
                      </span>
                    )}
                    {(activity.age_min || activity.max_age) && (
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {activity.age_min && activity.max_age
                          ? `${activity.age_min}-${activity.max_age}y`
                          : activity.age_min
                          ? `${activity.age_min}+`
                          : `<${activity.max_age}y`}
                      </span>
                    )}
                  </div>
                  
                  {highlights.length > 0 && (
                    <ul className="space-y-1 mb-3">
                      {highlights.map((highlight, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
                
                {/* Action Buttons */}
                <div className="p-4 pt-0 mt-auto">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => copyToClipboard(generateExplainerText(activity), 'Explainer text')}
                    >
                      <Copy className="h-4 w-4" />
                      Copy text
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => copyToClipboard(getGuestLink(activity.id), 'Guest link')}
                    >
                      <Link2 className="h-4 w-4" />
                      Copy link
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => showQrCode(activity.id)}
                    >
                      <QrCode className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Guest Activity Link</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG value={selectedActivityUrl} size={200} />
            </div>
            <p className="text-xs text-muted-foreground text-center break-all">
              {selectedActivityUrl}
            </p>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => copyToClipboard(selectedActivityUrl, 'Link')}
            >
              <Copy className="h-4 w-4" />
              Copy link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
