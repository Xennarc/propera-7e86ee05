import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { useIsPrearrivalGuest } from '@/hooks/usePrearrivalData';
import { useResortBranding, getBrandingWithDefaults } from '@/hooks/useResortBranding';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GuestNotificationBell } from '@/components/notifications/GuestNotificationBell';
import { useEffect, useRef, useState, useMemo, memo } from 'react';
import {
  IconStay,
  IconActivities,
  IconRestaurants,
  IconBookings,
  IconLogout,
} from '@/components/icons/ProperaIcons';
import { ProperaMark, ProperaLoader } from '@/components/icons/ProperaLogo';
import { Crown, Bell, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const baseNavItems = [
  { icon: IconStay, labelKey: 'nav.home', href: '/guest', key: 'guest-home' },
  { icon: IconActivities, labelKey: 'nav.activities', href: '/guest/activities', key: 'guest-activities' },
  { icon: Bell, labelKey: 'nav.requests', href: '/guest/requests', key: 'guest-requests', restrictPrearrival: true },
  { icon: IconBookings, labelKey: 'nav.bookings', href: '/guest/bookings', key: 'guest-bookings' },
];

const loyaltyNavItem = { icon: Crown, labelKey: 'nav.loyalty', href: '/guest/loyalty', key: 'guest-loyalty' };

// Store scroll positions per tab
const scrollPositions = new Map<string, number>();

// Memoized nav item with unified lime indicator
const NavItem = memo(({ item, isActive, label, isPrearrivalRestricted }: { 
  item: { icon: React.ComponentType<{ className?: string }>; href: string }; 
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
      {/* Unified lime dot indicator */}
      {isActive && (
        <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--lime-400))]" />
      )}
      <div className="relative">
        <Icon className={cn(
          "h-5 w-5 sm:h-6 sm:w-6 transition-transform",
          isActive && "scale-110"
        )} />
        {/* Lock overlay for pre-arrival restricted items */}
        {isPrearrivalRestricted && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-2 w-2 text-muted-foreground" />
          </div>
        )}
      </div>
      <span className={cn(
        "text-[10px] sm:text-[11px] font-medium transition-all",
        isActive && "font-bold text-primary"
      )}>
        {label}
      </span>
    </Link>
  );
});
NavItem.displayName = 'NavItem';

export function GuestLayout() {
  const { guest, loading, logout } = useGuestAuth();
  const { isPrearrival } = useIsPrearrivalGuest();
  const { t } = useTranslation();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Set initialized once loading completes (prevents flash)
  useEffect(() => {
    if (!loading) {
      setIsInitialized(true);
    }
  }, [loading]);

  // Fetch branding dynamically from DB - this ensures immediate updates after staff saves
  const { data: brandingData } = useResortBranding(guest?.resortId);
  const branding = getBrandingWithDefaults(brandingData);

  // Check if loyalty program is enabled for this resort
  const { data: loyaltyProgram } = useQuery({
    queryKey: ['guest-loyalty-program', guest?.resortId],
    queryFn: async () => {
      if (!guest?.resortId) return null;
      const { data, error } = await supabase
        .from('loyalty_programs')
        .select('is_enabled')
        .eq('resort_id', guest.resortId)
        .eq('is_enabled', true)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!guest?.resortId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  const isLoyaltyEnabled = !!loyaltyProgram?.is_enabled;

  // Build nav items based on loyalty status
  const navItems = useMemo(() => {
    return isLoyaltyEnabled ? [...baseNavItems, loyaltyNavItem] : baseNavItems;
  }, [isLoyaltyEnabled]);

  // Get current tab key
  const currentTab = navItems.find(item => 
    location.pathname === item.href || 
    (item.href !== '/guest' && location.pathname.startsWith(item.href))
  )?.key || 'guest-home';

  // Track scroll for header shadow
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    const handleScroll = () => {
      scrollPositions.set(currentTab, main.scrollTop);
      setIsScrolled(main.scrollTop > 10);
    };

    main.addEventListener('scroll', handleScroll, { passive: true });
    return () => main.removeEventListener('scroll', handleScroll);
  }, [currentTab]);

  // Restore scroll position when tab changes
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    const savedPosition = scrollPositions.get(currentTab);
    if (savedPosition !== undefined) {
      requestAnimationFrame(() => {
        main.scrollTop = savedPosition;
      });
    } else {
      main.scrollTop = 0;
    }
    setIsScrolled(false);
  }, [currentTab]);

  if (loading || !isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center hero-pattern">
        <ProperaLoader size={64} text="Loading your experience..." />
      </div>
    );
  }

  if (!guest) {
    return <Navigate to="/guest/login" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Mobile-optimized Header with glassmorphism */}
      <header className={cn(
        "sticky top-0 z-20 surface-glass-strong border-b transition-all duration-200 safe-area-inset-top",
        isScrolled ? "border-border/30 shadow-lg shadow-black/5" : "border-transparent"
      )}>
        <div className="flex h-14 sm:h-16 items-center justify-between px-4 max-w-lg mx-auto">
          <Link 
            to="/guest/profile" 
            className="flex items-center gap-2.5 sm:gap-3 min-w-0 group"
          >
            {/* Use branding logo from DB (fresh on each load) */}
            {branding.login_logo_url ? (
              <img 
                src={branding.login_logo_url} 
                alt={branding.name || guest?.resortName || 'Resort'} 
                loading="eager"
                decoding="async"
                className="h-10 w-10 object-contain flex-shrink-0 rounded-lg transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-105">
                <ProperaMark size={28} className="text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-foreground truncate group-hover:text-primary transition-colors">
                {branding.name || guest?.resortName || 'Guest Portal'}
              </h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                Room {guest?.roomNumber}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            <ThemeToggle className="text-muted-foreground hover:text-foreground h-9 w-9 sm:h-10 sm:w-10 tap-target" />
            <GuestNotificationBell />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={logout}
              className="text-muted-foreground hover:text-foreground rounded-xl h-9 w-9 sm:h-10 sm:w-10 tap-target"
              title={t('nav.logout')}
            >
              <IconLogout className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content with safe-area-aware bottom padding */}
      <main 
        ref={mainRef} 
        className="flex-1 overflow-auto guest-safe-bottom scroll-smooth-touch gpu-scroll touch-scroll"
      >
        <div className="p-4 max-w-lg mx-auto animate-fade-in contain-layout">
          <Outlet />
        </div>
      </main>

      {/* Mobile-optimized Bottom Navigation with glassmorphism + safe area */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 guest-glass-bar border-t border-border/20 contain-layout">
        <div 
          className="flex items-center justify-around px-2 max-w-lg mx-auto"
          style={{ 
            height: 'var(--guest-nav-h)', 
            paddingBottom: 'env(safe-area-inset-bottom, 0px)' 
          }}
        >
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/guest' && location.pathname.startsWith(item.href));
            const itemWithRestriction = item as typeof item & { restrictPrearrival?: boolean };
            return (
              <NavItem 
                key={item.href} 
                item={item} 
                isActive={isActive} 
                label={t(item.labelKey)}
                isPrearrivalRestricted={isPrearrival && itemWithRestriction.restrictPrearrival}
              />
            );
          })}
        </div>
      </nav>
    </div>
  );
}
