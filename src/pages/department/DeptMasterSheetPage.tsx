import { DepartmentGuard } from '@/components/department/DepartmentGuard';
import { useDepartment } from '@/contexts/DepartmentContext';
import { Card, CardContent } from '@/components/ui/card';
import { LayoutList } from 'lucide-react';

function DeptMasterSheetContent() {
  const { currentDepartment } = useDepartment();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Master Ops Sheet</h1>
        <p className="text-muted-foreground text-sm mt-1">Daily briefing overview for {currentDepartment?.name}.</p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <LayoutList className="h-6 w-6 text-primary" />
          </div>
          <p className="text-muted-foreground text-center max-w-sm">
            Master Ops Sheet will display session summaries, readiness counts, and alerts for today's operations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DeptMasterSheetPage() {
  return (
    <DepartmentGuard moduleKey="master_ops_sheet">
      <DeptMasterSheetContent />
    </DepartmentGuard>
  );
}
