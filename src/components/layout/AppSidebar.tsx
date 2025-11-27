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
  User
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
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, roles: null },
  { title: 'Guests', url: '/guests', icon: Users, roles: ['ADMIN', 'MANAGER', 'FRONT_OFFICE'] },
];

const activitiesNavItems = [
  { title: 'Activities', url: '/activities', icon: Calendar, roles: ['ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES'] },
  { title: 'Sessions', url: '/activities/sessions', icon: CalendarDays, roles: ['ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES'] },
];

const restaurantNavItems = [
  { title: 'Restaurants', url: '/restaurants', icon: Utensils, roles: ['ADMIN', 'MANAGER', 'FRONT_OFFICE', 'FNB'] },
  { title: 'Time Slots', url: '/restaurants/slots', icon: Clock, roles: ['ADMIN', 'MANAGER', 'FRONT_OFFICE', 'FNB'] },
];

const settingsNavItems = [
  { title: 'Resorts', url: '/settings/resorts', icon: Building2, roles: ['ADMIN'] },
  { title: 'Resources', url: '/settings/resources', icon: Anchor, roles: ['ADMIN'] },
  { title: 'Settings', url: '/settings', icon: Settings, roles: null },
];

export function AppSidebar() {
  const { user, profile, roles, signOut, hasAnyRole, hasRole } = useAuth();
  const { resorts, currentResort, setCurrentResort } = useResort();

  const canViewItem = (itemRoles: string[] | null) => {
    if (!itemRoles) return true;
    return hasAnyRole(itemRoles as any[]);
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold text-lg">
            P
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">Propera</h1>
            <p className="text-xs text-sidebar-foreground/60">Resort Operations</p>
          </div>
        </div>
        
        {resorts.length > 0 && (
          <div className="mt-4">
            <Select
              value={currentResort?.id || ''}
              onValueChange={(value) => {
                const resort = resorts.find(r => r.id === value);
                setCurrentResort(resort || null);
              }}
            >
              <SelectTrigger className="w-full bg-sidebar-accent border-sidebar-border text-sidebar-foreground">
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

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                if (!canViewItem(item.roles)) return null;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/80 transition-colors",
                          "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
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
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/60">Activities</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {activitiesNavItems.map((item) => {
                  if (!canViewItem(item.roles)) return null;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={item.url}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/80 transition-colors",
                            "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          )}
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
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
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/60">Dining</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {restaurantNavItems.map((item) => {
                  if (!canViewItem(item.roles)) return null;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={item.url}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/80 transition-colors",
                            "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          )}
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
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
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/60">Reports</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/reports"
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/80 transition-colors",
                        "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <BarChart3 className="h-5 w-5" />
                      <span>Overview</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/reports/activities"
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/80 transition-colors",
                        "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <Activity className="h-5 w-5" />
                      <span>Activities</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/reports/restaurants"
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/80 transition-colors",
                        "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <Utensils className="h-5 w-5" />
                      <span>Restaurants</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/reports/guest-behaviour"
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/80 transition-colors",
                        "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <UserCheck className="h-5 w-5" />
                      <span>Guest Behaviour</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/reports/market"
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/80 transition-colors",
                        "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
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

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map((item) => {
                if (!canViewItem(item.roles)) return null;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/80 transition-colors",
                          "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
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

      <SidebarFooter className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2 text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-sm font-medium">
                {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium truncate">
                  {profile?.full_name || 'Staff User'}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {roles.length > 0 ? roles.join(', ') : user?.email}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-sidebar-foreground/60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
