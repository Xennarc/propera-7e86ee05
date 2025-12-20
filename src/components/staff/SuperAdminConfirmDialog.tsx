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
import { Shield, AlertTriangle } from 'lucide-react';

interface SuperAdminConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  actionType: 'create' | 'invite';
  targetName?: string;
}

export function SuperAdminConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  actionType,
  targetName,
}: SuperAdminConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Grant Super Admin Access
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <Shield className="h-5 w-5 text-destructive mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-destructive">
                    This grants global control over all resorts
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Super Admins can access and manage all resorts, create other admins, 
                    modify platform settings, and view all data across the platform.
                  </p>
                </div>
              </div>
              
              <p className="text-sm">
                You are about to {actionType === 'create' ? 'create a' : 'invite'} 
                {targetName ? ` ${targetName} as a` : ''} Super Admin.
                This action will be logged for audit purposes.
              </p>
              
              <p className="text-sm font-medium">
                Are you absolutely sure you want to proceed?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Yes, Grant Super Admin Access
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
