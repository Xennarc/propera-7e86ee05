import { DepartmentGuard } from '@/components/department/DepartmentGuard';
import { useDepartment } from '@/contexts/DepartmentContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';

function DeptPlannerContent() {
  const { currentDepartment } = useDepartment();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{currentDepartment?.name} Planner</h1>
        <p className="text-muted-foreground text-sm mt-1">Daily operations calendar for your department.</p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <CalendarDays className="h-6 w-6 text-primary" />
          </div>
          <p className="text-muted-foreground text-center max-w-sm">
            Ops Planner will show scheduled sessions, assignments, and daily operations for {currentDepartment?.name}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DeptPlannerPage() {
  return (
    <DepartmentGuard moduleKey="ops_planner">
      <DeptPlannerContent />
    </DepartmentGuard>
  );
}
