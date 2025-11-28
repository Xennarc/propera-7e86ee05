import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Navigate, Outlet } from 'react-router-dom';
import { format } from 'date-fns';
import { Bell, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { IconPropera, IconCalendar } from '@/components/icons/ProperaIcons';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function AppLayout() {
  const { user, profile, loading, signOut } = useAuth();
  const { currentResort, loading: resortLoading } = useResort();
  const permissions = usePermissions();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background hero-pattern">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse-soft shadow-soft">
            <IconPropera className="h-9 w-9 text-primary" />
          </div>
          <p className="text-muted-foreground font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/staff/auth" replace />;
  }

  // Wait for resort loading to complete
  if (resortLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background hero-pattern">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse-soft shadow-soft">
            <IconPropera className="h-9 w-9 text-primary" />
          </div>
          <p className="text-muted-foreground font-medium">Loading resorts...</p>
        </div>
      </div>
    );
  }

  // Show access denied for users without any resort access
  if (!permissions.hasAnyResortAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background hero-pattern p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
              <ShieldX className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>No Access</CardTitle>
            <CardDescription>
              Your account does not have access to any resorts. Please contact a Super Admin to be added to a resort.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground text-center">
              Logged in as: <span className="font-medium">{user.email}</span>
            </p>
            <Button variant="outline" onClick={() => signOut()}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top App Bar */}
          <header className="sticky top-0 z-10 h-18 border-b border-border/50 bg-card/80 backdrop-blur-xl shadow-soft">
            <div className="flex h-full items-center justify-between px-6 gap-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="-ml-2 text-muted-foreground hover:text-foreground transition-colors rounded-xl" />
                <div className="hidden sm:block">
                  <h2 className="text-base font-bold text-foreground">
                    {currentResort?.name || 'Select Resort'}
                  </h2>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                    <IconCalendar className="h-3 w-3" />
                    {format(new Date(), 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ThemeToggle className="text-muted-foreground hover:text-foreground" />
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground rounded-xl">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-warning shadow-sm" />
                </Button>
                <div className="hidden md:flex items-center gap-3 pl-4 border-l border-border">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary text-sm font-bold shadow-sm">
                    {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {profile?.full_name || 'Staff User'}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">
                      {profile?.department || user?.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>
          
          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
