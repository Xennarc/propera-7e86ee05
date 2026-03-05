import { useParams } from 'react-router-dom';
import { DepartmentGuard } from '@/components/department/DepartmentGuard';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardList } from 'lucide-react';

function DeptSessionRunSheetContent() {
  const { sessionId } = useParams<{ sessionId: string }>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Session Run Sheet</h1>
        <p className="text-muted-foreground text-sm mt-1">Session ID: {sessionId}</p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <p className="text-muted-foreground text-center max-w-sm">
            Session Run Sheet will display the operational details, guest manifest, check-in status, and crew assignments for this session.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DeptSessionRunSheetPage() {
  return (
    <DepartmentGuard moduleKey="session_run_sheet">
      <DeptSessionRunSheetContent />
    </DepartmentGuard>
  );
}
