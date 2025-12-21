import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useTierAccess } from '@/hooks/useTierAccess';
import { ResortRole } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  Plane,
  Clock,
  ChevronDown,
  ChevronRight,
  Building2,
  Crown,
  LogOut,
  MessageSquare,
  User,
  Sparkles,
  HelpCircle,
  TrendingUp,
  FileText,
  Shield,
  Palette,
} from 'lucide-react';
import { ProperaMark } from '@/components/icons/ProperaLogo';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ResortRole[];
  badge?: string;
}

interface NavGroup {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  defaultOpen?: boolean;
}

interface StaffSidebarProps {
  onNavigate?: () => void;
  collapsed?: boolean;
}

export function StaffSidebar({ onNavigate, collapsed = false }: StaffSidebarProps) {
  const location = useLocation();
  const { user, profile, signOut, isSuperAdmin, getResortRole } = useAuth();
  const { resorts, currentResort, setCurrentResort } = useResort();
  const permissions = usePermissions();

  const currentRole = currentResort ? getResortRole(currentResort.id) : null;
  const isAdmin = isSuperAdmin() || currentRole === 'RESORT_ADMIN';

  // Check if user can view nav item
  const canView = (roles?: ResortRole[]) => {
    if (isSuperAdmin()) return true;
    if (!roles) return true;
    if (!currentRole) return false;
    return roles.includes(currentRole);
  };

  // Get role display
  const getRoleDisplay = () => {
    if (isSuperAdmin()) return 'Super Admin';
    const roleMap: Record<ResortRole, string> = {
      'RESORT_ADMIN': 'Resort Admin',
      'MANAGER': 'Manager',
      'FRONT_OFFICE': 'Front Office',
      'RESERVATIONS': 'Reservations',
      'ACTIVITIES': 'Activities',
      'FNB': 'F&B',
    };
    return currentRole ? roleMap[currentRole] : 'Staff';
  };

  // Navigation structure - 3 layers: Today, Departments, Admin
  const navGroups: NavGroup[] = [
    {
      id: 'operations',
      title: 'Operations',
      icon: Calendar,
      defaultOpen: true,
      items: [
        { title: 'Dashboard', url: '/staff/dashboard', icon: Building2 },
        { title: "Today's View", url: '/staff/today', icon: TrendingUp, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES', 'FNB'] },
        { title: 'Team Directory', url: '/staff/team', icon: Users },
      ],
    },
    {
      id: 'guests',
      title: 'Guests',
      icon: Users,
      items: [
        { title: 'All Guests', url: '/staff/guests', icon: Users, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE'] },
        { title: 'Pre-Arrival', url: '/staff/prearrival', icon: Plane, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS'] },
        { title: 'Requests', url: '/staff/guest-requests', icon: MessageSquare, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES', 'FNB'] },
      ],
    },
    {
      id: 'activities',
      title: 'Activities',
      icon: Activity,
      items: [
        { title: 'Catalogue', url: '/staff/activities', icon: Activity, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES'] },
        { title: 'Sessions', url: '/staff/activities/sessions', icon: Clock, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES'] },
        { title: 'Cheat Sheet', url: '/staff/activities/cheatsheet', icon: FileText, roles: ['RESORT_ADMIN', 'FRONT_OFFICE', 'ACTIVITIES'] },
      ],
    },
    {
      id: 'dining',
      title: 'Dining',
      icon: UtensilsCrossed,
      items: [
        { title: 'Restaurants', url: '/staff/restaurants', icon: UtensilsCrossed, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'FNB'] },
        { title: 'Time Slots', url: '/staff/restaurants/slots', icon: Clock, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'FNB'] },
      ],
    },
    {
      id: 'loyalty',
      title: 'Loyalty',
      icon: Crown,
      items: [
        { title: 'Members', url: '/staff/loyalty', icon: Crown, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE'] },
        { title: 'Program', url: '/staff/loyalty/program', icon: Settings, roles: ['RESORT_ADMIN'] },
        { title: 'Tiers', url: '/staff/loyalty/tiers', icon: Sparkles, roles: ['RESORT_ADMIN'] },
      ],
    },
    {
      id: 'reports',
      title: 'Reports',
      icon: BarChart3,
      items: [
        { title: 'Overview', url: '/staff/reports', icon: BarChart3, roles: ['RESORT_ADMIN', 'MANAGER'] },
        { title: 'Activities', url: '/staff/reports/activities', icon: Activity, roles: ['RESORT_ADMIN', 'MANAGER', 'ACTIVITIES'] },
        { title: 'Restaurants', url: '/staff/reports/restaurants', icon: UtensilsCrossed, roles: ['RESORT_ADMIN', 'MANAGER', 'FNB'] },
        { title: 'Guests', url: '/staff/reports/guests', icon: Users, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE'] },
        { title: 'Sales', url: '/staff/reports/sales', icon: TrendingUp, roles: ['RESORT_ADMIN', 'MANAGER'] },
        { title: 'Cancellations', url: '/staff/reports/cancellations', icon: FileText, roles: ['RESORT_ADMIN', 'MANAGER'] },
        { title: 'Stay Feedback', url: '/staff/reports/stay-feedback', icon: MessageSquare, roles: ['RESORT_ADMIN', 'MANAGER'] },
      ],
    },
  ];

  // Admin group (only for admins)
  const adminGroup: NavGroup = {
    id: 'admin',
    title: 'Admin',
    icon: Settings,
    items: [
      { title: 'Resort Staff', url: '/staff/settings/resort-staff', icon: Users, roles: ['RESORT_ADMIN'] },
      { title: 'Pre-Arrival Settings', url: '/staff/settings/prearrival', icon: Plane, roles: ['RESORT_ADMIN'] },
      { title: 'Branding', url: '/staff/settings/branding', icon: Palette, roles: ['RESORT_ADMIN'] },
      { title: 'Settings', url: '/staff/settings', icon: Settings, roles: ['RESORT_ADMIN'] },
      { title: 'Access Control', url: '/staff/settings/access', icon: Shield, roles: ['RESORT_ADMIN'] },
    ],
  };

  // Check if group has any visible items
  const groupHasVisibleItems = (group: NavGroup) => {
    return group.items.some(item => canView(item.roles));
  };

  // Check if current path is in group
  const isGroupActive = (group: NavGroup) => {
    return group.items.some(item => location.pathname.startsWith(item.url));
  };

  // Track open groups
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navGroups.forEach(g => {
      initial[g.id] = g.defaultOpen || isGroupActive(g);
    });
    initial['admin'] = isGroupActive(adminGroup);
    return initial;
  });

  const toggleGroup = (id: string) => {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <ProperaMark size={36} className="text-sidebar-primary shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-base font-bold text-sidebar-foreground truncate">Propera</h1>
              <p className="text-xs text-sidebar-foreground/50">Staff Console</p>
            </div>
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
              <SelectTrigger className="w-full bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent h-11">
                <SelectValue placeholder="Select resort" />
              </SelectTrigger>
              <SelectContent>
                {resorts.map((resort) => (
                  <SelectItem key={resort.id} value={resort.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{resort.name}</span>
                      {resort.is_demo && (
                        <Badge variant="outline" className="text-2xs px-1 py-0 shrink-0">DEMO</Badge>
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
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {/* Super Admin Link */}
          {isSuperAdmin() && (
            <div className="mb-4">
              <NavLink
                to="/superadmin"
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-primary/20 text-sidebar-primary'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )
                }
              >
                <Crown className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Command Center</span>}
              </NavLink>
            </div>
          )}

          {/* Nav Groups */}
          {navGroups.map((group) => {
            if (!groupHasVisibleItems(group)) return null;

            const isOpen = openGroups[group.id];
            const Icon = group.icon;

            return (
              <Collapsible
                key={group.id}
                open={isOpen}
                onOpenChange={() => toggleGroup(group.id)}
              >
                <CollapsibleTrigger
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                    isGroupActive(group) && 'text-sidebar-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{group.title}</span>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )}
                    </>
                  )}
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-1 ml-4 pl-3 border-l border-sidebar-border/50 space-y-1">
                  {group.items.map((item) => {
                    if (!canView(item.roles)) return null;

                    return (
                      <NavLink
                        key={item.url}
                        to={item.url}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                            isActive
                              ? 'bg-sidebar-primary/20 text-sidebar-primary font-medium'
                              : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                          )
                        }
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                        {item.badge && !collapsed && (
                          <Badge variant="secondary" className="ml-auto text-2xs">
                            {item.badge}
                          </Badge>
                        )}
                      </NavLink>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {/* Admin Group */}
          {isAdmin && groupHasVisibleItems(adminGroup) && (
            <div className="pt-4 mt-4 border-t border-sidebar-border/50">
              <Collapsible
                open={openGroups['admin']}
                onOpenChange={() => toggleGroup('admin')}
              >
                <CollapsibleTrigger
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                    isGroupActive(adminGroup) && 'text-sidebar-foreground'
                  )}
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">Admin</span>
                      {openGroups['admin'] ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )}
                    </>
                  )}
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-1 ml-4 pl-3 border-l border-sidebar-border/50 space-y-1">
                  {adminGroup.items.map((item) => {
                    if (!canView(item.roles)) return null;

                    return (
                      <NavLink
                        key={item.url}
                        to={item.url}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                            isActive
                              ? 'bg-sidebar-primary/20 text-sidebar-primary font-medium'
                              : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                          )
                        }
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-foreground text-sm font-bold shrink-0">
            {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.full_name || 'Staff User'}
              </p>
              <p className="text-xs text-sidebar-foreground/50 truncate">
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
                className="shrink-0 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Sign out</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
