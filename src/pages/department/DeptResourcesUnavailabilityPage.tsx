import { DepartmentGuard } from '@/components/department/DepartmentGuard';
import { useDepartment } from '@/contexts/DepartmentContext';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

function Content() {
  const { currentDepartment } = useDepartment();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Asset Unavailability</h1>
        <p className="text-muted-foreground text-sm mt-1">Track downtime and unavailability for {currentDepartment?.name}.</p>
      </div>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-warning" />
          </div>
          <p className="text-muted-foreground text-center max-w-sm">
            Unavailability tracking — mark assets as out of service and schedule maintenance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DeptResourcesUnavailabilityPage() {
  return (
    <DepartmentGuard moduleKey="resources_unavailability">
      <Content />
    </DepartmentGuard>
  );
}
