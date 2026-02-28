/**
 * Guest Bottom Navigation
 * 
 * Feature-flag-gated bottom navigation for the guest portal.
 * Uses the FeatureFlagsProvider context to show/hide nav items.
 */

import { memo, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GUEST_ROUTES } from '@/routes/guestRoutes';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useFeatureFlagAccessSafe } from '@/providers/FeatureFlagsProvider';
import { useIsPrearrivalGuest } from '@/hooks/usePrearrivalData';
import {
  IconStay,
  IconActivities,
  IconBookings,
} from '@/components/icons/ProperaIcons';
import { Bell, Lock, Car, Crown, UtensilsCrossed } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface NavItemDef {
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  href: string;
  key: string;
  restrictPrearrival?: boolean;
  featureFlag?: string; // Optional feature flag to gate this item
}

// Core nav items that are always shown
const coreNavItems: NavItemDef[] = [
  { icon: IconStay, labelKey: 'nav.home', href: GUEST_ROUTES.HOME, key: 'guest-home' },
  { icon: IconActivities, labelKey: 'nav.activities', href: GUEST_ROUTES.ACTIVITIES, key: 'guest-activities' },
];

// Feature-gated nav items
const requestsNavItem: NavItemDef = { 
  icon: Bell, 
  labelKey: 'nav.requests', 
  href: GUEST_ROUTES.REQUESTS, 
  key: 'guest-requests', 
  restrictPrearrival: true,
  featureFlag: 'enable_requests_guest_submit',
};

const transportNavItem: NavItemDef = { 
  icon: Car, 
  labelKey: 'nav.ride', 
  href: GUEST_ROUTES.BUGGY, 
  key: 'guest-buggy',
  featureFlag: 'enable_transport_guest_booking',
};

const bookingsNavItem: NavItemDef = { 
  icon: IconBookings, 
  labelKey: 'nav.bookings', 
  href: GUEST_ROUTES.BOOKINGS, 
  key: 'guest-bookings',
};

const roomServiceNavItem: NavItemDef = {
  icon: UtensilsCrossed,
  labelKey: 'nav.inVillaDining',
  href: GUEST_ROUTES.ROOM_SERVICE,
  key: 'guest-room-service',
  restrictPrearrival: true,
  featureFlag: 'enable_room_service',
};

const loyaltyNavItem: NavItemDef = { 
  icon: Crown, 
  labelKey: 'nav.loyalty', 
  href: GUEST_ROUTES.LOYALTY, 
  key: 'guest-loyalty',
};

// Memoized nav item with unified indicator
const NavItem = memo(({ 
  item, 
  isActive, 
  label, 
  isPrearrivalRestricted 
}: { 
  item: NavItemDef; 
  isActive: boolean; 
  label: string;
  isPrearrivalRestricted?: boolean;
}) => {
  const Icon = item.icon;
  return (
    <Link
      to={item.href}
      className={cn(
        "guest-nav-item relative min-w-[60px] tap-target touch-passive",
        isActive 
          ? "text-primary" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      {/* Active indicator using guest branding with glow */}
      {isActive && (
        <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary guest-nav-indicator shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
      )}
      <div className="relative">
        <Icon className={cn(
          "h-5 w-5 sm:h-6 sm:w-6 transition-all duration-200 guest-nav-icon",
          isActive && "scale-110 drop-shadow-[0_0_4px_hsl(var(--primary)/0.4)]"
        )} />
        {/* Lock overlay for pre-arrival restricted items */}
        {isPrearrivalRestricted && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-2 w-2 text-muted-foreground" />
          </div>
        )}
      </div>
      {/* Minimum 11px text for mobile readability */}
      <span className={cn(
        "text-[11px] sm:text-xs font-medium transition-all whitespace-nowrap text-center",
        isActive && "font-bold text-primary"
      )}>
        {label}
      </span>
    </Link>
  );
});
NavItem.displayName = 'NavItem';

// Skeleton for loading state
function NavSkeleton() {
  return (
    <div className="flex items-center justify-around px-2 w-full">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex flex-col items-center gap-1 min-w-[60px]">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-3 w-10 rounded" />
        </div>
      ))}
    </div>
  );
}

interface GuestBottomNavProps {
  isLoyaltyEnabled?: boolean;
}

export function GuestBottomNav({ isLoyaltyEnabled = false }: GuestBottomNavProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { isPrearrival } = useIsPrearrivalGuest();
  const flagContext = useFeatureFlagAccessSafe();

  // Check if we have resolved flags
  const hasCachedFlags = flagContext && Object.keys(flagContext.flagsMap).length > 0;
  const isLoading = flagContext?.loading && !hasCachedFlags;

  // Get effective flag values (with stale-while-revalidate)
  const requestsEnabled = hasCachedFlags 
    ? flagContext.isEnabledEffective('enable_requests_guest_submit') 
    : false;
  const transportEnabled = hasCachedFlags 
    ? flagContext.isEnabledEffective('enable_transport_guest_booking') 
    : false;
  const roomServiceEnabled = hasCachedFlags
    ? flagContext.isEnabledEffective('enable_room_service')
    : false;

  // Build nav items based on feature flags
  const navItems = useMemo(() => {
    const items: NavItemDef[] = [...coreNavItems];

    // Add room service if enabled
    if (roomServiceEnabled) {
      items.push(roomServiceNavItem);
    }

    // Add transport if enabled
    if (transportEnabled) {
      items.push(transportNavItem);
    }

    // Add requests if enabled
    if (requestsEnabled) {
      items.push(requestsNavItem);
    }

    // Always add bookings
    items.push(bookingsNavItem);

    // Add loyalty if enabled
    if (isLoyaltyEnabled) {
      items.push(loyaltyNavItem);
    }

    return items;
  }, [transportEnabled, requestsEnabled, roomServiceEnabled, isLoyaltyEnabled]);

  // Show skeleton during initial load (no cached data)
  if (isLoading) {
    return (
    <nav className="flex-shrink-0 z-20 guest-nav-elevated border-t border-border/10" style={{ minHeight: '72px' }}>
        <div 
          className="max-w-lg md:max-w-2xl xl:max-w-3xl mx-auto"
          style={{ 
            height: 'var(--guest-nav-h, 72px)', 
            paddingBottom: 'env(safe-area-inset-bottom, 0px)' 
          }}
        >
          <NavSkeleton />
        </div>
      </nav>
    );
  }

  return (
    <nav className="flex-shrink-0 z-20 guest-nav-elevated border-t border-border/10" style={{ minHeight: '72px' }}>
      <div 
        className="flex items-center justify-around px-2 max-w-lg md:max-w-2xl xl:max-w-3xl mx-auto"
        style={{ 
          height: 'var(--guest-nav-h, 72px)', 
          paddingBottom: 'env(safe-area-inset-bottom, 0px)' 
        }}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== GUEST_ROUTES.HOME && location.pathname.startsWith(item.href));
          return (
            <NavItem 
              key={item.href} 
              item={item} 
              isActive={isActive} 
              label={t(item.labelKey)}
              isPrearrivalRestricted={isPrearrival && item.restrictPrearrival}
            />
          );
        })}
      </div>
    </nav>
  );
}
