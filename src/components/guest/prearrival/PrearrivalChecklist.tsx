import { Check, Circle, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { PrearrivalProfile, PrearrivalSettings } from '@/hooks/usePrearrivalData';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  isComplete: boolean;
  action: () => void;
}

interface PrearrivalChecklistProps {
  profile: PrearrivalProfile | null;
  settings: PrearrivalSettings;
  onOpenWizard: (step?: number) => void;
  onOpenActivities: () => void;
  onOpenDining: () => void;
  activityBookingsCount: number;
  diningBookingsCount: number;
  className?: string;
}

export function PrearrivalChecklist({
  profile,
  settings,
  onOpenWizard,
  onOpenActivities,
  onOpenDining,
  activityBookingsCount,
  diningBookingsCount,
  className,
}: PrearrivalChecklistProps) {
  const items: ChecklistItem[] = [];

  // Arrival details
  if (settings.show_arrival_details) {
    const hasArrivalDetails = !!(profile?.arrival_time || profile?.arrival_flight_number);
    items.push({
      id: 'arrival',
      title: 'Share your arrival details',
      description: hasArrivalDetails 
        ? `Flight ${profile?.arrival_flight_number || 'details shared'}` 
        : 'Help us arrange your transfer',
      isComplete: hasArrivalDetails,
      action: () => onOpenWizard(0),
    });
  }

  // Preferences
  if (settings.show_preferences) {
    const hasPreferences = !!(
      (Array.isArray(profile?.dietary_preferences) && profile.dietary_preferences.length > 0) ||
      profile?.allergies
    );
    items.push({
      id: 'preferences',
      title: 'Tell us your preferences',
      description: hasPreferences
        ? 'Dietary preferences & allergies shared'
        : 'Dietary needs, allergies & room preferences',
      isComplete: hasPreferences,
      action: () => onOpenWizard(1),
    });
  }

  // Special occasions
  if (settings.show_special_occasions) {
    const hasOccasions = Array.isArray(profile?.special_occasions) && profile.special_occasions.length > 0;
    items.push({
      id: 'occasions',
      title: 'Any special occasion?',
      description: hasOccasions
        ? profile.special_occasions.join(', ')
        : 'Honeymoon, anniversary, birthday...',
      isComplete: !!hasOccasions,
      action: () => onOpenWizard(2),
    });
  }

  // Activity bookings
  if (settings.allow_activity_bookings) {
    items.push({
      id: 'activities',
      title: 'Pre-book activities',
      description: activityBookingsCount > 0
        ? `${activityBookingsCount} ${activityBookingsCount === 1 ? 'activity' : 'activities'} booked`
        : 'Plan your adventures ahead',
      isComplete: activityBookingsCount > 0,
      action: onOpenActivities,
    });
  }

  // Dining bookings
  if (settings.allow_dining_bookings) {
    items.push({
      id: 'dining',
      title: 'Reserve your tables',
      description: diningBookingsCount > 0
        ? `${diningBookingsCount} ${diningBookingsCount === 1 ? 'reservation' : 'reservations'} made`
        : 'Book special dinners',
      isComplete: diningBookingsCount > 0,
      action: onOpenDining,
    });
  }

  const completedCount = items.filter(i => i.isComplete).length;
  const progressPercent = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  return (
    <Card className={cn("guest-card", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Pre-arrival checklist</CardTitle>
          <span className="text-sm text-muted-foreground">
            {completedCount} of {items.length} done
          </span>
        </div>
        <Progress value={progressPercent} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={item.action}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
              "hover:bg-muted/50 active:scale-[0.99]",
              item.isComplete && "bg-primary/5"
            )}
          >
            <div className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
              item.isComplete 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            )}>
              {item.isComplete ? (
                <Check className="h-4 w-4" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-medium text-sm",
                item.isComplete && "text-primary"
              )}>
                {item.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {item.description}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
