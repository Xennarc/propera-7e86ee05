import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { Home, Calendar, Utensils, ClipboardList, LogOut, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';

const navItems = [
  { icon: Home, label: 'Home', href: '/guest' },
  { icon: Calendar, label: 'Activities', href: '/guest/activities' },
  { icon: Utensils, label: 'Dining', href: '/guest/restaurants' },
  { icon: ClipboardList, label: 'Bookings', href: '/guest/bookings' },
];

export function GuestLayout() {
  const { guest, loading, logout } = useGuestAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/5 to-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading your experience...</p>
        </div>
      </div>
    );
  }

  if (!guest) {
    return <Navigate to="/guest/login" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Premium Header */}
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b border-border/50 shadow-sm">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Waves className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">Guest Portal</h1>
              <p className="text-xs text-muted-foreground">Room {guest.roomNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle className="text-muted-foreground hover:text-foreground" />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={logout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content with extra padding for bottom nav */}
      <main className="flex-1 overflow-auto pb-24">
        <div className="p-4 max-w-lg mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Premium Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 bg-card/90 backdrop-blur-lg border-t border-border/50 shadow-elevated">
        <div className="flex h-20 items-center justify-around px-2 max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/guest' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl transition-all",
                  isActive 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                <span className={cn(
                  "text-xs font-medium",
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
