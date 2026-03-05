import { AlertTriangle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useDepartment } from '@/contexts/DepartmentContext';

/**
 * Shows a warning when the current department has scope warnings
 * (e.g. no bindings configured, unscoped department).
 * Includes a CTA to configure scope in department settings.
 */
export function DeptScopeWarningBanner() {
  const { deptKey } = useParams<{ deptKey: string }>();
  const { scope } = useDepartment();
  const navigate = useNavigate();

  if (!scope || scope.warnings.length === 0) return null;

  return (
    <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Unscoped Department</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {scope.warnings[0]}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 text-xs h-8"
        onClick={() => navigate(`/staff/dept/${deptKey}/settings`)}
      >
        Configure scope
      </Button>
    </div>
  );
}
