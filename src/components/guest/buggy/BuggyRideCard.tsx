import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { 
  Car, 
  Clock, 
  MapPin, 
  Users, 
  Loader2, 
  CheckCircle, 
  XCircle,
  Navigation,
  Timer,
  User
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { BuggyRequestStatus } from '@/types/database';

interface BuggyRideCardProps {
  request: {
    id: string;
    status: BuggyRequestStatus;
    request_type: string;
    party_size: number;
    eta_minutes: number | null;
    scheduled_for: string | null;
    created_at: string;
    pickup_stop?: { name: string } | null;
    pickup_text: string | null;
    dropoff_stop?: { name: string } | null;
    dropoff_text: string | null;
    needs_accessible: boolean;
  };
  onCancel?: () => void;
  isCancelling?: boolean;
  compact?: boolean;
}

const STATUS_CONFIG: Record<BuggyRequestStatus, {
  label: string;
  color: string;
  icon: React.ElementType;
  animate?: boolean;
}> = {
  requested: { label: 'Finding driver...', color: 'bg-amber-500', icon: Loader2, animate: true },
  queued: { label: 'In queue', color: 'bg-blue-500', icon: Clock },
  assigned_to_trip: { label: 'Driver assigned', color: 'bg-blue-600', icon: Car },
  driver_en_route: { label: 'Driver on the way', color: 'bg-emerald-500', icon: Navigation, animate: true },
  arrived: { label: 'Driver arrived', color: 'bg-emerald-600', icon: MapPin },
  picked_up: { label: 'On board', color: 'bg-purple-500', icon: Car, animate: true },
  completed: { label: 'Completed', color: 'bg-green-600', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-500', icon: XCircle },
  failed: { label: 'Failed', color: 'bg-red-500', icon: XCircle },
  no_show: { label: 'No show', color: 'bg-gray-500', icon: XCircle },
};

export function BuggyRideCard({ request, onCancel, isCancelling, compact = false }: BuggyRideCardProps) {
  const config = STATUS_CONFIG[request.status] || STATUS_CONFIG.requested;
  const StatusIcon = config.icon;
  
  const pickupName = request.pickup_stop?.name || request.pickup_text || 'Unknown';
  const dropoffName = request.dropoff_stop?.name || request.dropoff_text || 'Unknown';
  
  const isActive = ['requested', 'queued', 'assigned_to_trip', 'driver_en_route', 'arrived', 'picked_up'].includes(request.status);
  const canCancel = ['requested', 'queued', 'assigned_to_trip'].includes(request.status);
  
  const showEta = request.eta_minutes !== null && isActive && request.status !== 'arrived';

  if (compact) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Card className={cn(
          "guest-card overflow-hidden",
          isActive && "border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-transparent"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <motion.div 
                  key={request.status}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    config.color
                  )}
                >
                  <StatusIcon className={cn(
                    "h-5 w-5 text-white",
                    config.animate && "animate-pulse"
                  )} />
                </motion.div>
                <div className="min-w-0">
                  <motion.p 
                    key={`label-${request.status}`}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="font-semibold text-foreground truncate"
                  >
                    {config.label}
                  </motion.p>
                  <p className="text-xs text-muted-foreground truncate">
                    {pickupName} → {dropoffName}
                  </p>
                </div>
              </div>
              {showEta && (
                <motion.div
                  key={`eta-${request.eta_minutes}`}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <Badge variant="secondary" className="shrink-0">
                    <Timer className="h-3 w-3 mr-1" />
                    {request.eta_minutes} min
                  </Badge>
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        "guest-card overflow-hidden",
        isActive && "border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-transparent"
      )}>
        <CardContent className="p-0">
          {/* Status Header - animates on status change */}
          <motion.div 
            key={request.status}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className={cn("p-4 text-white", config.color)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusIcon className={cn(
                  "h-6 w-6",
                  config.animate && "animate-pulse"
                )} />
                <div>
                  <p className="font-bold text-lg">{config.label}</p>
                  {showEta && (
                    <motion.p 
                      key={`eta-${request.eta_minutes}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm opacity-90"
                    >
                      Estimated arrival: {request.eta_minutes} minutes
                    </motion.p>
                  )}
                </div>
              </div>
              {request.party_size > 1 && (
                <Badge variant="secondary" className="bg-white/20 text-white">
                  <Users className="h-3 w-3 mr-1" />
                  {request.party_size}
                </Badge>
              )}
            </div>
          </motion.div>

          {/* Route Info */}
          <div className="p-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <div className="w-0.5 h-8 bg-border" />
                <div className="h-3 w-3 rounded-full bg-primary" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Pick-up</p>
                  <p className="font-medium">{pickupName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Drop-off</p>
                  <p className="font-medium">{dropoffName}</p>
                </div>
              </div>
            </div>

            {/* Scheduled Time */}
            {request.scheduled_for && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Scheduled for {format(parseISO(request.scheduled_for), 'h:mm a')}
                </span>
              </div>
            )}

            {/* Request Time */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                Requested {format(parseISO(request.created_at), 'h:mm a')}
              </span>
            </div>

            {/* Cancel Button */}
            {canCancel && onCancel && (
              <Button
                variant="outline"
                className="w-full"
                onClick={onCancel}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel Ride'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Status timeline for past rides
export function BuggyRideTimeline({ 
  statuses 
}: { 
  statuses: Array<{ status: string; timestamp: string }> 
}) {
  return (
    <div className="space-y-2">
      {statuses.map((item, index) => {
        const config = STATUS_CONFIG[item.status as BuggyRequestStatus];
        if (!config) return null;
        const Icon = config.icon;
        
        return (
          <div key={index} className="flex items-center gap-3">
            <div className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
              config.color
            )}>
              <Icon className="h-3 w-3 text-white" />
            </div>
            <div className="flex-1 flex items-center justify-between">
              <span className="text-sm font-medium">{config.label}</span>
              <span className="text-xs text-muted-foreground">
                {format(parseISO(item.timestamp), 'h:mm a')}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
