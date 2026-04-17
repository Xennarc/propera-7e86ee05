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
import { ObsidianIconTile } from '@/components/marketing/WarmEditorial';

interface QuickAction {
  icon: React.ElementType;
  label: string;
  href?: string;
  onClick?: () => void;
  description?: string;
}

function QuickActionSkeleton() {
  return (
    <div className="h-full min-h-[88px] sm:min-h-[100px] rounded-[24px] overflow-hidden">
      <Skeleton className="h-full w-full" />
    </div>
  );
}

export function GuestQuickActions() {
  const { guest } = useGuestAuth();
  const [quickSheetOpen, setQuickSheetOpen] = useState(false);

  const { data: catalogItems } = useRequestCatalog(guest?.resortId || '', !!guest?.resortId);
  const hasCatalog = catalogItems && catalogItems.length > 0;

  const transport = useFeatureEnabledStable('enable_transport_guest_booking');
  const requests = useFeatureEnabledStable('enable_requests_guest_submit');

  const flagsResolving = !transport.resolved || !requests.resolved;
  const transportEnabled = transport.enabled === true;
  const requestsEnabled = requests.enabled === true;

  const quickActions: QuickAction[] = [
    { icon: IconActivities, label: 'Activities', href: GUEST_ROUTES.ACTIVITIES, description: 'Explore & book' },
    { icon: IconRestaurants, label: 'Dining', href: GUEST_ROUTES.RESTAURANTS, description: 'Reserve a table' },
  ];

  if (transportEnabled) {
    quickActions.push({ icon: Car, label: 'Buggy', href: GUEST_ROUTES.BUGGY, description: 'Request a ride' });
  }

  quickActions.push({ icon: IconBookings, label: 'Bookings', href: GUEST_ROUTES.BOOKINGS, description: 'View & manage' });

  if (requestsEnabled && !transportEnabled) {
    if (hasCatalog) {
      quickActions.push({ icon: Bell, label: 'Requests', href: GUEST_ROUTES.REQUESTS, description: 'Room service & more' });
    } else {
      quickActions.push({ icon: MessageSquarePlus, label: 'Request', onClick: () => setQuickSheetOpen(true), description: 'Ask for anything' });
    }
  }

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
            <div className="guest-quick-action h-full min-h-[88px] sm:min-h-[100px] md:min-h-[120px] xl:min-h-[140px]">
              <ObsidianIconTile size={40}>
                <Icon className="h-5 w-5" />
              </ObsidianIconTile>
              <span className="text-[11px] sm:text-xs md:text-sm xl:text-base font-semibold text-foreground whitespace-nowrap text-center">
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
            <button key={`action-${index}`} onClick={action.onClick} className="text-left">
              {content}
            </button>
          );
        })}
      </div>

      <RequestQuickSheet open={quickSheetOpen} onOpenChange={setQuickSheetOpen} />
    </>
  );
}

// Compact version for smaller spaces — preserved API
export function GuestQuickActionsCompact() {
  const { guest } = useGuestAuth();
  const { data: catalogItems } = useRequestCatalog(guest?.resortId || '', !!guest?.resortId);
  const hasCatalog = catalogItems && catalogItems.length > 0;

  const quickActions = [
    { icon: IconActivities, label: 'Activities', href: GUEST_ROUTES.ACTIVITIES, description: 'Explore & book' },
    { icon: IconRestaurants, label: 'Dining', href: GUEST_ROUTES.RESTAURANTS, description: 'Reserve a table' },
    hasCatalog
      ? { icon: Bell, label: 'Requests', href: GUEST_ROUTES.REQUESTS, description: 'Room service & more' }
      : { icon: IconBookings, label: 'Bookings', href: GUEST_ROUTES.BOOKINGS, description: 'View & manage' },
  ];

  return (
    <div className="flex gap-2">
      {quickActions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href + action.label}
            to={action.href}
            className="flex-1 flex items-center gap-2 p-3 rounded-2xl bg-card transition-all duration-200 hover:-translate-y-0.5"
            style={{ boxShadow: '0 1px 2px 0 hsl(var(--foreground) / 0.04), 0 6px 18px -10px hsl(var(--foreground) / 0.08)' }}
          >
            <ObsidianIconTile size={32}>
              <Icon className="h-4 w-4" />
            </ObsidianIconTile>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{action.label}</p>
              <p className="text-[10px] text-muted-foreground truncate">{action.description}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
