import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Home, Users, Calendar, UtensilsCrossed, MoreHorizontal, TrendingUp, Crown, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { ResortRole } from '@/types/database';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useState } from 'react';
import { IconGuests, IconReports, IconSettings } from '@/components/icons/ProperaIcons';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  resortRoles: ResortRole[] | null;
}

const primaryNavItems: NavItem[] = [
  { label: 'Home', href: '/staff/dashboard', icon: Home, resortRoles: null },
  { label: 'Guests', href: '/staff/guests', icon: Users, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE'] },
  { label: 'Activities', href: '/staff/activities/sessions', icon: Calendar, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES'] },
  { label: 'Dining', href: '/staff/restaurants/slots', icon: UtensilsCrossed, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'FNB'] },
];

const moreNavItems: NavItem[] = [
  { label: 'Notifications', href: '/staff/notifications', icon: Bell, resortRoles: null },
  { label: 'Pre-Arrival', href: '/staff/prearrival', icon: TrendingUp, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS'] },
  { label: 'Reports', href: '/staff/reports', icon: IconReports, resortRoles: ['RESORT_ADMIN', 'MANAGER'] },
  { label: 'Loyalty', href: '/staff/loyalty', icon: Crown, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE'] },
  { label: 'Team', href: '/staff/team', icon: IconGuests, resortRoles: null },
  { label: 'Settings', href: '/staff/settings', icon: IconSettings, resortRoles: null },
];

export function MobileBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const { isSuperAdmin, getResortRole } = useAuth();
  const { currentResort } = useResort();
  
  const currentResortRole = currentResort ? getResortRole(currentResort.id) : null;

  const canViewItem = (resortRoles: ResortRole[] | null) => {
    if (isSuperAdmin()) return true;
    if (!resortRoles) return true;
    if (!currentResortRole) return false;
    return resortRoles.includes(currentResortRole);
  };

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const visiblePrimaryItems = primaryNavItems.filter(item => canViewItem(item.resortRoles));
  const visibleMoreItems = moreNavItems.filter(item => canViewItem(item.resortRoles));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden surface-glass-strong border-t border-border/20 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {visiblePrimaryItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <RouterNavLink
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[64px] py-2 px-3 rounded-xl transition-all duration-200",
                "text-muted-foreground",
                active && "text-primary bg-primary/10"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-primary")} />
              <span className={cn(
                "text-[10px] font-medium",
                active && "text-primary"
              )}>
                {item.label}
              </span>
            </RouterNavLink>
          );
        })}
        
        {/* More menu */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-0.5 min-w-[64px] py-2 px-3 rounded-xl text-muted-foreground transition-all duration-200">
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-3xl bg-card dark:bg-midnight-900 border-border/30">
            <SheetHeader className="pb-4">
              <SheetTitle className="text-left">Quick Navigation</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-3 pb-6">
              {visibleMoreItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <RouterNavLink
                    key={item.href}
                    to={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all duration-200",
                      "bg-muted/20 border-border/30 hover:bg-muted/40 dark:bg-midnight-800/50 dark:border-midnight-700/50",
                      active && "bg-primary/10 border-primary/30 text-primary"
                    )}
                  >
                    <Icon className={cn("h-6 w-6", active && "text-primary")} />
                    <span className={cn(
                      "text-xs font-medium text-center",
                      active && "text-primary"
                    )}>
                      {item.label}
                    </span>
                  </RouterNavLink>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
