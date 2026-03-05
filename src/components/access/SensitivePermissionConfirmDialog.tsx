import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

interface SensitivePermissionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  /** What's being changed, e.g. "Remove staff members" or "Activities → Full Admin" */
  changeLabel: string;
  /** Plain-English impact description */
  impactDescription: string;
  /** Whether this is a platform-level action */
  isPlatformLevel?: boolean;
}

export function SensitivePermissionConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  changeLabel,
  impactDescription,
  isPlatformLevel,
}: SensitivePermissionConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            Confirm Sensitive Change
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <div className={`flex items-start gap-3 p-3 rounded-lg border ${
                isPlatformLevel
                  ? 'bg-destructive/10 border-destructive/20'
                  : 'bg-warning/10 border-warning/20'
              }`}>
                <ShieldAlert className={`h-5 w-5 mt-0.5 shrink-0 ${
                  isPlatformLevel ? 'text-destructive' : 'text-warning'
                }`} />
                <div className="space-y-1">
                  <p className={`font-medium text-sm ${
                    isPlatformLevel ? 'text-destructive' : 'text-warning'
                  }`}>
                    {changeLabel}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {impactDescription}
                  </p>
                </div>
              </div>

              {isPlatformLevel && (
                <p className="text-xs text-muted-foreground italic">
                  This is a platform-level action. Changes will be logged for audit purposes.
                </p>
              )}

              <p className="text-sm font-medium">
                Are you sure you want to proceed?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              isPlatformLevel
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-warning text-warning-foreground hover:bg-warning/90'
            }
          >
            Confirm Change
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
