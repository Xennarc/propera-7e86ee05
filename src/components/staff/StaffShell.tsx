import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { usePermissions } from '@/hooks/usePermissions';
import { usePrefetchResortData } from '@/hooks/usePrefetch';
import { StaffSidebar } from './StaffSidebar';
import { StaffTopbar } from './StaffTopbar';
import { StaffCommandBar, useStaffCommandBar } from './StaffCommandBar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { ProperaLoader } from '@/components/icons/ProperaLogo';
import { SEOHead } from '@/components/seo/SEOHead';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { RouteErrorFallback } from '@/components/ui/route-error-fallback';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldX } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';

export function StaffShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { open: commandBarOpen, setOpen: setCommandBarOpen } = useStaffCommandBar();
  
  const { user, profile, loading, userDataLoading, signOut } = useAuth();
  const { loading: resortLoading } = useResort();
  const permissions = usePermissions();

  // Prefetch common resort data
  usePrefetchResortData();

  // Loading states
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <ProperaLoader size={64} text="Loading..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/staff/auth" replace />;
  }

  if (userDataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <ProperaLoader size={64} text="Loading your profile..." />
      </div>
    );
  }

  if (resortLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <ProperaLoader size={64} text="Loading resorts..." />
      </div>
    );
  }

  // Access denied
  if (!permissions.hasAnyResortAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
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
    <TooltipProvider>
      <SEOHead
        title="Staff Console"
        description="Propera staff console for resort operations management."
        noIndex={true}
      />
      
      <div className="flex min-h-screen w-full bg-background">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:w-56 lg:flex-col lg:fixed lg:inset-y-0 border-r border-border/30">
          <StaffSidebar />
        </aside>

        {/* Mobile Sidebar */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-[280px]">
            <StaffSidebar onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:pl-56">
          <StaffTopbar
            onMenuClick={() => setMobileMenuOpen(true)}
            onCommandBarOpen={() => setCommandBarOpen(true)}
          />

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

        {/* Command Bar */}
        <StaffCommandBar
          open={commandBarOpen}
          onOpenChange={setCommandBarOpen}
        />
      </div>
    </TooltipProvider>
  );
}
