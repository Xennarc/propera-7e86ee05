import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent } from './card';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  onBack?: () => void;
  backLabel?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description = "Please try again later or contact your system administrator.",
  onRetry,
  onBack,
  backLabel = "Go Back",
}: ErrorStateProps) {
  return (
    <Card className="border-destructive/20">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground max-w-md mb-6">{description}</p>
        <div className="flex gap-3">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {backLabel}
            </Button>
          )}
          {onRetry && (
            <Button onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
