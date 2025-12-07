import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  IconActivities,
  IconRestaurants,
  IconBookings,
  IconFeedback,
} from '@/components/icons/ProperaIcons';
import { Compass, Heart, Star } from 'lucide-react';

interface QuickAction {
  icon: React.ElementType;
  label: string;
  href: string;
  colorClass: string;
  bgClass: string;
  description?: string;
}

const quickActions: QuickAction[] = [
  {
    icon: IconActivities,
    label: 'Activities',
    href: '/guest/activities',
    colorClass: 'text-lagoon',
    bgClass: 'bg-lagoon/10',
    description: 'Explore & book',
  },
  {
    icon: IconRestaurants,
    label: 'Dining',
    href: '/guest/restaurants',
    colorClass: 'text-sunset',
    bgClass: 'bg-sunset/10',
    description: 'Reserve a table',
  },
  {
    icon: IconBookings,
    label: 'Bookings',
    href: '/guest/bookings',
    colorClass: 'text-orchid',
    bgClass: 'bg-orchid/10',
    description: 'View & manage',
  },
  {
    icon: Compass,
    label: 'Explore',
    href: '/guest/activities',
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10',
    description: 'Discover more',
  },
];

export function GuestQuickActions() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {quickActions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href + action.label}
            to={action.href}
            className={cn(
              "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all duration-200",
              "hover:scale-[1.02] active:scale-[0.98]",
              action.bgClass
            )}
          >
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              action.bgClass
            )}>
              <Icon className={cn("h-5 w-5", action.colorClass)} />
            </div>
            <span className={cn("text-xs font-semibold", action.colorClass)}>
              {action.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

// Compact version for smaller spaces
export function GuestQuickActionsCompact() {
  const compactActions = quickActions.slice(0, 3);
  
  return (
    <div className="flex gap-2">
      {compactActions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href + action.label}
            to={action.href}
            className={cn(
              "flex-1 flex items-center gap-2 p-3 rounded-xl border border-border/50",
              "bg-card hover:bg-muted/50 transition-all duration-200",
              "hover:border-border active:scale-[0.98]"
            )}
          >
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
              action.bgClass
            )}>
              <Icon className={cn("h-4 w-4", action.colorClass)} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {action.label}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {action.description}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
