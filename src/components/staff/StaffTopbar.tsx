import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { StaffBreadcrumbs } from '@/components/layout/StaffBreadcrumbs';
import { ProperaMark } from '@/components/icons/ProperaLogo';
import {
  Menu,
  Search,
  User,
  LogOut,
  Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StaffTopbarProps {
  onMenuClick: () => void;
  onCommandBarOpen: () => void;
}

// Page title mapping
const getPageTitle = (pathname: string): string => {
  const routes: Record<string, string> = {
    '/staff/dashboard': 'Today',
    '/staff': 'Today',
    '/staff/guests': 'Guests',
    '/staff/prearrival': 'Pre-Arrival',
    '/staff/guest-requests': 'Guest Requests',
    '/staff/activities': 'Activities',
    '/staff/activities/sessions': 'Sessions',
    '/staff/activities/cheatsheet': 'Cheat Sheet',
    '/staff/restaurants': 'Restaurants',
    '/staff/restaurants/slots': 'Dining Slots',
    '/staff/reports': 'Reports',
    '/staff/settings': 'Settings',
    '/staff/loyalty': 'Loyalty',
    '/staff/team': 'Team',
  };

  // Check for exact match first
  if (routes[pathname]) return routes[pathname];

  // Check for partial matches
  for (const [route, title] of Object.entries(routes)) {
    if (pathname.startsWith(route) && route !== '/staff') {
      return title;
    }
  }

  return 'Dashboard';
};

export function StaffTopbar({ onMenuClick, onCommandBarOpen }: StaffTopbarProps) {
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { currentResort } = useResort();

  const pageTitle = getPageTitle(location.pathname);

  return (
    <header className="sticky top-0 z-20 h-14 border-b border-border/40 bg-background">
      <div className="flex h-full items-center justify-between px-4 lg:px-6 gap-4">
        {/* Left side */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Mobile Menu */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden -ml-1 h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Mobile: Logo + Resort */}
          <div className="flex items-center gap-2 lg:hidden min-w-0">
            <ProperaMark size={20} className="text-primary shrink-0" />
            <span className="text-sm font-medium text-muted-foreground truncate">
              {currentResort?.name || 'Select Resort'}
            </span>
          </div>

          {/* Desktop: Page title + breadcrumbs */}
          <div className="hidden lg:flex flex-col min-w-0">
            <h1 className="text-lg font-semibold text-foreground leading-tight">
              {pageTitle}
            </h1>
            <StaffBreadcrumbs className="text-xs text-muted-foreground" />
          </div>
        </div>

        {/* Right side - minimal */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Search trigger */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onCommandBarOpen}
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            <Search className="h-4 w-4" />
          </Button>

          <NotificationBell />

          {/* User Menu - compact */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-foreground text-xs font-semibold">
                  {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium truncate">{profile?.full_name || 'Staff'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
