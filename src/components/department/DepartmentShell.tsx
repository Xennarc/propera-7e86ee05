import { useState, useMemo } from 'react';
import { Navigate, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DepartmentProvider, useDepartment } from '@/contexts/DepartmentContext';
import { DepartmentSidebar } from './DepartmentSidebar';
import { DepartmentBottomNav } from './DepartmentBottomNav';
import { DepartmentTopbar } from './DepartmentTopbar';
import { ProperaLoader } from '@/components/icons/ProperaLogo';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { RouteErrorFallback } from '@/components/ui/route-error-fallback';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

function DepartmentShellInner() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, loading: authLoading, signOut } = useAuth();
  const { currentDepartment, currentMembership, loading: deptLoading } = useDepartment();
  const { deptKey } = useParams<{ deptKey: string }>();

  if (authLoading || deptLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <ProperaLoader size={64} text="Loading department..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/staff/auth" replace />;
  }

  // Department not found or user not a member
  if (!currentDepartment || !currentMembership) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Department Not Found</CardTitle>
            <CardDescription>
              You don't have access to the "{deptKey}" department, or it doesn't exist.
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
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-56 lg:flex-col lg:fixed lg:inset-y-0 border-r border-border/30 bg-sidebar">
        <DepartmentSidebar />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-[260px]">
          <DepartmentSidebar onNavigate={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:pl-56">
        <DepartmentTopbar onMenuClick={() => setMobileMenuOpen(true)} />

        <main className={cn("flex-1 overflow-auto pb-20 lg:pb-0")}>
          <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto">
            <ErrorBoundary
              fallback={<RouteErrorFallback />}
              onReset={() => window.location.reload()}
            >
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <DepartmentBottomNav />
      </div>
    </div>
  );
}

export function DepartmentShell() {
  return (
    <DepartmentProvider>
      <DepartmentShellInner />
    </DepartmentProvider>
  );
}

export default DepartmentShell;
