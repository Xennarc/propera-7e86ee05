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
import { ChevronDown, LogOut, User, Palette, TrendingUp } from 'lucide-react';
import {
  IconPropera,
  IconDashboard,
  IconGuests,
  IconGuestRequests,
  IconActivities,
  IconCalendar,
  IconRestaurants,
  IconClock,
  IconReports,
  IconSettings,
  IconResort,
} from '@/components/icons/ProperaIcons';

// Define which resort roles can view each nav item
type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  resortRoles: ResortRole[] | null;
};

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', url: '/staff/dashboard', icon: IconDashboard, resortRoles: null },
  { title: "Today's Opportunities", url: '/staff/today', icon: TrendingUp, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES', 'FNB'] },
  { title: 'Guests', url: '/staff/guests', icon: IconGuests, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE'] },
  { title: 'Guest Requests', url: '/staff/guest-requests', icon: IconGuestRequests, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES', 'FNB'] },
];

const activitiesNavItems: NavItem[] = [
  { title: 'Activities', url: '/staff/activities', icon: IconActivities, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES'] },
  { title: 'Sessions', url: '/staff/activities/sessions', icon: IconCalendar, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES'] },
  { title: 'Cheat Sheet', url: '/staff/activities/cheatsheet', icon: IconActivities, resortRoles: ['RESORT_ADMIN', 'FRONT_OFFICE', 'ACTIVITIES'] },
];

const restaurantNavItems: NavItem[] = [
  { title: 'Restaurants', url: '/staff/restaurants', icon: IconRestaurants, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'FNB'] },
  { title: 'Time Slots', url: '/staff/restaurants/slots', icon: IconClock, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'FNB'] },
];

const reportNavItems: NavItem[] = [
  { title: 'Overview', url: '/staff/reports', icon: IconReports, resortRoles: ['RESORT_ADMIN', 'MANAGER'] },
  { title: 'Activities', url: '/staff/reports/activities', icon: IconActivities, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'ACTIVITIES'] },
  { title: 'Restaurants', url: '/staff/reports/restaurants', icon: IconRestaurants, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FNB'] },
  { title: 'Cancellations', url: '/staff/reports/cancellations', icon: IconReports, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE'] },
  { title: 'Guests', url: '/staff/reports/guests', icon: IconGuests, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE'] },
  { title: 'Guest Behaviour', url: '/staff/reports/guest-behaviour', icon: IconGuests, resortRoles: ['RESORT_ADMIN', 'MANAGER'] },
  { title: 'Market', url: '/staff/reports/market', icon: IconReports, resortRoles: ['RESORT_ADMIN', 'MANAGER'] },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const { user, profile, signOut, isSuperAdmin, getResortRole } = useAuth();
  const { resorts, currentResort, setCurrentResort } = useResort();

  const currentResortRole = currentResort ? getResortRole(currentResort.id) : null;

  const canViewItem = (resortRoles: ResortRole[] | null) => {
    if (isSuperAdmin()) return true;
    if (!resortRoles) return true;
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
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-md">
            <IconPropera className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight">Propera</h1>
            <p className="text-xs text-sidebar-foreground/50 font-medium">Resort Operations</p>
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
              <SelectTrigger className="w-full bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent transition-colors rounded-xl h-12 px-4">
                <SelectValue placeholder="Select resort" />
              </SelectTrigger>
              <SelectContent className="z-50">
                {resorts.map((resort) => (
                  <SelectItem 
                    key={resort.id} 
                    value={resort.id}
                    className="cursor-pointer py-3 px-4"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{resort.name}</span>
                      {resort.is_demo && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 bg-primary/10 text-primary border-primary/30">
                          DEMO
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-3 py-5 scrollbar-thin">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] font-bold uppercase tracking-widest px-3 mb-2">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainNavItems.map((item) => {
                if (!canViewItem(item.resortRoles)) return null;
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200",
                          "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                        onClick={onNavigate}
                      >
                        <Icon className="h-5 w-5" />
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
            <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] font-bold uppercase tracking-widest px-3 mb-2">
              Activities
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {activitiesNavItems.map((item) => {
                  if (!canViewItem(item.resortRoles)) return null;
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                      <NavLink 
                          to={item.url}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200",
                            "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          )}
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                          onClick={onNavigate}
                        >
                          <Icon className="h-5 w-5" />
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
            <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] font-bold uppercase tracking-widest px-3 mb-2">
              Dining
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {restaurantNavItems.map((item) => {
                  if (!canViewItem(item.resortRoles)) return null;
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={item.url}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200",
                            "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          )}
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                          onClick={onNavigate}
                        >
                          <Icon className="h-5 w-5" />
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
            <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] font-bold uppercase tracking-widest px-3 mb-2">
              Reports
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {reportNavItems.map((item) => {
                  if (!canViewItem(item.resortRoles)) return null;
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={item.url}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200",
                            "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          )}
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                          onClick={onNavigate}
                        >
                          <Icon className="h-5 w-5" />
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
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] font-bold uppercase tracking-widest px-3 mb-2">
            Settings
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {(isSuperAdmin() || currentResortRole === 'RESORT_ADMIN') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/staff/settings/resort-staff"
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200",
                        "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                      onClick={onNavigate}
                    >
                      <IconGuests className="h-5 w-5" />
                      <span>Resort Staff</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {(isSuperAdmin() || currentResortRole === 'RESORT_ADMIN') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/staff/settings/branding"
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200",
                        "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                      onClick={onNavigate}
                    >
                      <Palette className="h-5 w-5" />
                      <span>Branding</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
              {isSuperAdmin() && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/staff/settings/resorts"
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200",
                        "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                      onClick={onNavigate}
                    >
                      <IconResort className="h-5 w-5" />
                      <span>Resorts</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/staff/settings"
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200",
                      "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    onClick={onNavigate}
                    end
                  >
                    <IconSettings className="h-5 w-5" />
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
            <button className="flex w-full items-center gap-3 rounded-xl p-3 text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary/20 text-sidebar-primary text-sm font-bold">
                {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold truncate">
                  {profile?.full_name || 'Staff User'}
                </p>
                <Badge variant={getRoleBadgeVariant()} className="text-[10px] px-2 py-0 rounded-full">
                  {getRoleDisplay()}
                </Badge>
              </div>
              <ChevronDown className="h-4 w-4 text-sidebar-foreground/50 flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
