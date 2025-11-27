import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { Navigate, Outlet } from 'react-router-dom';
import { format } from 'date-fns';
import { CalendarDays, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AppLayout() {
  const { user, profile, loading } = useAuth();
  const { currentResort } = useResort();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top App Bar */}
          <header className="sticky top-0 z-10 h-16 border-b border-border bg-card/80 backdrop-blur-md">
            <div className="flex h-full items-center justify-between px-6 gap-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="-ml-2 text-muted-foreground hover:text-foreground transition-colors" />
                <div className="hidden sm:block">
                  <h2 className="text-sm font-semibold text-foreground">
                    {currentResort?.name || 'Select Resort'}
                  </h2>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <CalendarDays className="h-3 w-3" />
                    {format(new Date(), 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-warning" />
                </Button>
                <div className="hidden md:flex items-center gap-3 pl-3 border-l border-border">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                    {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
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
