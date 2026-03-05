import { ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useDepartment } from '@/contexts/DepartmentContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProperaLoader } from '@/components/icons/ProperaLogo';
import type { DepartmentModuleKey } from '@/types/database';

interface DepartmentGuardProps {
  children: ReactNode;
  /** Required module key for this route */
  moduleKey: DepartmentModuleKey;
  /** If true, only managers can access */
  managerOnly?: boolean;
}

export function DepartmentGuard({ children, moduleKey, managerOnly = false }: DepartmentGuardProps) {
  const { deptKey } = useParams<{ deptKey: string }>();
  const { user, loading: authLoading } = useAuth();
  const { currentDepartment, currentMembership, hasModule, isManager, loading } = useDepartment();

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <ProperaLoader size={48} text="Checking access..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/staff/auth" replace />;
  }

  // No membership in this department
  if (!currentDepartment || !currentMembership) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto h-14 w-14 rounded-xl bg-destructive/10 flex items-center justify-center mb-3">
              <ShieldAlert className="h-7 w-7 text-destructive" />
            </div>
            <CardTitle className="text-lg">Access Restricted</CardTitle>
            <CardDescription>
              You don't have membership in this department. Contact your Department Manager for access.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" asChild>
              <Link to={`/dept/${deptKey || ''}/planner`}>Back to Planner</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Manager-only check
  if (managerOnly && !isManager) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto h-14 w-14 rounded-xl bg-warning/10 flex items-center justify-center mb-3">
              <ShieldAlert className="h-7 w-7 text-warning" />
            </div>
            <CardTitle className="text-lg">Manager Access Required</CardTitle>
            <CardDescription>
              This section requires Department Manager access.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" asChild>
              <Link to={`/dept/${deptKey}/planner`}>Back to Planner</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Module permission check
  if (!hasModule(moduleKey)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto h-14 w-14 rounded-xl bg-warning/10 flex items-center justify-center mb-3">
              <ShieldAlert className="h-7 w-7 text-warning" />
            </div>
            <CardTitle className="text-lg">Access Restricted</CardTitle>
            <CardDescription>
              Access restricted by Department Manager. You don't have the <span className="font-medium">{moduleKey.replace(/_/g, ' ')}</span> module enabled.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" asChild>
              <Link to={`/dept/${deptKey}/planner`}>Back to Planner</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
