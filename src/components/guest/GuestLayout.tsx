import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { Home, Calendar, Utensils, ClipboardList, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!guest) {
    return <Navigate to="/guest/login" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Guest Portal</h1>
            <p className="text-xs text-muted-foreground">Room {guest.roomNumber}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20">
        <div className="p-4">
          <Outlet />
        </div>
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/guest' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
