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
  Bell,
  Inbox
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
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
import { cn } from '@/lib/utils';

const mainNavItems = [
  { title: 'Dashboard', url: '/staff/dashboard', icon: LayoutDashboard, roles: null },
  { title: 'Guests', url: '/staff/guests', icon: Users, roles: ['ADMIN', 'MANAGER', 'FRONT_OFFICE'] },
  { title: 'Guest Requests', url: '/staff/guest-requests', icon: Inbox, roles: ['ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES', 'FNB'] },
];

const activitiesNavItems = [
  { title: 'Activities', url: '/staff/activities', icon: Calendar, roles: ['ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES'] },
  { title: 'Sessions', url: '/staff/activities/sessions', icon: CalendarDays, roles: ['ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES'] },
];

const restaurantNavItems = [
  { title: 'Restaurants', url: '/staff/restaurants', icon: Utensils, roles: ['ADMIN', 'MANAGER', 'FRONT_OFFICE', 'FNB'] },
  { title: 'Time Slots', url: '/staff/restaurants/slots', icon: Clock, roles: ['ADMIN', 'MANAGER', 'FRONT_OFFICE', 'FNB'] },
];

const settingsNavItems = [
  { title: 'Resorts', url: '/staff/settings/resorts', icon: Building2, roles: ['ADMIN'] },
  { title: 'Resources', url: '/staff/settings/resources', icon: Anchor, roles: ['ADMIN'] },
  { title: 'Settings', url: '/staff/settings', icon: Settings, roles: null },
];

export function AppSidebar() {
  const { user, profile, roles, signOut, hasAnyRole } = useAuth();
  const { resorts, currentResort, setCurrentResort } = useResort();

  const canViewItem = (itemRoles: string[] | null) => {
    if (!itemRoles) return true;
    return hasAnyRole(itemRoles as any[]);
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
                if (!canViewItem(item.roles)) return null;
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

        {canViewItem(['ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES']) && (
          <SidebarGroup className="mt-6">
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs font-semibold uppercase tracking-wider px-3 mb-2">
              Activities
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {activitiesNavItems.map((item) => {
                  if (!canViewItem(item.roles)) return null;
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

        {canViewItem(['ADMIN', 'MANAGER', 'FRONT_OFFICE', 'FNB']) && (
          <SidebarGroup className="mt-6">
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs font-semibold uppercase tracking-wider px-3 mb-2">
              Dining
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {restaurantNavItems.map((item) => {
                  if (!canViewItem(item.roles)) return null;
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

        {canViewItem(['ADMIN', 'MANAGER']) && (
          <SidebarGroup className="mt-6">
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs font-semibold uppercase tracking-wider px-3 mb-2">
              Reports
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/staff/reports"
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200",
                        "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <BarChart3 className="h-5 w-5" />
                      <span>Overview</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/staff/reports/activities"
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200",
                        "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <Activity className="h-5 w-5" />
                      <span>Activities</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/staff/reports/restaurants"
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200",
                        "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <Utensils className="h-5 w-5" />
                      <span>Restaurants</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/staff/reports/guest-behaviour"
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200",
                        "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <UserCheck className="h-5 w-5" />
                      <span>Guest Behaviour</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/staff/reports/market"
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200",
                        "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <Globe className="h-5 w-5" />
                      <span>Market</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
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
              {settingsNavItems.map((item) => {
                if (!canViewItem(item.roles)) return null;
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
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {roles.length > 0 ? roles.join(', ') : user?.email}
                </p>
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
