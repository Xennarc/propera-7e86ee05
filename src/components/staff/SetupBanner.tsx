import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, Lightbulb } from 'lucide-react';

interface SetupBannerProps {
  id: string; // Unique id for localStorage dismiss state
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  resortId: string;
}

export function SetupBanner({
  id,
  title,
  description,
  actionLabel,
  actionUrl,
  resortId,
}: SetupBannerProps) {
  const [dismissed, setDismissed] = useState(true);
  const storageKey = `propera_setup_dismissed_${id}_${resortId}`;

  useEffect(() => {
    const isDismissed = localStorage.getItem(storageKey) === 'true';
    setDismissed(isDismissed);
  }, [storageKey]);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <Alert className="bg-primary/5 border-primary/20 relative">
      <Lightbulb className="h-5 w-5 text-primary" />
      <AlertTitle className="text-foreground font-semibold pr-8">{title}</AlertTitle>
      <AlertDescription className="text-muted-foreground mt-1">
        {description}
      </AlertDescription>
      <div className="mt-3">
        <Button asChild size="sm" className="gap-2">
          <Link to={actionUrl}>
            {actionLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </Alert>
  );
}
