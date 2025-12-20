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
import { cn } from '@/lib/utils';
import { AlertTriangle, Trash2, XCircle, CheckCircle } from 'lucide-react';

type ConfirmationVariant = 'default' | 'destructive' | 'warning';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Optional additional impact details */
  impact?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: ConfirmationVariant;
  isLoading?: boolean;
}

const variantConfig = {
  default: {
    icon: CheckCircle,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    buttonClass: '',
  },
  destructive: {
    icon: Trash2,
    iconBg: 'bg-destructive/10',
    iconColor: 'text-destructive',
    buttonClass: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-warning/10',
    iconColor: 'text-warning',
    buttonClass: 'bg-warning text-warning-foreground hover:bg-warning/90',
  },
};

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  impact,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'default',
  isLoading,
}: ConfirmationDialogProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className={cn('rounded-full p-3 shrink-0', config.iconBg)}>
              <Icon className={cn('h-5 w-5', config.iconColor)} />
            </div>
            <div className="flex-1 pt-1">
              <AlertDialogTitle className="text-left">{title}</AlertDialogTitle>
              <AlertDialogDescription className="text-left mt-2">
                {description}
                {impact && (
                  <span className="block mt-2 text-foreground font-medium">
                    {impact}
                  </span>
                )}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 gap-2 sm:gap-2">
          <AlertDialogCancel disabled={isLoading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={config.buttonClass}
          >
            {isLoading ? 'Please wait...' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
