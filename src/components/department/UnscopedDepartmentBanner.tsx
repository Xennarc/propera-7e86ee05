import { AlertTriangle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function UnscopedDepartmentBanner() {
  const { deptKey } = useParams<{ deptKey: string }>();
  const navigate = useNavigate();

  return (
    <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Unscoped Department</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          This department has no activity category configured. All sessions are shown unfiltered.
          Set an activity scope in department settings.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 text-xs h-8"
        onClick={() => navigate(`/staff/dept/${deptKey}/settings`)}
      >
        Configure
      </Button>
    </div>
  );
}
