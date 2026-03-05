import { useState, useEffect, useCallback, useMemo } from 'react';
import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AccountDisabledScreen } from '@/components/auth/AccountDisabledScreen';
import { useResort } from '@/contexts/ResortContext';
import { usePermissions } from '@/hooks/usePermissions';
import { usePrefetchResortData } from '@/hooks/usePrefetch';
import { useStaffDebugMode } from '@/hooks/useStaffDebugMode';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import { useDemoInstanceGuard, clearDemoInstanceState } from '@/hooks/useDemoInstanceGuard';
import { useDepartmentRedirect } from '@/hooks/useDepartmentRedirect';
import { DepartmentShellProvider, useDepartmentShell } from '@/contexts/DepartmentShellContext';
import { DepartmentProvider } from '@/contexts/DepartmentContext';
import { initErrorCapture } from '@/lib/debug-error-capture';
import { initQueryTracker } from '@/lib/debug-query-tracker';
import { FeatureFlagsProvider } from '@/providers/FeatureFlagsProvider';
import { StaffSidebar } from './StaffSidebar';
import { StaffTopbar } from './StaffTopbar';
import { StaffCommandBar, useStaffCommandBar } from './StaffCommandBar';
import { StaffDebugPanel } from './StaffDebugPanel';
import { StaffDebugConsole } from './StaffDebugConsole';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { DepartmentSidebar } from '@/components/department/DepartmentSidebar';
import { DepartmentBottomNav } from '@/components/department/DepartmentBottomNav';
import { DepartmentTopbar } from '@/components/department/DepartmentTopbar';
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
import { SkipLink } from '@/components/a11y/SkipLink';
import { DemoRefreshedModal } from '@/components/demo/DemoRefreshedModal';

function StaffShellInner() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { open: commandBarOpen, setOpen: setCommandBarOpen } = useStaffCommandBar();
  const { isDebugMode, showDebugPanel } = useStaffDebugMode();
  const { isKeyboardOpen } = useKeyboardInset();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDeptActive } = useDepartmentShell();

  // Extract deptKey from URL when in department mode (e.g. /staff/dept/HOUSEKEEPING/planner)
  const deptKeyFromUrl = useMemo(() => {
    const match = location.pathname.match(/\/staff\/dept\/([^/]+)/);
    return match?.[1] ?? undefined;
  }, [location.pathname]);
  
  const { user, profile, loading, userDataLoading, isAccountDisabled, signOut } = useAuth();
  const { currentResort, loading: resortLoading } = useResort();
  const permissions = usePermissions();
  const deptRedirect = useDepartmentRedirect();

  // Demo instance rotation guard
  const demoGuard = useDemoInstanceGuard(currentResort?.id, 'staff');
  
  const handleDemoRefreshContinue = useCallback(() => {
    clearDemoInstanceState('staff');
    demoGuard.dismiss();
    signOut();
  }, [demoGuard, signOut]);

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

  // Access denied — but check for department-only users first
  if (!permissions.hasAnyResortAccess) {
    // Department-only users: redirect them to their department
    if (deptRedirect.shouldRedirect && deptRedirect.redirectPath) {
      return <Navigate to={deptRedirect.redirectPath} replace />;
    }
    // Still checking department access
    if (deptRedirect.loading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <ProperaLoader size={64} text="Checking access..." />
        </div>
      );
    }
    // No resort access AND no department access
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

  // Determine which sidebar/nav to render based on department mode
  const sidebarWidth = isDeptActive ? 'lg:w-56' : 'lg:w-64';
  const sidebarPl = isDeptActive ? 'lg:pl-56' : 'lg:pl-64';

  const shellContent = (
    <FeatureFlagsProvider resortId={currentResort?.id}>
      <TooltipProvider>
        <DemoRefreshedModal
          open={demoGuard.isStale}
          variant="staff"
          onContinue={handleDemoRefreshContinue}
        />
        <SEOHead
          title="Staff Console"
          description="Propera staff console for resort operations management."
          noIndex={true}
        />
        
        <SkipLink />
        <div className="flex min-h-screen w-full bg-background">
          {/* Desktop Sidebar - swaps between staff and dept */}
          <aside className={cn("hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 border-r border-border/30 bg-sidebar", sidebarWidth)}>
            {isDeptActive ? <DepartmentSidebar /> : <StaffSidebar />}
          </aside>

          {/* Mobile Sidebar */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetContent side="left" className={cn("p-0", isDeptActive ? "w-[260px]" : "w-[280px]")}>
              {isDeptActive
                ? <DepartmentSidebar onNavigate={() => setMobileMenuOpen(false)} />
                : <StaffSidebar onNavigate={() => setMobileMenuOpen(false)} />
              }
            </SheetContent>
          </Sheet>

          {/* Main Content */}
          <div className={cn("flex-1 flex flex-col", sidebarPl)}>
            {isDeptActive ? (
              <DepartmentTopbar onMenuClick={() => setMobileMenuOpen(true)} />
            ) : (
              <StaffTopbar
                onMenuClick={() => setMobileMenuOpen(true)}
                onCommandBarOpen={() => setCommandBarOpen(true)}
              />
            )}

            <main 
              id="main-content"
              tabIndex={-1}
              className={cn(
              "flex-1 overflow-auto transition-[padding] duration-200 focus:outline-none",
              isKeyboardOpen ? "pb-4" : "pb-24 lg:pb-0"
            )}>
              {/* Improved padding scale: tighter on mobile, generous on desktop */}
              <div className={cn(
                "max-w-[1400px] mx-auto",
                isDeptActive
                  ? "p-3 sm:p-4 md:p-6 lg:p-8"
                  : "p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10"
              )}>
                <ErrorBoundary
                  fallback={<RouteErrorFallback />}
                  onReset={() => window.location.reload()}
                >
                  <Outlet />
                </ErrorBoundary>
              </div>
            </main>

            {/* Mobile Bottom Navigation - swaps between staff and dept */}
            {isDeptActive ? <DepartmentBottomNav /> : <MobileBottomNav />}
          </div>

          {/* Command Bar (only in staff mode) */}
          {!isDeptActive && (
            <StaffCommandBar
              open={commandBarOpen}
              onOpenChange={setCommandBarOpen}
            />
          )}

          {/* Debug Panel (legacy) */}
          {showDebugPanel && <StaffDebugPanel />}
          
          {/* Debug Console (new) */}
          {showDebugPanel && <StaffDebugConsole />}
        </div>
      </TooltipProvider>
    </FeatureFlagsProvider>
  );

  // Wrap in DepartmentProvider when URL indicates a department route
  // This must be based on URL (not isDeptActive state) to be available on first render
  // before DepartmentLayout's useEffect fires
  if (deptKeyFromUrl) {
    return (
      <DepartmentProvider deptKeyOverride={deptKeyFromUrl}>
        {shellContent}
      </DepartmentProvider>
    );
  }

  return shellContent;
}

export function StaffShell() {
  return (
    <DepartmentShellProvider>
      <StaffShellInner />
    </DepartmentShellProvider>
  );
}
