import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { usePermissions } from '@/hooks/usePermissions';
import SuperAdminHome from './SuperAdminHome';
import ResortAdminHome from './ResortAdminHome';
import ResortManagerHome from './ResortManagerHome';
import FrontOfficeHome from './FrontOfficeHome';
import ReservationsHome from './ReservationsHome';
import ActivitiesHome from './ActivitiesHome';
import FnbHome from './FnbHome';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function StaffHomeRouter() {
  const { isSuperAdmin, getResortRole } = useAuth();
  const { currentResort } = useResort();
  const permissions = usePermissions();

  // SUPER_ADMIN always sees the platform overview
  if (isSuperAdmin()) {
    return <SuperAdminHome />;
  }

  // For STANDARD users, need a current resort selected
  if (!currentResort) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="border-dashed max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <MapPin className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-center max-w-sm">
              No resort selected. Please select a resort from the sidebar to view your dashboard.
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link to="/staff/settings/resorts">Go to Settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get the user's resort role for the current resort
  const resortRole = getResortRole(currentResort.id);

  // Route based on resort role (priority: RESORT_ADMIN > MANAGER > FRONT_OFFICE > RESERVATIONS > ACTIVITIES/FNB)
  switch (resortRole) {
    case 'RESORT_ADMIN':
      return <ResortAdminHome />;
    case 'MANAGER':
      return <ResortManagerHome />;
    case 'FRONT_OFFICE':
      return <FrontOfficeHome />;
    case 'RESERVATIONS':
      return <ReservationsHome />;
    case 'ACTIVITIES':
      return <ActivitiesHome />;
    case 'FNB':
      return <FnbHome />;
    default:
      // Fallback to resort admin view if role is somehow undefined but they have access
      if (permissions.hasAnyResortAccess) {
        return <ResortAdminHome />;
      }
      return (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Access Issue</CardTitle>
            <CardDescription>
              You don't have a defined role for this resort. Please contact an administrator.
            </CardDescription>
          </CardHeader>
        </Card>
      );
  }
}
