import { DepartmentGuard } from '@/components/department/DepartmentGuard';
import { useDepartment } from '@/contexts/DepartmentContext';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';

function Content() {
  const { currentDepartment } = useDepartment();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shifts</h1>
        <p className="text-muted-foreground text-sm mt-1">Staff scheduling for {currentDepartment?.name}.</p>
      </div>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <p className="text-muted-foreground text-center max-w-sm">
            Shift management — view and manage staff schedules for this department.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DeptResourcesShiftsPage() {
  return (
    <DepartmentGuard moduleKey="resources_shifts">
      <Content />
    </DepartmentGuard>
  );
}
