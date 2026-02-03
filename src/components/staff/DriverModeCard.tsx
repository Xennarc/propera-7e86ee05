import { Link } from 'react-router-dom';
import { Car, ArrowRight, Circle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useResort } from '@/contexts/ResortContext';
import { useIsDriver } from '@/hooks/transport';
import { cn } from '@/lib/utils';

export function DriverModeCard() {
  const { currentResort } = useResort();
  const { data: driverRecord, isLoading } = useIsDriver(currentResort?.id);

  // Don't render if not a driver or still loading
  if (isLoading || !driverRecord) return null;

  const isOnline = driverRecord.status === 'online';
  const statusLabel = driverRecord.status === 'online' 
    ? 'Online' 
    : driverRecord.status === 'break' 
      ? 'On Break' 
      : 'Offline';

  return (
    <Card className="border-primary/30 bg-primary/5 dark:bg-primary/10">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Icon & Info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <Car className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground">Driver Mode</h3>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-2xs",
                    isOnline 
                      ? "border-success/50 text-success bg-success/10" 
                      : "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  <Circle className={cn(
                    "h-1.5 w-1.5 mr-1",
                    isOnline ? "fill-success" : "fill-muted-foreground"
                  )} />
                  {statusLabel}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                You're registered as a buggy driver. Open the driver portal to go online and receive trip assignments.
              </p>
            </div>
          </div>

          {/* CTA */}
          <Button asChild className="w-full sm:w-auto shrink-0">
            <Link to="/driver">
              Enter Driver Mode
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
