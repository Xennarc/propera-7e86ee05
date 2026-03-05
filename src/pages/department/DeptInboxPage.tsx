import { DepartmentGuard } from '@/components/department/DepartmentGuard';
import { useDepartment } from '@/contexts/DepartmentContext';
import { Card, CardContent } from '@/components/ui/card';
import { Inbox } from 'lucide-react';

function DeptInboxContent() {
  const { currentDepartment } = useDepartment();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ops Inbox</h1>
        <p className="text-muted-foreground text-sm mt-1">Action items and alerts for {currentDepartment?.name}.</p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Inbox className="h-6 w-6 text-primary" />
          </div>
          <p className="text-muted-foreground text-center max-w-sm">
            Ops Inbox will show pending approvals, booking conflicts, readiness blockers, and other actionable items.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DeptInboxPage() {
  return (
    <DepartmentGuard moduleKey="ops_inbox">
      <DeptInboxContent />
    </DepartmentGuard>
  );
}
