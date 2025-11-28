import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  IconPropera,
  IconStay,
  IconActivities,
  IconRestaurants,
  IconBookings,
  IconLogout,
} from '@/components/icons/ProperaIcons';

const navItems = [
  { icon: IconStay, label: 'Home', href: '/guest' },
  { icon: IconActivities, label: 'Activities', href: '/guest/activities' },
  { icon: IconRestaurants, label: 'Dining', href: '/guest/restaurants' },
  { icon: IconBookings, label: 'Bookings', href: '/guest/bookings' },
];

export function GuestLayout() {
  const { guest, loading, logout } = useGuestAuth();
  const location = useLocation();

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
      {/* Premium Header */}
      <header className="sticky top-0 z-10 glass-dark border-b border-border/30 shadow-soft">
        <div className="flex h-16 items-center justify-between px-4 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 shadow-sm">
              <IconPropera className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">Guest Portal</h1>
              <p className="text-xs text-muted-foreground font-medium">Room {guest.roomNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle className="text-muted-foreground hover:text-foreground" />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={logout}
              className="text-muted-foreground hover:text-foreground rounded-xl"
            >
              <IconLogout className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content with extra padding for bottom nav */}
      <main className="flex-1 overflow-auto pb-28">
        <div className="p-4 max-w-lg mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Premium Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 bg-card/95 backdrop-blur-xl border-t border-border/30 shadow-elevated">
        <div className="flex h-22 items-center justify-around px-2 max-w-lg mx-auto pb-safe">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/guest' && location.pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl transition-all duration-300",
                  isActive 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className={cn("h-6 w-6", isActive && "text-primary")} />
                <span className={cn(
                  "text-[11px] font-semibold",
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
