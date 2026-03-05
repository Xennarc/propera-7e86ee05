import { DepartmentGuard } from '@/components/department/DepartmentGuard';
import { useDepartment } from '@/contexts/DepartmentContext';
import { Card, CardContent } from '@/components/ui/card';
import { Wrench } from 'lucide-react';

function Content() {
  const { currentDepartment } = useDepartment();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assets</h1>
        <p className="text-muted-foreground text-sm mt-1">Equipment and resources for {currentDepartment?.name}.</p>
      </div>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Wrench className="h-6 w-6 text-primary" />
          </div>
          <p className="text-muted-foreground text-center max-w-sm">
            Asset management — boats, vehicles, and equipment assigned to this department.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DeptResourcesAssetsPage() {
  return (
    <DepartmentGuard moduleKey="resources_assets">
      <Content />
    </DepartmentGuard>
  );
}
