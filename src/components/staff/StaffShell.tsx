import { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AccountDisabledScreen } from '@/components/auth/AccountDisabledScreen';
import { useResort } from '@/contexts/ResortContext';
import { usePermissions } from '@/hooks/usePermissions';
import { usePrefetchResortData } from '@/hooks/usePrefetch';
import { useStaffDebugMode } from '@/hooks/useStaffDebugMode';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import { initErrorCapture } from '@/lib/debug-error-capture';
import { initQueryTracker } from '@/lib/debug-query-tracker';
import { FeatureFlagsProvider } from '@/providers/FeatureFlagsProvider';
import { StaffSidebar } from './StaffSidebar';
import { StaffTopbar } from './StaffTopbar';
import { StaffCommandBar, useStaffCommandBar } from './StaffCommandBar';
import { StaffDebugPanel } from './StaffDebugPanel';
import { StaffDebugConsole } from './StaffDebugConsole';
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
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

export function StaffShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { open: commandBarOpen, setOpen: setCommandBarOpen } = useStaffCommandBar();
  const { isDebugMode, showDebugPanel } = useStaffDebugMode();
  const { isKeyboardOpen } = useKeyboardInset();
  const queryClient = useQueryClient();
  
  const { user, profile, loading, userDataLoading, isAccountDisabled, signOut } = useAuth();
  const { currentResort, loading: resortLoading } = useResort();
  const permissions = usePermissions();

  // Prefetch common resort data
  usePrefetchResortData();
  
  // Initialize error capture and query tracking when debug mode is active
  useEffect(() => {
    if (isDebugMode) {
      const cleanupErrors = initErrorCapture();
      const cleanupQueries = initQueryTracker(queryClient);
      return () => {
        cleanupErrors();
        cleanupQueries();
      };
    }
  }, [isDebugMode, queryClient]);

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

  // Account disabled check - show blocked screen
  if (isAccountDisabled) {
    return <AccountDisabledScreen />;
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

  // Guard for when loading finished but currentResort is still null
  // This handles the race condition where resort selection is pending
  if (!currentResort && permissions.hasAnyResortAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <ProperaLoader size={64} text="Selecting resort..." />
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
    <FeatureFlagsProvider resortId={currentResort?.id}>
      <TooltipProvider>
        <SEOHead
          title="Staff Console"
          description="Propera staff console for resort operations management."
          noIndex={true}
        />
        
        <div className="flex min-h-screen w-full bg-background">
          {/* Desktop Sidebar - with gradient stroke */}
          <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-border/30 bg-sidebar">
            <StaffSidebar />
          </aside>

          {/* Mobile Sidebar */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetContent side="left" className="p-0 w-[280px]">
              <StaffSidebar onNavigate={() => setMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Main Content */}
          <div className="flex-1 flex flex-col lg:pl-64">
            <StaffTopbar
              onMenuClick={() => setMobileMenuOpen(true)}
              onCommandBarOpen={() => setCommandBarOpen(true)}
            />

            <main className={cn(
              "flex-1 overflow-auto transition-[padding] duration-200",
              isKeyboardOpen ? "pb-4" : "pb-24 lg:pb-0"
            )}>
              {/* Improved padding scale: tighter on mobile, generous on desktop */}
              <div className="p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10 max-w-[1400px] mx-auto">
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

          {/* Debug Panel (legacy) */}
          {showDebugPanel && <StaffDebugPanel />}
          
          {/* Debug Console (new) */}
          {showDebugPanel && <StaffDebugConsole />}
        </div>
      </TooltipProvider>
    </FeatureFlagsProvider>
  );
}
