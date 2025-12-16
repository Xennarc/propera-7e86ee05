import { useState } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { StaffMobileNav } from './StaffMobileNav';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Navigate, Outlet } from 'react-router-dom';
import { format } from 'date-fns';
import { ShieldX, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { IconCalendar } from '@/components/icons/ProperaIcons';
import { ProperaLoader, ProperaMark } from '@/components/icons/ProperaLogo';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SEOHead } from '@/components/seo/SEOHead';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { RouteErrorFallback } from '@/components/ui/route-error-fallback';

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, profile, loading, userDataLoading, signOut } = useAuth();
  const { currentResort, loading: resortLoading } = useResort();
  const permissions = usePermissions();

  // Show loading while auth is initializing
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background hero-pattern">
        <ProperaLoader size={64} text="Loading..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/staff/auth" replace />;
  }

  // Wait for user data (profile, memberships) to load after auth
  // This prevents the "No Access" flash while memberships are being fetched
  if (userDataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background hero-pattern">
        <ProperaLoader size={64} text="Loading your profile..." />
      </div>
    );
  }

  // Wait for resort loading to complete
  if (resortLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background hero-pattern">
        <ProperaLoader size={64} text="Loading resorts..." />
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
      <SEOHead
        title="Staff Console"
        description="Propera staff console for resort operations management."
        noIndex={true}
      />
      <div className="flex min-h-screen w-full bg-background animate-fade-in">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block animate-fade-in">
          <AppSidebar />
        </div>
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top App Bar */}
          <header className="sticky top-0 z-10 h-16 lg:h-18 border-b border-border/50 bg-card/80 backdrop-blur-xl shadow-soft">
            <div className="flex h-full items-center justify-between px-4 lg:px-6 gap-4">
              <div className="flex items-center gap-3 lg:gap-4">
                {/* Mobile Menu */}
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="lg:hidden -ml-1 text-muted-foreground hover:text-foreground"
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-[280px]">
                    <AppSidebar onNavigate={() => setMobileMenuOpen(false)} />
                  </SheetContent>
                </Sheet>
                
                {/* Desktop Sidebar Trigger */}
                <SidebarTrigger className="hidden lg:flex -ml-2 text-muted-foreground hover:text-foreground transition-colors rounded-xl" />
                
                {/* Mobile: Compact header */}
                <div className="flex items-center gap-3 lg:hidden">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shadow-sm">
                    <ProperaMark size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-foreground truncate max-w-[140px]">
                      {currentResort?.name || 'Select Resort'}
                    </h2>
                  </div>
                </div>
                
                {/* Desktop: Full header */}
                <div className="hidden lg:block">
                  <h2 className="text-base font-bold text-foreground">
                    {currentResort?.name || 'Select Resort'}
                  </h2>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                    <IconCalendar className="h-3 w-3" />
                    {format(new Date(), 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 lg:gap-3">
                <ThemeToggle className="text-muted-foreground hover:text-foreground" />
                <NotificationBell />
                
                {/* User info */}
                <div className="hidden md:flex items-center gap-3 pl-3 lg:pl-4 border-l border-border">
                  <div className="flex h-9 w-9 lg:h-10 lg:w-10 items-center justify-center rounded-xl bg-primary/10 text-primary text-sm font-bold shadow-sm">
                    {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </div>
                  <div className="text-right hidden lg:block">
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
            <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 max-w-[1600px] mx-auto">
              <ErrorBoundary 
                fallback={<RouteErrorFallback />}
                onReset={() => window.location.reload()}
              >
                <Outlet />
              </ErrorBoundary>
            </div>
          </main>
        </div>
        
        {/* Mobile Bottom Navigation */}
        <StaffMobileNav onMoreClick={() => setMobileMenuOpen(true)} />
      </div>
    </SidebarProvider>
  );
}
