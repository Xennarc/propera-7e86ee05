import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { cn } from '@/lib/utils';
import { NavLink } from '@/components/NavLink';
import { ProperaMark } from '@/components/icons/ProperaLogo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import {
  Command,
  Building2,
  Users,
  CreditCard,
  ToggleRight,
  FileText,
  Activity,
  ClipboardList,
  Headset,
  ChevronDown,
  LogOut,
  Search,
  Menu,
  Crown,
  ExternalLink,
  Settings,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AccessDenied } from '@/components/ui/access-denied';
import { CommandBar } from '@/components/superadmin/CommandBar';
import { AdminNotificationBell } from '@/components/superadmin/AdminNotificationBell';
import { SkipLink } from '@/components/a11y/SkipLink';

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
};

const superAdminNavItems: NavItem[] = [
  { title: 'Command Center', url: '/superadmin', icon: Command, description: 'Platform overview' },
  { title: 'Resorts', url: '/superadmin/resorts', icon: Building2, description: 'Manage resorts' },
  { title: 'Users & Access', url: '/superadmin/users', icon: Users, description: 'User management' },
  { title: 'Plans & Billing', url: '/superadmin/plans', icon: CreditCard, description: 'Subscriptions' },
  { title: 'Feature Flags', url: '/superadmin/feature-flags', icon: ToggleRight, description: 'Toggle features' },
  { title: 'Content & SEO', url: '/superadmin/content', icon: FileText, description: 'Marketing pages' },
  { title: 'Health & Monitoring', url: '/superadmin/health', icon: Activity, description: 'System health' },
  { title: 'Audit Log', url: '/superadmin/audit', icon: ClipboardList, description: 'Activity history' },
  { title: 'Support Tools', url: '/superadmin/support', icon: Headset, description: 'Debug & view-as' },
];

function SuperAdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();

  return (
    <div className="flex h-full flex-col bg-sidebar dark:bg-midnight-900">
      {/* Header */}
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <ProperaMark size={44} className="text-sidebar-primary" />
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight">Propera</h1>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-destructive/10 text-destructive border-destructive/30 font-semibold">
                SUPER ADMIN
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {superAdminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.url || 
              (item.url !== '/superadmin' && location.pathname.startsWith(item.url));
            
            return (
              <NavLink
                key={item.url}
                to={item.url}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-primary font-semibold" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
                onClick={onNavigate}
              >
                <Icon className="h-5 w-5" />
                <div className="flex-1">
                  <span>{item.title}</span>
                  {item.description && (
                    <p className="text-[10px] text-sidebar-foreground/50 font-normal mt-0.5 hidden lg:block">
                      {item.description}
                    </p>
                  )}
                </div>
              </NavLink>
            );
          })}
        </nav>

        <Separator className="my-4 bg-sidebar-border" />

        {/* Quick Link to Staff Portal */}
        <NavLink
          to="/staff/dashboard"
          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200"
          onClick={onNavigate}
        >
          <ExternalLink className="h-5 w-5" />
          <span>Staff Portal</span>
        </NavLink>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <ThemeToggle />
      </div>
    </div>
  );
}

export default function SuperAdminLayout() {
  const { user, profile, signOut, isSuperAdmin } = useAuth();
  const { resorts, currentResort, setCurrentResort } = useResort();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandBarOpen, setCommandBarOpen] = useState(false);

  // Keyboard shortcut for command bar
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandBarOpen(open => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Guard: Only super admins
  if (!isSuperAdmin()) {
    return <AccessDenied description="You need super admin access to view this page." />;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleResortSwitch = (resortId: string) => {
    const resort = resorts.find(r => r.id === resortId);
    if (resort) {
      setCurrentResort(resort);
      navigate('/staff/dashboard');
    }
  };

  return (
    <>
      <SkipLink />
      <div className="flex min-h-screen w-full bg-background">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-64 flex-col border-r border-border/30 dark:border-midnight-700/50 bg-sidebar dark:bg-midnight-900 fixed inset-y-0 left-0 z-30">
          <SuperAdminSidebar />
        </aside>

        {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:ml-64">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 h-16 border-b border-border/30 dark:border-midnight-700/50 surface-glass-strong">
          <div className="flex h-full items-center gap-4 px-4 lg:px-6">
            {/* Mobile Menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" aria-label="Open navigation menu">
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SuperAdminSidebar onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>

            {/* Global Search - Command Bar Trigger */}
            <div className="flex-1 max-w-xl">
              <Button
                variant="outline"
                className="w-full justify-start text-muted-foreground h-10 hidden sm:flex"
                onClick={() => setCommandBarOpen(true)}
              >
                <Search className="mr-2 h-4 w-4" />
                Search platform...
                <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                  ⌘K
                </kbd>
              </Button>
            </div>

            {/* Quick Resort Switch */}
            <Select value={currentResort?.id || ''} onValueChange={handleResortSwitch}>
              <SelectTrigger className="w-48 hidden md:flex">
                <SelectValue placeholder="Switch to resort..." />
              </SelectTrigger>
              <SelectContent>
                {resorts.map((resort) => (
                  <SelectItem key={resort.id} value={resort.id}>
                    <div className="flex items-center gap-2">
                      <span>{resort.name}</span>
                      {resort.is_demo && (
                        <Badge variant="outline" className="text-[9px] px-1">DEMO</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Notifications */}
            <AdminNotificationBell />

            {/* Profile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-destructive/10 text-destructive font-semibold text-xs">
                      {profile?.full_name?.charAt(0) || 'SA'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col items-start text-left">
                    <span className="text-sm font-medium truncate max-w-[120px]">
                      {profile?.full_name || 'Super Admin'}
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-destructive/10 text-destructive border-destructive/30">
                      <Crown className="h-2.5 w-2.5 mr-0.5" />
                      Super Admin
                    </Badge>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/staff/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 lg:p-6 focus:outline-none">
          <Outlet />
        </main>
      </div>

      {/* Command Bar */}
      <CommandBar open={commandBarOpen} onOpenChange={setCommandBarOpen} />
    </div>
    </>
  );
}
