import { useState } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { StaffBreadcrumbs } from './StaffBreadcrumbs';
import { MobileBottomNav } from './MobileBottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { usePermissions } from '@/hooks/usePermissions';
import { usePrefetchResortData } from '@/hooks/usePrefetch';
import { Navigate, Outlet } from 'react-router-dom';
import { format } from 'date-fns';
import { ShieldX, Menu, Search } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, profile, loading, userDataLoading, signOut } = useAuth();
  const { currentResort, loading: resortLoading } = useResort();
  const permissions = usePermissions();
  
  // Prefetch common resort data for faster navigation
  usePrefetchResortData();

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
          <header className="sticky top-0 z-10 h-14 lg:h-16 border-b border-border/50 bg-card/90 backdrop-blur-xl shadow-soft">
            <div className="flex h-full items-center justify-between px-4 lg:px-6 gap-4">
              <div className="flex items-center gap-3 lg:gap-4 min-w-0 flex-1">
                {/* Mobile Menu */}
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="lg:hidden -ml-1 text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-[280px]">
                    <AppSidebar onNavigate={() => setMobileMenuOpen(false)} />
                  </SheetContent>
                </Sheet>
                
                {/* Desktop Sidebar Trigger */}
                <SidebarTrigger className="hidden lg:flex -ml-2 text-muted-foreground hover:text-foreground transition-colors rounded-xl shrink-0" />
                
                {/* Mobile: Resort name */}
                <div className="flex items-center gap-2 lg:hidden min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shadow-sm shrink-0">
                    <ProperaMark size={16} />
                  </div>
                  <span className="text-sm font-bold text-foreground truncate">
                    {currentResort?.name || 'Select Resort'}
                  </span>
                </div>
                
                {/* Desktop: Breadcrumbs */}
                <div className="hidden lg:flex items-center gap-4 min-w-0 flex-1">
                  <div className="h-6 w-px bg-border/50" />
                  <StaffBreadcrumbs className="text-muted-foreground" />
                </div>
              </div>
              
              {/* Right side actions */}
              <div className="flex items-center gap-2 lg:gap-3 shrink-0">
                <ThemeToggle className="text-muted-foreground hover:text-foreground" />
                <NotificationBell />
                
                {/* User info - Desktop */}
                <div className="hidden md:flex items-center gap-3 pl-3 border-l border-border/50">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary text-sm font-bold shadow-sm">
                    {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </div>
                  <div className="text-right hidden lg:block">
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {profile?.full_name || 'Staff User'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {profile?.department || user?.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>
          
          {/* Main Content */}
          <main className="flex-1 overflow-auto pb-20 lg:pb-0">
            <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
              <ErrorBoundary 
                fallback={<RouteErrorFallback />}
                onReset={() => window.location.reload()}
              >
                <Outlet />
              </ErrorBoundary>
            </div>
          </main>
          
          {/* Mobile Bottom Navigation */}
          <MobileBottomNav />
        </div>
      </div>
    </SidebarProvider>
  );
}
