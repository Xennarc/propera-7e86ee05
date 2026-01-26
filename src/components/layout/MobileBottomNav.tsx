import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Home, Users, Calendar, UtensilsCrossed, MoreHorizontal, TrendingUp, Crown, Bell } from 'lucide-react';
import { useNavAccess } from '@/hooks/useNavAccess';
import { ResortRole } from '@/types/database';
import { TierFeature } from '@/lib/tier-features';
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
  tierFeature?: TierFeature;
}

const primaryNavItems: NavItem[] = [
  { label: 'Home', href: '/staff/dashboard', icon: Home, resortRoles: null },
  { label: 'Guests', href: '/staff/guests', icon: Users, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE'] },
  { label: 'Activities', href: '/staff/activities/sessions', icon: Calendar, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES'] },
  { label: 'Dining', href: '/staff/restaurants/slots', icon: UtensilsCrossed, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'FNB'] },
];

const moreNavItems: NavItem[] = [
  { label: 'Notifications', href: '/staff/notifications', icon: Bell, resortRoles: null },
  { label: 'Pre-Arrival', href: '/staff/prearrival', icon: TrendingUp, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS'], tierFeature: 'pre_arrival_links' },
  { label: 'Reports', href: '/staff/reports', icon: IconReports, resortRoles: ['RESORT_ADMIN', 'MANAGER'] },
  { label: 'Loyalty', href: '/staff/loyalty', icon: Crown, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE'], tierFeature: 'loyalty_member_management' },
  { label: 'Team', href: '/staff/team', icon: IconGuests, resortRoles: null },
  { label: 'Settings', href: '/staff/settings', icon: IconSettings, resortRoles: null },
];

export function MobileBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const { canViewNavItem } = useNavAccess();

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const visiblePrimaryItems = primaryNavItems.filter(item => 
    canViewNavItem(item.resortRoles, item.tierFeature)
  );
  const visibleMoreItems = moreNavItems.filter(item => 
    canViewNavItem(item.resortRoles, item.tierFeature)
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden surface-glass-strong border-t border-border/20"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-around h-16 px-1">
        {visiblePrimaryItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <RouterNavLink
              key={item.href}
              to={item.href}
              className={cn(
                // 48px touch target for accessibility
                "flex flex-col items-center justify-center gap-1 min-w-[56px] min-h-[48px] py-1.5 px-2 rounded-xl",
                "transition-all duration-200",
                "text-muted-foreground active:scale-95",
                active && "text-primary"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-10 h-7 rounded-lg transition-colors",
                active && "bg-primary/15"
              )}>
                <Icon className={cn("h-5 w-5", active && "text-primary")} />
              </div>
              <span className={cn(
                "text-[10px] font-medium leading-none",
                active && "text-primary font-semibold"
              )}>
                {item.label}
              </span>
            </RouterNavLink>
          );
        })}
        
        {/* More menu */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button className={cn(
              "flex flex-col items-center justify-center gap-1 min-w-[56px] min-h-[48px] py-1.5 px-2 rounded-xl",
              "text-muted-foreground transition-all duration-200 active:scale-95"
            )}>
              <div className="flex items-center justify-center w-10 h-7 rounded-lg">
                <MoreHorizontal className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-medium leading-none">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-3xl bg-card dark:bg-midnight-900 border-border/30">
            <SheetHeader className="pb-4">
              <SheetTitle className="text-left text-lg">Quick Navigation</SheetTitle>
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
                      // 48px+ touch targets
                      "flex flex-col items-center justify-center gap-2.5 p-4 min-h-[80px] rounded-2xl border",
                      "transition-all duration-200 active:scale-[0.97]",
                      "bg-muted/30 border-border/30 dark:bg-midnight-800/50 dark:border-midnight-700/50",
                      active && "bg-primary/10 border-primary/30 text-primary"
                    )}
                  >
                    <Icon className={cn("h-6 w-6", active && "text-primary")} />
                    <span className={cn(
                      "text-xs font-medium text-center leading-tight",
                      active && "text-primary font-semibold"
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
