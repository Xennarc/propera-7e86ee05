import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { RefreshCw } from 'lucide-react';

interface DemoRefreshedModalProps {
  open: boolean;
  variant: 'guest' | 'staff';
  onContinue: () => void;
}

export function DemoRefreshedModal({ open, variant, onContinue }: DemoRefreshedModalProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <RefreshCw className="h-6 w-6 text-primary" />
          </div>
          <AlertDialogTitle className="text-center">Demo refreshed</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            This demo environment was refreshed with fresh data. 
            Tap continue to reload your session.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction onClick={onContinue} className="w-full sm:w-auto">
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
