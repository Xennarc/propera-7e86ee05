import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, Lightbulb, MapPin, Car, Users } from 'lucide-react';

interface TransportSetupBannerProps {
  stopsCount: number;
  buggiesCount: number;
  driversCount: number;
  onStartSetup: () => void;
  onDismiss: () => void;
}

export function TransportSetupBanner({
  stopsCount,
  buggiesCount,
  driversCount,
  onStartSetup,
  onDismiss,
}: TransportSetupBannerProps) {
  const missing: string[] = [];
  if (stopsCount < 2) missing.push('stops');
  if (buggiesCount < 1) missing.push('buggies');
  if (driversCount < 1) missing.push('drivers');
  
  return (
    <Alert className="bg-primary/5 border-primary/20 relative mb-0">
      <Lightbulb className="h-5 w-5 text-primary" />
      <AlertTitle className="text-foreground font-semibold pr-8">
        Complete Transport Setup
      </AlertTitle>
      <AlertDescription className="text-muted-foreground mt-1">
        <p className="mb-3">
          Set up your stops, buggies, and drivers to start accepting transport requests.
        </p>
        
        {/* Progress indicators */}
        <div className="flex items-center gap-4 mb-4">
          <StatusPill
            icon={MapPin}
            label="Stops"
            count={stopsCount}
            required={2}
          />
          <StatusPill
            icon={Car}
            label="Buggies"
            count={buggiesCount}
            required={1}
          />
          <StatusPill
            icon={Users}
            label="Drivers"
            count={driversCount}
            required={1}
          />
        </div>
        
        <Button onClick={onStartSetup} size="sm" className="gap-2">
          Start Setup
          <ArrowRight className="h-4 w-4" />
        </Button>
      </AlertDescription>
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </Alert>
  );
}

function StatusPill({
  icon: Icon,
  label,
  count,
  required,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  required: number;
}) {
  const isComplete = count >= required;
  
  return (
    <div className={`
      flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium
      ${isComplete 
        ? 'bg-green-500/10 text-green-700 dark:text-green-400' 
        : 'bg-muted text-muted-foreground'}
    `}>
      <Icon className="h-3 w-3" />
      <span>{count}/{required}</span>
    </div>
  );
}
