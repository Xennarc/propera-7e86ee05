import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, X, CheckCircle2, Loader2 } from 'lucide-react';
import { AccessChange } from './ChangeImpactSummary';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface AccessDrawerFooterProps {
  sessionChanges: AccessChange[];
  hasOverrides: boolean;
  readOnly: boolean;
  onClose: () => void;
  onResetToDefaults: () => void;
  isResetting?: boolean;
  /** Show success state after a reset */
  showSuccess?: boolean;
}

export function AccessDrawerFooter({
  sessionChanges,
  hasOverrides,
  readOnly,
  onClose,
  onResetToDefaults,
  isResetting,
  showSuccess,
}: AccessDrawerFooterProps) {
  const sensitiveCount = sessionChanges.filter(c => c.isSensitive).length;

  return (
    <div className="border-t border-border bg-background px-6 py-3 space-y-2 shrink-0">
      {/* Session summary bar */}
      {sessionChanges.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
          <span>{sessionChanges.length} change{sessionChanges.length !== 1 ? 's' : ''} applied this session</span>
          {sensitiveCount > 0 && (
            <Badge variant="warning" className="text-[10px] px-1.5 py-0">
              {sensitiveCount} sensitive
            </Badge>
          )}
        </div>
      )}

      {showSuccess && (
        <div className="flex items-center gap-2 text-xs text-success bg-success/10 rounded-md px-3 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>All overrides removed. Access reset to role defaults.</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onClose} className="flex-1">
          <X className="h-3.5 w-3.5 mr-1.5" />
          Close
        </Button>

        {!readOnly && hasOverrides && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 text-destructive hover:text-destructive" disabled={isResetting}>
                {isResetting ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                )}
                Reset to Defaults
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset to Role Defaults</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove all custom permission overrides for this user in this resort.
                  Their access will revert to what their assigned role provides by default.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onResetToDefaults} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Reset All Overrides
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
