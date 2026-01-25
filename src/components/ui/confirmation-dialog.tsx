import { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { AlertTriangle, Trash2, CheckCircle, ShieldAlert } from 'lucide-react';

type ConfirmationVariant = 'default' | 'destructive' | 'warning' | 'critical';

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
  /** Require typing this text to confirm (for critical actions) */
  requireTyping?: string;
  /** Countdown seconds before confirm button is enabled */
  countdown?: number;
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
  critical: {
    icon: ShieldAlert,
    iconBg: 'bg-destructive/15',
    iconColor: 'text-destructive',
    buttonClass: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
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
  requireTyping,
  countdown,
}: ConfirmationDialogProps) {
  const [typedValue, setTypedValue] = useState('');
  const [countdownValue, setCountdownValue] = useState(countdown ?? 0);
  
  const config = variantConfig[variant];
  const Icon = config.icon;

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setTypedValue('');
      setCountdownValue(countdown ?? 0);
    }
  }, [open, countdown]);

  // Countdown timer
  useEffect(() => {
    if (!open || countdownValue <= 0) return;
    
    const timer = setInterval(() => {
      setCountdownValue((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [open, countdownValue]);

  // Determine if confirm button should be enabled
  const typingValid = !requireTyping || typedValue === requireTyping;
  const countdownComplete = countdownValue <= 0;
  const canConfirm = typingValid && countdownComplete && !isLoading;

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm();
    }
  };

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

        {/* Require typing confirmation */}
        {requireTyping && (
          <div className="space-y-2 mt-4">
            <Label htmlFor="confirm-input" className="text-sm text-muted-foreground">
              Type <span className="font-mono font-semibold text-foreground">{requireTyping}</span> to confirm
            </Label>
            <Input
              id="confirm-input"
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              placeholder={requireTyping}
              className={cn(
                "font-mono",
                typedValue && typedValue !== requireTyping && "border-destructive focus-visible:ring-destructive"
              )}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          </div>
        )}

        <AlertDialogFooter className="mt-4 gap-2 sm:gap-2">
          <AlertDialogCancel disabled={isLoading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={cn(config.buttonClass, !canConfirm && "opacity-50 cursor-not-allowed")}
          >
            {isLoading ? (
              'Please wait...'
            ) : countdownValue > 0 ? (
              `Wait ${countdownValue}s...`
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
