import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { usePermissions } from '@/hooks/usePermissions';
import { ResortRole } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Users,
  UtensilsCrossed,
  Activity,
  Settings,
  BarChart3,
  LogOut,
  Crown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ProperaMark } from '@/components/icons/ProperaLogo';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ResortRole[];
  adminOnly?: boolean;
}

interface StaffSidebarProps {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function StaffSidebar({ onNavigate, collapsed = false, onToggleCollapse }: StaffSidebarProps) {
  const location = useLocation();
  const { user, profile, signOut, isSuperAdmin, getResortRole } = useAuth();
  const { resorts, currentResort, setCurrentResort } = useResort();
  const permissions = usePermissions();

  const currentRole = currentResort ? getResortRole(currentResort.id) : null;
  const isAdmin = isSuperAdmin() || currentRole === 'RESORT_ADMIN';

  // Check if user can view nav item
  const canView = (item: NavItem) => {
    if (isSuperAdmin()) return true;
    if (item.adminOnly && !isAdmin) return false;
    if (!item.roles) return true;
    if (!currentRole) return false;
    return item.roles.includes(currentRole);
  };

  // Get role display
  const getRoleDisplay = () => {
    if (isSuperAdmin()) return 'Super Admin';
    const roleMap: Record<ResortRole, string> = {
      'RESORT_ADMIN': 'Admin',
      'MANAGER': 'Manager',
      'FRONT_OFFICE': 'Front Office',
      'RESERVATIONS': 'Reservations',
      'ACTIVITIES': 'Activities',
      'FNB': 'F&B',
    };
    return currentRole ? roleMap[currentRole] : 'Staff';
  };

  // Minimal 6-item navigation
  const navItems: NavItem[] = [
    { 
      title: 'Today', 
      url: '/staff/dashboard', 
      icon: Calendar,
    },
    { 
      title: 'Guests', 
      url: '/staff/guests', 
      icon: Users,
      roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS'],
    },
    { 
      title: 'Activities', 
      url: '/staff/activities/sessions', 
      icon: Activity,
      roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES'],
    },
    { 
      title: 'Dining', 
      url: '/staff/restaurants/slots', 
      icon: UtensilsCrossed,
      roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'FNB'],
    },
    { 
      title: 'Reports', 
      url: '/staff/reports', 
      icon: BarChart3,
      roles: ['RESORT_ADMIN', 'MANAGER'],
    },
    { 
      title: 'Settings', 
      url: '/staff/settings', 
      icon: Settings,
      adminOnly: true,
    },
  ];

  const isActive = (url: string) => {
    if (url === '/staff/dashboard') {
      return location.pathname === '/staff/dashboard' || location.pathname === '/staff' || location.pathname === '/staff/';
    }
    return location.pathname.startsWith(url);
  };

  return (
    <div className="flex h-full flex-col bg-card border-r border-border/50">
      {/* Header */}
      <div className="p-4 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ProperaMark size={28} className="text-primary shrink-0" />
            {!collapsed && (
              <span className="font-semibold text-foreground">Propera</span>
            )}
          </div>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}
        </div>

        {/* Resort Switcher */}
        {!collapsed && resorts.length > 0 && (
          <div className="mt-4">
            <Select
              value={currentResort?.id || ''}
              onValueChange={(value) => {
                const resort = resorts.find(r => r.id === value);
                setCurrentResort(resort || null);
              }}
            >
              <SelectTrigger className="w-full h-10 bg-muted/50 border-0 text-sm font-medium">
                <SelectValue placeholder="Select resort" />
              </SelectTrigger>
              <SelectContent>
                {resorts.map((resort) => (
                  <SelectItem key={resort.id} value={resort.id}>
                    <div className="flex items-center gap-2">
                      <span className="truncate">{resort.name}</span>
                      {resort.is_demo && (
                        <Badge variant="outline" className="text-2xs px-1 py-0 shrink-0">Demo</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {/* Super Admin Link */}
        {isSuperAdmin() && (
          <NavLink
            to="/superadmin"
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <Crown className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Command Center</span>}
          </NavLink>
        )}

        {/* Main Nav Items */}
        {navItems.map((item) => {
          if (!canView(item)) return null;

          return (
            <Tooltip key={item.url} delayDuration={collapsed ? 0 : 1000}>
              <TooltipTrigger asChild>
                <NavLink
                  to={item.url}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                    isActive(item.url)
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">{item.title}</TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </nav>

      {/* Footer - User */}
      <div className="p-3 border-t border-border/30">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground text-xs font-semibold shrink-0">
            {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile?.full_name || 'Staff'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {getRoleDisplay()}
              </p>
            </div>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut()}
                className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={collapsed ? 'right' : 'top'}>Sign out</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
