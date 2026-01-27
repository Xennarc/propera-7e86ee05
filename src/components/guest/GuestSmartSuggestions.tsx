import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { differenceInDays, parseISO } from 'date-fns';
import { Sparkles, Compass, Utensils, Calendar, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Suggestion {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  variant: 'primary' | 'secondary' | 'accent';
}

interface GuestSmartSuggestionsProps {
  stayNights: number;
  hasActivities: boolean;
  hasDiningTonight: boolean;
  todayBookingsCount: number;
  onDismiss?: (suggestionId: string) => void;
  dismissedIds?: string[];
  className?: string;
}

export function GuestSmartSuggestions({
  stayNights,
  hasActivities,
  hasDiningTonight,
  todayBookingsCount,
  onDismiss,
  dismissedIds = [],
  className,
}: GuestSmartSuggestionsProps) {
  const { t } = useTranslation();

  const suggestions = useMemo(() => {
    const allSuggestions: Suggestion[] = [];

    // Suggest excursion if staying 3+ nights with no activities
    if (stayNights >= 3 && !hasActivities) {
      allSuggestions.push({
        id: 'suggest-excursion',
        icon: <Compass className="h-5 w-5" />,
        title: t('suggestions.excursionTitle', 'Try an excursion'),
        description: t('suggestions.excursionDescription', 'Explore the island with a half-day adventure'),
        actionLabel: t('suggestions.viewExcursions', 'View Excursions'),
        href: '/guest/activities?category=EXCURSION',
        variant: 'primary',
      });
    }

    // Suggest dinner if no dining booked for tonight (after 5pm check is done at parent)
    if (!hasDiningTonight) {
      allSuggestions.push({
        id: 'suggest-dinner',
        icon: <Utensils className="h-5 w-5" />,
        title: t('suggestions.dinnerTitle', 'Reserve dinner tonight'),
        description: t('suggestions.dinnerDescription', 'Secure your table for a memorable evening'),
        actionLabel: t('suggestions.browseDining', 'Browse Dining'),
        href: '/guest/restaurants',
        variant: 'secondary',
      });
    }

    // Suggest activities if no bookings today and stay is long
    if (todayBookingsCount === 0 && stayNights >= 2) {
      allSuggestions.push({
        id: 'suggest-today',
        icon: <Calendar className="h-5 w-5" />,
        title: t('suggestions.todayTitle', 'Plan something today'),
        description: t('suggestions.todayDescription', 'See what is available right now'),
        actionLabel: t('suggestions.viewToday', 'View Today'),
        href: '/guest/activities',
        variant: 'accent',
      });
    }

    // Filter out dismissed suggestions
    return allSuggestions.filter(s => !dismissedIds.includes(s.id));
  }, [stayNights, hasActivities, hasDiningTonight, todayBookingsCount, dismissedIds, t]);

  if (suggestions.length === 0) {
    return null;
  }

  const variantStyles = {
    primary: 'from-primary/10 to-primary/5 border-primary/20',
    secondary: 'from-sunset/10 to-sunset/5 border-sunset/20',
    accent: 'from-lagoon/10 to-lagoon/5 border-lagoon/20',
  };

  const iconStyles = {
    primary: 'bg-primary/15 text-primary',
    secondary: 'bg-sunset/15 text-sunset',
    accent: 'bg-lagoon/15 text-lagoon',
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="font-medium">{t('suggestions.forYou', 'Suggested for you')}</span>
      </div>
      
      <div className="grid gap-3 sm:grid-cols-2">
        {suggestions.slice(0, 2).map((suggestion) => (
          <Card 
            key={suggestion.id}
            className={cn(
              'relative overflow-hidden border bg-gradient-to-br transition-all duration-200 hover:shadow-md',
              variantStyles[suggestion.variant]
            )}
          >
            {onDismiss && (
              <button
                onClick={() => onDismiss(suggestion.id)}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-background/50 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                aria-label="Dismiss suggestion"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl shrink-0',
                  iconStyles[suggestion.variant]
                )}>
                  {suggestion.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-foreground mb-0.5 line-clamp-1">
                    {suggestion.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {suggestion.description}
                  </p>
                  <Link to={suggestion.href}>
                    <Button size="sm" variant="outline" className="h-8 text-xs">
                      {suggestion.actionLabel}
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
