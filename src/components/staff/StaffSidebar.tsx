import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { useNavAccess } from '@/hooks/useNavAccess';
import { useResortSettings } from '@/hooks/useResortSettings';
import { useFeatureFlagAccessSafe } from '@/providers/FeatureFlagsProvider';
import { useIsDriver } from '@/hooks/transport';
import { ResortRole } from '@/types/database';
import { TierFeature } from '@/lib/tier-features';
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
  Building2,
  Crown,
  LogOut,
  MessageSquare,
  Sparkles,
  TrendingUp,
  FileText,
  Shield,
  Palette,
  Car,
  CircleUser,
} from 'lucide-react';
import { ProperaMark } from '@/components/icons/ProperaLogo';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ResortRole[];
  tierFeature?: TierFeature;
  badge?: string;
  /** Feature flags required for this item to be visible */
  requiredFlags?: string[];
  /** If true, visibility is controlled by custom logic (e.g., isDriver) */
  customVisibility?: boolean;
}

interface NavGroup {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  defaultOpen?: boolean;
  /** Feature flags required for the entire group to be visible */
  requiredFlags?: string[];
  /** If true, visibility is controlled by custom logic */
  customVisibility?: boolean;
}

interface StaffSidebarProps {
  onNavigate?: () => void;
  collapsed?: boolean;
}

export function StaffSidebar({ onNavigate, collapsed = false }: StaffSidebarProps) {
  const location = useLocation();
  const { user, profile, signOut, isSuperAdmin, getResortRole } = useAuth();
  const { resorts, currentResort, setCurrentResort } = useResort();
  const { canViewNavItem, currentRole } = useNavAccess();
  const flagContext = useFeatureFlagAccessSafe();
  const { data: driverRecord } = useIsDriver(currentResort?.id);
  
  // Module feature flags (legacy settings-based)
  const { data: settings } = useResortSettings(currentResort?.id);
  const transportEnabled = settings?.transport_enabled ?? false;

  const isAdmin = isSuperAdmin() || currentRole === 'RESORT_ADMIN';
  const isDriver = !!driverRecord;

  // Feature flag check helper
  const checkFeatureFlags = (requiredFlags?: string[]): boolean => {
    if (!requiredFlags || requiredFlags.length === 0) return true;
    if (!flagContext || flagContext.loading) return true; // Fail open during loading
    return requiredFlags.every(flag => flagContext.isEnabledEffective(flag));
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
      'TRANSPORT': 'Transport',
    };
    return currentRole ? roleMap[currentRole] : 'Staff';
  };

  // Navigation structure with tier-gating and feature flags
  const navGroups: NavGroup[] = [
    {
      id: 'operations',
      title: 'Operations',
      icon: Calendar,
      defaultOpen: true,
      requiredFlags: ['enable_dashboards'],
      items: [
        { title: 'Dashboard', url: '/staff/dashboard', icon: Building2, requiredFlags: ['enable_dashboards'] },
        { title: "Today's View", url: '/staff/today', icon: TrendingUp, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES', 'FNB'], tierFeature: 'todays_opportunities', requiredFlags: ['enable_dashboards'] },
        { title: 'Team Directory', url: '/staff/team', icon: Users },
      ],
    },
    {
      id: 'guests',
      title: 'Guests',
      icon: Users,
      requiredFlags: ['enable_guests'],
      items: [
        { title: 'All Guests', url: '/staff/guests', icon: Users, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE'], requiredFlags: ['enable_guests'] },
        { title: 'Pre-Arrival', url: '/staff/prearrival', icon: Plane, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS'], tierFeature: 'pre_arrival_links', requiredFlags: ['enable_prearrival'] },
        { title: 'Requests Dashboard', url: '/staff/requests-dashboard', icon: MessageSquare, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES', 'FNB'], tierFeature: 'guest_management_guest_requests', badge: 'New', requiredFlags: ['enable_requests'] },
      ],
    },
    {
      id: 'activities',
      title: 'Activities',
      icon: Activity,
      items: [
        { title: 'Catalogue', url: '/staff/activities', icon: Activity, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES'] },
        { title: 'Sessions', url: '/staff/activities/sessions', icon: Clock, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES'] },
        { title: 'Ops', url: '/staff/activities/ops', icon: Activity, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES'], requiredFlags: ['enable_activities_ops'] },
        { title: 'Cheat Sheet', url: '/staff/activities/cheatsheet', icon: FileText, roles: ['RESORT_ADMIN', 'FRONT_OFFICE', 'ACTIVITIES'], tierFeature: 'activities_cheatsheet' },
      ],
    },
    {
      id: 'dining',
      title: 'Dining',
      icon: UtensilsCrossed,
      items: [
        { title: 'Restaurants', url: '/staff/restaurants', icon: UtensilsCrossed, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'FNB'] },
        { title: 'Time Slots', url: '/staff/restaurants/slots', icon: Clock, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'FNB'] },
        { title: 'Room Service Orders', url: '/staff/room-service/orders', icon: UtensilsCrossed, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'FNB'], requiredFlags: ['enable_room_service'] },
      ],
    },
    {
      id: 'transport',
      title: 'Transport',
      icon: Car,
      requiredFlags: ['enable_transport'],
      items: [
        { title: 'Dispatch', url: '/staff/transport', icon: Car, roles: ['RESORT_ADMIN', 'MANAGER', 'TRANSPORT'], requiredFlags: ['enable_transport'] },
        { title: 'Driver Portal', url: '/driver', icon: CircleUser, customVisibility: true },
      ],
    },
    {
      id: 'loyalty',
      title: 'Loyalty',
      icon: Crown,
      requiredFlags: ['enable_loyalty'],
      items: [
        { title: 'Members', url: '/staff/loyalty', icon: Crown, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE'], tierFeature: 'loyalty_member_management', requiredFlags: ['enable_loyalty'] },
        { title: 'Program', url: '/staff/loyalty/program', icon: Settings, roles: ['RESORT_ADMIN'], tierFeature: 'loyalty_program', requiredFlags: ['enable_loyalty'] },
        { title: 'Tiers', url: '/staff/loyalty/tiers', icon: Sparkles, roles: ['RESORT_ADMIN'], tierFeature: 'loyalty_tiers', requiredFlags: ['enable_loyalty', 'enable_loyalty_tiers'] },
      ],
    },
    {
      id: 'reports',
      title: 'Reports',
      icon: BarChart3,
      requiredFlags: ['enable_reports'],
      items: [
        { title: 'Overview', url: '/staff/reports', icon: BarChart3, roles: ['RESORT_ADMIN', 'MANAGER'], requiredFlags: ['enable_reports'] },
        { title: 'Activities', url: '/staff/reports/activities', icon: Activity, roles: ['RESORT_ADMIN', 'MANAGER', 'ACTIVITIES'], tierFeature: 'reports_activities', requiredFlags: ['enable_reports'] },
        { title: 'Restaurants', url: '/staff/reports/restaurants', icon: UtensilsCrossed, roles: ['RESORT_ADMIN', 'MANAGER', 'FNB'], tierFeature: 'reports_restaurants', requiredFlags: ['enable_reports'] },
        { title: 'Guests', url: '/staff/reports/guests', icon: Users, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE'], tierFeature: 'reports_guests', requiredFlags: ['enable_reports'] },
        { title: 'Sales', url: '/staff/reports/sales', icon: TrendingUp, roles: ['RESORT_ADMIN', 'MANAGER'], tierFeature: 'reports_sales_performance', requiredFlags: ['enable_reports'] },
        { title: 'Cancellations', url: '/staff/reports/cancellations', icon: FileText, roles: ['RESORT_ADMIN', 'MANAGER'], tierFeature: 'reports_cancellations', requiredFlags: ['enable_reports'] },
        { title: 'Stay Feedback', url: '/staff/reports/stay-feedback', icon: MessageSquare, roles: ['RESORT_ADMIN', 'MANAGER'], tierFeature: 'reports_feedback', requiredFlags: ['enable_reports'] },
      ],
    },
  ];

  // Admin group with tier-gating
  const adminGroup: NavGroup = {
    id: 'admin',
    title: 'Admin',
    icon: Settings,
    items: [
      { title: 'Modules', url: '/staff/settings/modules', icon: Settings, roles: ['RESORT_ADMIN'] },
      { title: 'Resort Staff', url: '/staff/settings/resort-staff', icon: Users, roles: ['RESORT_ADMIN'], tierFeature: 'settings_staff_management' },
      { title: 'Pre-Arrival Settings', url: '/staff/settings/prearrival', icon: Plane, roles: ['RESORT_ADMIN'], tierFeature: 'pre_arrival_links' },
      { title: 'Branding', url: '/staff/settings/branding', icon: Palette, roles: ['RESORT_ADMIN'], tierFeature: 'guest_portal_branding' },
      { title: 'Settings', url: '/staff/settings', icon: Settings, roles: ['RESORT_ADMIN'] },
      { title: 'Access Control', url: '/staff/settings/access', icon: Shield, roles: ['RESORT_ADMIN'] },
    ],
  };

  // Check if an item should be visible
  const isItemVisible = (item: NavItem) => {
    // Custom visibility items (e.g., Driver Portal) have their own logic
    if (item.customVisibility) {
      // Driver Portal is visible only if user is a registered driver
      if (item.url === '/driver') {
        return isDriver;
      }
      return false;
    }
    // Standard role/tier/flag checks
    return canViewNavItem(item.roles, item.tierFeature) && checkFeatureFlags(item.requiredFlags);
  };

  // Check if group has any visible items
  // Checks: role/tier access, feature flags, and legacy module settings
  const groupHasVisibleItems = (group: NavGroup) => {
    // Check group-level feature flags first
    if (!checkFeatureFlags(group.requiredFlags)) {
      return false;
    }
    // Transport group also requires legacy transport_enabled setting (for backward compat)
    if (group.id === 'transport' && !transportEnabled) {
      return false;
    }
    // Check if any items pass visibility checks
    return group.items.some(item => isItemVisible(item));
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
    <div className="flex h-full flex-col bg-sidebar dark:bg-midnight-900 text-sidebar-foreground">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border/50 dark:border-midnight-700/50">
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
              <SelectTrigger className="w-full bg-sidebar-accent/50 dark:bg-midnight-800/50 border-sidebar-border dark:border-midnight-700 text-sidebar-foreground hover:bg-sidebar-accent dark:hover:bg-midnight-800 h-11 rounded-xl">
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
                    // 48px touch target for accessibility
                    'flex w-full items-center gap-3 px-3 py-3 min-h-[48px] rounded-xl text-sm font-medium transition-all duration-200',
                    'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                    'active:scale-[0.98]',
                    isGroupActive(group) && 'text-sidebar-foreground'
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{group.title}</span>
                      <ChevronDown className={cn(
                        "h-4 w-4 shrink-0 transition-transform duration-200",
                        !isOpen && "-rotate-90"
                      )} />
                    </>
                  )}
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-1 ml-4 pl-3 border-l-2 border-sidebar-border/30 space-y-0.5 animate-accordion-down data-[state=closed]:animate-accordion-up">
                  {group.items.map((item) => {
                    // Check item visibility using unified logic
                    if (!isItemVisible(item)) return null;

                    return (
                      <NavLink
                        key={item.url}
                        to={item.url}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          cn(
                            // 44px touch targets
                            'flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-sm transition-all duration-200',
                            isActive
                              ? 'bg-sidebar-primary/15 text-sidebar-primary font-semibold border-l-2 border-sidebar-primary -ml-[2px] pl-[14px]'
                              : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                          )
                        }
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="whitespace-nowrap">{item.title}</span>}
                        {item.badge && !collapsed && (
                          <Badge variant="secondary" className="ml-auto text-2xs whitespace-nowrap">
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

          {/* Admin Group - with stronger visual distinction */}
          {isAdmin && groupHasVisibleItems(adminGroup) && (
            <div className="pt-4 mt-4 border-t border-sidebar-border/30">
              <Collapsible
                open={openGroups['admin']}
                onOpenChange={() => toggleGroup('admin')}
              >
                <CollapsibleTrigger
                  className={cn(
                    // 48px touch target, admin styling
                    'flex w-full items-center gap-3 px-3 py-3 min-h-[48px] rounded-xl text-sm font-medium transition-all duration-200',
                    'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                    'active:scale-[0.98]',
                    isGroupActive(adminGroup) && 'text-sidebar-foreground'
                  )}
                >
                  <Settings className="h-5 w-5 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">Admin</span>
                      <ChevronDown className={cn(
                        "h-4 w-4 shrink-0 transition-transform duration-200",
                        !openGroups['admin'] && "-rotate-90"
                      )} />
                    </>
                  )}
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-1 ml-4 pl-3 border-l-2 border-primary/30 space-y-0.5 animate-accordion-down data-[state=closed]:animate-accordion-up">
                  {adminGroup.items.map((item) => {
                    if (!canViewNavItem(item.roles, item.tierFeature)) return null;
                    if (!checkFeatureFlags(item.requiredFlags)) return null;

                    return (
                      <NavLink
                        key={item.url}
                        to={item.url}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          cn(
                            // 44px touch targets
                            'flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-sm transition-all duration-200',
                            isActive
                              ? 'bg-sidebar-primary/15 text-sidebar-primary font-semibold border-l-2 border-sidebar-primary -ml-[2px] pl-[14px]'
                              : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
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
      <div className="p-4 border-t border-sidebar-border/50 dark:border-midnight-700/50">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-accent dark:bg-midnight-800 text-sidebar-foreground text-sm font-bold shrink-0">
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
