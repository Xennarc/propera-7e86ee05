import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { useResortBranding, getBrandingWithDefaults } from '@/hooks/useResortBranding';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GuestNotificationBell } from '@/components/notifications/GuestNotificationBell';
import { useEffect, useRef, useState, useMemo, useCallback, memo } from 'react';
import {
  IconStay,
  IconActivities,
  IconRestaurants,
  IconBookings,
  IconLogout,
} from '@/components/icons/ProperaIcons';
import { ProperaMark, ProperaLoader } from '@/components/icons/ProperaLogo';
import { Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const baseNavItems = [
  { icon: IconStay, labelKey: 'nav.home', href: '/guest', key: 'guest-home', activeColor: 'text-primary', activeBg: 'bg-primary/10' },
  { icon: IconActivities, labelKey: 'nav.activities', href: '/guest/activities', key: 'guest-activities', activeColor: 'text-lagoon', activeBg: 'bg-lagoon/10' },
  { icon: IconRestaurants, labelKey: 'nav.dining', href: '/guest/restaurants', key: 'guest-dining', activeColor: 'text-sunset', activeBg: 'bg-sunset/10' },
  { icon: IconBookings, labelKey: 'nav.bookings', href: '/guest/bookings', key: 'guest-bookings', activeColor: 'text-orchid', activeBg: 'bg-orchid/10' },
];

const loyaltyNavItem = { icon: Crown, labelKey: 'nav.loyalty', href: '/guest/loyalty', key: 'guest-loyalty', activeColor: 'text-amber-500', activeBg: 'bg-amber-500/10' };

// Store scroll positions per tab
const scrollPositions = new Map<string, number>();

// Memoized nav item for better mobile performance
const NavItem = memo(({ item, isActive, label }: { 
  item: { icon: React.ComponentType<{ className?: string }>; href: string; activeColor: string; activeBg: string }; 
  isActive: boolean; 
  label: string;
}) => {
  const Icon = item.icon;
  return (
    <Link
      to={item.href}
      className={cn(
        "guest-nav-item relative min-w-[60px] tap-target touch-passive",
        isActive 
          ? `${item.activeColor} ${item.activeBg}` 
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      {isActive && (
        <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current" />
      )}
      <Icon className={cn(
        "h-5 w-5 sm:h-6 sm:w-6 transition-transform",
        isActive && "scale-110"
      )} />
      <span className={cn(
        "text-[10px] sm:text-[11px] font-semibold transition-all",
        isActive && "font-bold"
      )}>
        {label}
      </span>
    </Link>
  );
});
NavItem.displayName = 'NavItem';

export function GuestLayout() {
  const { guest, loading, logout } = useGuestAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

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

  if (loading) {
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
      {/* Mobile-optimized Header with dynamic shadow */}
      <header className={cn(
        "sticky top-0 z-20 bg-card/95 backdrop-blur-xl border-b transition-all duration-200 safe-area-inset-top",
        isScrolled ? "border-border/50 shadow-sm" : "border-transparent"
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

      {/* Main content with optimized padding and GPU acceleration */}
      <main 
        ref={mainRef} 
        className="flex-1 overflow-auto pb-24 sm:pb-28 scroll-smooth-touch gpu-scroll touch-scroll"
      >
        <div className="p-4 max-w-lg mx-auto animate-fade-in contain-layout">
          <Outlet />
        </div>
      </main>

      {/* Mobile-optimized Bottom Navigation with active indicator */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-card/98 backdrop-blur-xl border-t border-border/30 shadow-guest-elevated safe-area-inset-bottom contain-layout">
        <div className="flex h-16 sm:h-20 items-center justify-around px-2 max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/guest' && location.pathname.startsWith(item.href));
            return (
              <NavItem 
                key={item.href} 
                item={item} 
                isActive={isActive} 
                label={t(item.labelKey)} 
              />
            );
          })}
        </div>
      </nav>
    </div>
  );
}
