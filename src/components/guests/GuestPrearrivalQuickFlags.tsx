import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  AlertTriangle, 
  UtensilsCrossed, 
  Clock, 
  Car, 
  PartyPopper,
  RefreshCw
} from 'lucide-react';
import { safeFormatDistanceToNow } from '@/lib/safe-date-format';
import { cn } from '@/lib/utils';
import type { GuestPrearrivalStatus } from '@/hooks/usePrearrivalStatus';

interface GuestPrearrivalQuickFlagsProps {
  status: GuestPrearrivalStatus | undefined;
  compact?: boolean;
  showUpdatedAt?: boolean;
}

/**
 * Quick operational flags for guest list view
 * Shows allergy, dietary, late arrival, transfer, special occasion icons
 */
export function GuestPrearrivalQuickFlags({ 
  status, 
  compact = false,
  showUpdatedAt = false 
}: GuestPrearrivalQuickFlagsProps) {
  if (!status) return null;

  const flags: Array<{
    key: string;
    icon: React.ElementType;
    label: string;
    detail?: string;
    className: string;
    priority: number;
  }> = [];

  // Allergy flag (highest priority)
  if (status.hasAllergies) {
    flags.push({
      key: 'allergy',
      icon: AlertTriangle,
      label: 'Allergy',
      detail: status.allergies || undefined,
      className: 'text-destructive',
      priority: 1,
    });
  }

  // Dietary flag
  if (status.hasDietaryPreferences && status.dietaryPreferences.length > 0) {
    flags.push({
      key: 'dietary',
      icon: UtensilsCrossed,
      label: 'Dietary',
      detail: status.dietaryPreferences.join(', '),
      className: 'text-amber-600',
      priority: 2,
    });
  }

  // Late arrival flag (after 20:00)
  if (status.isLateArrival) {
    flags.push({
      key: 'late',
      icon: Clock,
      label: 'Late arrival',
      detail: status.arrivalTime ? `Arriving at ${status.arrivalTime.slice(0, 5)}` : undefined,
      className: 'text-lagoon',
      priority: 3,
    });
  }

  // Transfer required
  if (status.requiresTransfer) {
    flags.push({
      key: 'transfer',
      icon: Car,
      label: 'Transfer',
      detail: status.transferPreference || undefined,
      className: 'text-muted-foreground',
      priority: 4,
    });
  }

  // Special occasion
  if (status.hasSpecialOccasions && status.specialOccasions.length > 0) {
    flags.push({
      key: 'occasion',
      icon: PartyPopper,
      label: 'Occasion',
      detail: status.specialOccasions.join(', '),
      className: 'text-primary',
      priority: 5,
    });
  }

  if (flags.length === 0 && !showUpdatedAt) return null;

  // Sort by priority and limit display
  const sortedFlags = flags.sort((a, b) => a.priority - b.priority);
  const displayFlags = compact ? sortedFlags.slice(0, 3) : sortedFlags;
  const hiddenCount = compact ? sortedFlags.length - 3 : 0;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {displayFlags.map(flag => {
        const Icon = flag.icon;
        return (
          <Tooltip key={flag.key}>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center justify-center",
                compact ? "h-5 w-5" : "h-6 px-1.5"
              )}>
                <Icon className={cn("h-3.5 w-3.5", flag.className)} />
                {!compact && (
                  <span className={cn("text-xs ml-1", flag.className)}>{flag.label}</span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{flag.label}</p>
              {flag.detail && <p className="text-xs text-muted-foreground">{flag.detail}</p>}
            </TooltipContent>
          </Tooltip>
        );
      })}
      
      {hiddenCount > 0 && (
        <Badge variant="secondary" className="text-xs h-5 px-1.5">
          +{hiddenCount}
        </Badge>
      )}

      {showUpdatedAt && status.lastUpdatedAt && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3" />
              <span>{safeFormatDistanceToNow(status.lastUpdatedAt, { addSuffix: true })}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Last updated</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
