import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Sparkles, 
  ArrowRight, 
  X, 
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResumeDemoBannerProps {
  resortName?: string;
  email?: string;
  onResume: () => void;
  onStartFresh: () => void;
  isLoading?: boolean;
  className?: string;
}

export function ResumeDemoBanner({
  resortName,
  email,
  onResume,
  onStartFresh,
  isLoading = false,
  className,
}: ResumeDemoBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <Card className={cn(
      'relative overflow-hidden bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5',
      'border-primary/20 p-4 md:p-6',
      className
    )}>
      {/* Dismiss button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              Welcome back{resortName ? ` to ${resortName}` : ''}!
            </p>
            <p className="text-sm text-muted-foreground">
              Your demo workspace is still active.
              {email && <span className="hidden sm:inline"> ({email})</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={onStartFresh}
            disabled={isLoading}
            className="text-muted-foreground"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Start Fresh
          </Button>
          <Button
            size="sm"
            onClick={onResume}
            disabled={isLoading}
            className="rounded-full font-semibold"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Resume Demo
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
