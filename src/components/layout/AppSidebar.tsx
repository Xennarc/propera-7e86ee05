import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  CalendarDays,
  Utensils, 
  Clock,
  BarChart3,
  Activity,
  Globe,
  UserCheck,
  Settings,
  Building2,
  Anchor,
  ChevronDown,
  LogOut,
  User,
  Inbox,
  Shield,
  UsersRound
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { ResortRole } from '@/types/database';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Define which resort roles can view each nav item
type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  resortRoles: ResortRole[] | null; // null means all roles can view
};

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', url: '/staff/dashboard', icon: LayoutDashboard, resortRoles: null },
  { title: 'Guests', url: '/staff/guests', icon: Users, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE'] },
  { title: 'Guest Requests', url: '/staff/guest-requests', icon: Inbox, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES', 'FNB'] },
];

const activitiesNavItems: NavItem[] = [
  { title: 'Activities', url: '/staff/activities', icon: Calendar, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES'] },
  { title: 'Sessions', url: '/staff/activities/sessions', icon: CalendarDays, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES'] },
];

const restaurantNavItems: NavItem[] = [
  { title: 'Restaurants', url: '/staff/restaurants', icon: Utensils, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'FNB'] },
  { title: 'Time Slots', url: '/staff/restaurants/slots', icon: Clock, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'FNB'] },
];

const reportNavItems: NavItem[] = [
  { title: 'Overview', url: '/staff/reports', icon: BarChart3, resortRoles: ['RESORT_ADMIN', 'MANAGER'] },
  { title: 'Activities', url: '/staff/reports/activities', icon: Activity, resortRoles: ['RESORT_ADMIN', 'MANAGER'] },
  { title: 'Restaurants', url: '/staff/reports/restaurants', icon: Utensils, resortRoles: ['RESORT_ADMIN', 'MANAGER'] },
  { title: 'Guest Behaviour', url: '/staff/reports/guest-behaviour', icon: UserCheck, resortRoles: ['RESORT_ADMIN', 'MANAGER'] },
  { title: 'Market', url: '/staff/reports/market', icon: Globe, resortRoles: ['RESORT_ADMIN', 'MANAGER'] },
];

export function AppSidebar() {
  const { user, profile, globalRole, signOut, isSuperAdmin, getResortRole } = useAuth();
  const { resorts, currentResort, setCurrentResort } = useResort();

  const currentResortRole = currentResort ? getResortRole(currentResort.id) : null;

  const canViewItem = (resortRoles: ResortRole[] | null) => {
    // SUPER_ADMIN can view everything
    if (isSuperAdmin()) return true;
    // If no roles specified, everyone can view
    if (!resortRoles) return true;
    // Check if user has one of the required resort roles for current resort
    if (!currentResortRole) return false;
    return resortRoles.includes(currentResortRole);
  };

  const canViewSection = (items: NavItem[]) => {
    return items.some(item => canViewItem(item.resortRoles));
  };

  const getRoleBadgeVariant = () => {
    if (isSuperAdmin()) return 'destructive';
    if (currentResortRole === 'RESORT_ADMIN') return 'default';
    return 'secondary';
  };

  const getRoleDisplay = () => {
    if (isSuperAdmin()) return 'Super Admin';
    if (currentResortRole) {
      const roleMap: Record<ResortRole, string> = {
        'RESORT_ADMIN': 'Resort Admin',
        'MANAGER': 'Manager',
        'FRONT_OFFICE': 'Front Office',
        'ACTIVITIES': 'Activities',
        'FNB': 'F&B',
      };
      return roleMap[currentResortRole];
    }
    return 'No Role';
  };

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground font-bold text-lg shadow-sm">
            P
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight">Propera</h1>
            <p className="text-xs text-sidebar-foreground/60">Resort Operations</p>
          </div>
        </div>
        
        {resorts.length > 0 && (
          <div className="mt-5">
            <Select
              value={currentResort?.id || ''}
              onValueChange={(value) => {
                const resort = resorts.find(r => r.id === value);
                setCurrentResort(resort || null);
              }}
            >
              <SelectTrigger className="w-full bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
                <SelectValue placeholder="Select resort" />
              </SelectTrigger>
              <SelectContent>
                {resorts.map((resort) => (
                  <SelectItem key={resort.id} value={resort.id}>
                    {resort.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-3 py-4 scrollbar-thin">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs font-semibold uppercase tracking-wider px-3 mb-2">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainNavItems.map((item) => {
                if (!canViewItem(item.resortRoles)) return null;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200",
                          "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {canViewSection(activitiesNavItems) && (
          <SidebarGroup className="mt-6">
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs font-semibold uppercase tracking-wider px-3 mb-2">
              Activities
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {activitiesNavItems.map((item) => {
                  if (!canViewItem(item.resortRoles)) return null;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={item.url}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200",
                            "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          )}
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                        >
                          <item.icon className="h-5 w-5" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {canViewSection(restaurantNavItems) && (
          <SidebarGroup className="mt-6">
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs font-semibold uppercase tracking-wider px-3 mb-2">
              Dining
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {restaurantNavItems.map((item) => {
                  if (!canViewItem(item.resortRoles)) return null;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={item.url}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200",
                            "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          )}
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                        >
                          <item.icon className="h-5 w-5" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {canViewSection(reportNavItems) && (
          <SidebarGroup className="mt-6">
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs font-semibold uppercase tracking-wider px-3 mb-2">
              Reports
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {reportNavItems.map((item) => {
                  if (!canViewItem(item.resortRoles)) return null;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={item.url}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200",
                            "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          )}
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                        >
                          <item.icon className="h-5 w-5" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs font-semibold uppercase tracking-wider px-3 mb-2">
            Settings
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {/* Resort Staff - visible to SUPER_ADMIN and RESORT_ADMIN */}
              {(isSuperAdmin() || currentResortRole === 'RESORT_ADMIN') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/staff/settings/resort-staff"
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200",
                        "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <UsersRound className="h-5 w-5" />
                      <span>Resort Staff</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
              {/* Resorts - SUPER_ADMIN only */}
              {isSuperAdmin() && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/staff/settings/resorts"
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200",
                        "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <Building2 className="h-5 w-5" />
                      <span>Resorts</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
              {/* Resources - SUPER_ADMIN and RESORT_ADMIN */}
              {(isSuperAdmin() || currentResortRole === 'RESORT_ADMIN') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/staff/settings/resources"
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200",
                        "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <Anchor className="h-5 w-5" />
                      <span>Resources</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
              {/* Platform Users - SUPER_ADMIN only */}
              {isSuperAdmin() && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/staff/settings/users"
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200",
                        "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <Shield className="h-5 w-5" />
                      <span>Platform Users</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/staff/settings"
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200",
                      "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    end
                  >
                    <Settings className="h-5 w-5" />
                    <span>Settings</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2.5 text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-primary/20 text-sidebar-primary text-sm font-semibold">
                {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium truncate">
                  {profile?.full_name || 'Staff User'}
                </p>
                <Badge variant={getRoleBadgeVariant()} className="text-[10px] px-1.5 py-0">
                  {getRoleDisplay()}
                </Badge>
              </div>
              <ChevronDown className="h-4 w-4 text-sidebar-foreground/60 flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
