import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  IconActivities,
  IconRestaurants,
  IconBookings,
} from '@/components/icons/ProperaIcons';
import { Bell, MessageSquarePlus } from 'lucide-react';
import { RequestQuickSheet } from './RequestQuickSheet';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { useRequestCatalog } from '@/hooks/useServiceRequests';

interface QuickAction {
  icon: React.ElementType;
  label: string;
  href?: string;
  onClick?: () => void;
  colorClass: string;
  bgClass: string;
  description?: string;
}

export function GuestQuickActions() {
  const { guest } = useGuestAuth();
  const [quickSheetOpen, setQuickSheetOpen] = useState(false);

  // Check if resort has configured a request catalog
  const { data: catalogItems } = useRequestCatalog(guest?.resortId || '', !!guest?.resortId);
  const hasCatalog = catalogItems && catalogItems.length > 0;

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
    // Show either "Requests" (with catalog) or "Make a Request" (simple mode)
    hasCatalog
      ? {
          icon: Bell,
          label: 'Requests',
          href: '/guest/requests',
          colorClass: 'text-cyan-500',
          bgClass: 'bg-cyan-500/10',
          description: 'Room service & more',
        }
      : {
          icon: MessageSquarePlus,
          label: 'Request',
          onClick: () => setQuickSheetOpen(true),
          colorClass: 'text-cyan-500',
          bgClass: 'bg-cyan-500/10',
          description: 'Ask for anything',
        },
  ];

  return (
    <>
      <div className="grid grid-cols-4 gap-2">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          const content = (
            <div
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
            </div>
          );

          if (action.href) {
            return (
              <Link key={action.href + action.label} to={action.href}>
                {content}
              </Link>
            );
          }

          return (
            <button
              key={`action-${index}`}
              onClick={action.onClick}
              className="text-left"
            >
              {content}
            </button>
          );
        })}
      </div>

      {/* Quick request sheet for simple mode */}
      <RequestQuickSheet open={quickSheetOpen} onOpenChange={setQuickSheetOpen} />
    </>
  );
}

// Compact version for smaller spaces
export function GuestQuickActionsCompact() {
  const { guest } = useGuestAuth();
  const { data: catalogItems } = useRequestCatalog(guest?.resortId || '', !!guest?.resortId);
  const hasCatalog = catalogItems && catalogItems.length > 0;

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
    hasCatalog
      ? {
          icon: Bell,
          label: 'Requests',
          href: '/guest/requests',
          colorClass: 'text-cyan-500',
          bgClass: 'bg-cyan-500/10',
          description: 'Room service & more',
        }
      : {
          icon: IconBookings,
          label: 'Bookings',
          href: '/guest/bookings',
          colorClass: 'text-orchid',
          bgClass: 'bg-orchid/10',
          description: 'View & manage',
        },
  ];

  const compactActions = quickActions.slice(0, 3);
  
  return (
    <div className="flex gap-2">
      {compactActions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={(action.href || '') + action.label}
            to={action.href || '#'}
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
