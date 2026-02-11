import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { GUEST_ROUTES } from '@/routes/guestRoutes';
import {
  IconActivities,
  IconRestaurants,
  IconBookings,
} from '@/components/icons/ProperaIcons';
import { Bell, MessageSquarePlus, Car } from 'lucide-react';
import { RequestQuickSheet } from './RequestQuickSheet';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { useRequestCatalog } from '@/hooks/useServiceRequests';
import { useFeatureEnabledStable } from '@/components/FeatureGate';
import { Skeleton } from '@/components/ui/skeleton';

interface QuickAction {
  icon: React.ElementType;
  label: string;
  href?: string;
  onClick?: () => void;
  colorClass: string;
  bgClass: string;
  description?: string;
}

/**
 * Skeleton placeholder for quick action buttons during loading
 */
function QuickActionSkeleton() {
  return (
    <div className="h-full min-h-[88px] sm:min-h-[100px] rounded-2xl overflow-hidden">
      <Skeleton className="h-full w-full" />
    </div>
  );
}

export function GuestQuickActions() {
  const { guest } = useGuestAuth();
  const [quickSheetOpen, setQuickSheetOpen] = useState(false);

  // Check if resort has configured a request catalog
  const { data: catalogItems, isLoading: catalogLoading } = useRequestCatalog(guest?.resortId || '', !!guest?.resortId);
  const hasCatalog = catalogItems && catalogItems.length > 0;
  
  // Check feature flags with stable resolution (distinguishes loading vs false)
  const transport = useFeatureEnabledStable('enable_transport_guest_booking');
  const requests = useFeatureEnabledStable('enable_requests_guest_submit');
  
  // Determine if we're still resolving critical flags
  const flagsResolving = !transport.resolved || !requests.resolved;
  
  // Use resolved values (null becomes false after resolution)
  const transportEnabled = transport.enabled === true;
  const requestsEnabled = requests.enabled === true;

  // Build quick actions dynamically - additive logic (both features can coexist)
  const quickActions: QuickAction[] = [
    // Always show Activities & Dining
    {
      icon: IconActivities,
      label: 'Activities',
      href: GUEST_ROUTES.ACTIVITIES,
      colorClass: 'text-white',
      bgClass: 'bg-teal-500',
      description: 'Explore & book',
    },
    {
      icon: IconRestaurants,
      label: 'Dining',
      href: '/guest/restaurants',
      colorClass: 'text-white',
      bgClass: 'bg-amber-500',
      description: 'Reserve a table',
    },
  ];

  // Add transport if enabled
  if (transportEnabled) {
    quickActions.push({
      icon: Car,
      label: 'Buggy',
      href: '/guest/buggy',
      colorClass: 'text-white',
      bgClass: 'bg-emerald-500',
      description: 'Request a ride',
    });
  }

  // Always add Bookings
  quickActions.push({
    icon: IconBookings,
    label: 'Bookings',
    href: '/guest/bookings',
    colorClass: 'text-white',
    bgClass: 'bg-purple-500',
    description: 'View & manage',
  });

  // Add Requests ONLY if transport is NOT enabled
  // (When transport is on, requests is still accessible via bottom nav)
  if (requestsEnabled && !transportEnabled) {
    if (hasCatalog) {
      quickActions.push({
        icon: Bell,
        label: 'Requests',
        href: '/guest/requests',
        colorClass: 'text-white',
        bgClass: 'bg-sky-500',
        description: 'Room service & more',
      });
    } else {
      quickActions.push({
        icon: MessageSquarePlus,
        label: 'Request',
        onClick: () => setQuickSheetOpen(true),
        colorClass: 'text-white',
        bgClass: 'bg-sky-500',
        description: 'Ask for anything',
      });
    }
  }

  // Show skeleton grid while flags are resolving (first load only)
  if (flagsResolving) {
    return (
      <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
        <QuickActionSkeleton />
        <QuickActionSkeleton />
        <QuickActionSkeleton />
        <QuickActionSkeleton />
      </div>
    );
  }

  return (
    <>
      <div className={cn(
        "grid gap-2.5 sm:gap-3",
        quickActions.length <= 4 ? "grid-cols-4" : "grid-cols-5"
      )}>
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          const content = (
            <div
              className={cn(
                "guest-quick-action",
                "h-full min-h-[88px] sm:min-h-[100px]",
                action.bgClass
              )}
            >
              <Icon className="h-7 w-7 sm:h-8 sm:w-8 text-white drop-shadow-md" />
              <span className="text-xs sm:text-sm font-semibold text-white whitespace-nowrap text-center drop-shadow-sm">
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
