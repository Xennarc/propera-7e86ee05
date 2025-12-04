import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GuestNotificationBell } from '@/components/notifications/GuestNotificationBell';
import { useEffect, useRef } from 'react';
import {
  IconPropera,
  IconStay,
  IconActivities,
  IconRestaurants,
  IconBookings,
  IconLogout,
} from '@/components/icons/ProperaIcons';

const navItems = [
  { icon: IconStay, label: 'Home', href: '/guest', key: 'guest-home' },
  { icon: IconActivities, label: 'Activities', href: '/guest/activities', key: 'guest-activities' },
  { icon: IconRestaurants, label: 'Dining', href: '/guest/restaurants', key: 'guest-dining' },
  { icon: IconBookings, label: 'Bookings', href: '/guest/bookings', key: 'guest-bookings' },
];

// Store scroll positions per tab
const scrollPositions = new Map<string, number>();

export function GuestLayout() {
  const { guest, loading, logout } = useGuestAuth();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  // Get current tab key
  const currentTab = navItems.find(item => 
    location.pathname === item.href || 
    (item.href !== '/guest' && location.pathname.startsWith(item.href))
  )?.key || 'guest-home';

  // Save scroll position when navigating away
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    const handleScroll = () => {
      scrollPositions.set(currentTab, main.scrollTop);
    };

    main.addEventListener('scroll', handleScroll);
    return () => main.removeEventListener('scroll', handleScroll);
  }, [currentTab]);

  // Restore scroll position when tab changes
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    const savedPosition = scrollPositions.get(currentTab);
    if (savedPosition !== undefined) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        main.scrollTop = savedPosition;
      });
    } else {
      main.scrollTop = 0;
    }
  }, [currentTab]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center hero-pattern">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse-soft">
            <IconPropera className="h-8 w-8 text-primary" />
          </div>
          <p className="text-muted-foreground font-medium">Loading your experience...</p>
        </div>
      </div>
    );
  }

  if (!guest) {
    return <Navigate to="/guest/login" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Mobile-optimized Header */}
      <header className="sticky top-0 z-10 glass-dark border-b border-border/30 shadow-soft safe-area-inset-top">
        <div className="flex h-14 sm:h-16 items-center justify-between px-4 max-w-lg mx-auto">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-primary/10 shadow-sm flex-shrink-0">
              <IconPropera className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-foreground truncate">Guest Portal</h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground font-medium">Room {guest.roomNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            <ThemeToggle className="text-muted-foreground hover:text-foreground h-9 w-9 sm:h-10 sm:w-10" />
            <GuestNotificationBell />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={logout}
              className="text-muted-foreground hover:text-foreground rounded-xl h-9 w-9 sm:h-10 sm:w-10"
            >
              <IconLogout className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content with bottom nav padding */}
      <main ref={mainRef} className="flex-1 overflow-auto pb-24 sm:pb-28">
        <div className="p-4 max-w-lg mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile-optimized Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 bg-card/95 backdrop-blur-xl border-t border-border/30 shadow-elevated safe-area-inset-bottom">
        <div className="flex h-16 sm:h-20 items-center justify-around px-2 max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/guest' && location.pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl transition-all duration-300 min-w-[60px]",
                  isActive 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", isActive && "text-primary")} />
                <span className={cn(
                  "text-[10px] sm:text-[11px] font-semibold",
                  isActive && "text-primary"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
