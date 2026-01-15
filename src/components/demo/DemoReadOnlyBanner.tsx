import { AlertTriangle, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface DemoReadOnlyBannerProps {
  className?: string;
}

/**
 * Banner shown to demo staff users indicating they're in read-only mode.
 * Should be placed at the top of staff pages that have write operations.
 */
export function DemoReadOnlyBanner({ className }: DemoReadOnlyBannerProps) {
  return (
    <Alert 
      variant="default" 
      className={cn(
        "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20",
        className
      )}
    >
      <Eye className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800 dark:text-amber-200">
        <strong>Demo Mode:</strong> You're exploring a shared demo resort. 
        Create/edit/delete actions are disabled to preserve demo data for all prospects.
      </AlertDescription>
    </Alert>
  );
}
