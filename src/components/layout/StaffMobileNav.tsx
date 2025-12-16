import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import {
  IconDashboard,
  IconGuests,
  IconActivities,
  IconRestaurants,
} from '@/components/icons/ProperaIcons';
import { MoreHorizontal } from 'lucide-react';

const mobileNavItems = [
  { title: 'Home', url: '/staff/dashboard', icon: IconDashboard },
  { title: 'Guests', url: '/staff/guests', icon: IconGuests, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE'] },
  { title: 'Activities', url: '/staff/activities/sessions', icon: IconActivities, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES'] },
  { title: 'Dining', url: '/staff/restaurants/slots', icon: IconRestaurants, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'FNB'] },
];

interface StaffMobileNavProps {
  onMoreClick: () => void;
}

export function StaffMobileNav({ onMoreClick }: StaffMobileNavProps) {
  const location = useLocation();
  const { isSuperAdmin, getResortRole } = useAuth();
  const { currentResort } = useResort();
  
  const currentResortRole = currentResort ? getResortRole(currentResort.id) : null;

  const canViewItem = (roles?: string[]) => {
    if (isSuperAdmin()) return true;
    if (!roles) return true;
    if (!currentResortRole) return false;
    return roles.includes(currentResortRole);
  };

  const visibleItems = mobileNavItems.filter(item => canViewItem(item.roles));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card/95 backdrop-blur-xl border-t border-border safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {visibleItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.url || 
            (item.url !== '/staff/dashboard' && location.pathname.startsWith(item.url.replace('/sessions', '').replace('/slots', '')));
          
          return (
            <NavLink
              key={item.url}
              to={item.url}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl min-w-[64px] transition-all duration-200",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground active:scale-95"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "scale-110")} />
              <span className="text-[10px] font-medium">{item.title}</span>
            </NavLink>
          );
        })}
        
        {/* More button to open full menu */}
        <button
          onClick={onMoreClick}
          className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl min-w-[64px] text-muted-foreground hover:text-foreground active:scale-95 transition-all duration-200"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </nav>
  );
}
