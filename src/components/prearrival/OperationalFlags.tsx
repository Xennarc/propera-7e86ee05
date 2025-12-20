import { Badge } from '@/components/ui/badge';
import { UtensilsCrossed, Clock, PartyPopper, Car, Baby, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OperationalFlagsProps {
  hasDietaryRestrictions: boolean;
  hasAllergies: boolean;
  isLateArrival: boolean;
  hasSpecialOccasion: boolean;
  requiresTransfer: boolean;
  hasKidsInParty: boolean;
  onFlagClick?: (flag: string) => void;
}

interface FlagConfig {
  key: string;
  label: string;
  icon: React.ElementType;
  className: string;
  priority: number;
}

export function OperationalFlags({
  hasDietaryRestrictions,
  hasAllergies,
  isLateArrival,
  hasSpecialOccasion,
  requiresTransfer,
  hasKidsInParty,
  onFlagClick,
}: OperationalFlagsProps) {
  const flags: FlagConfig[] = [];

  // Add flags in priority order
  if (hasAllergies) {
    flags.push({
      key: 'allergy',
      label: 'Allergy',
      icon: AlertTriangle,
      className: 'bg-destructive/10 text-destructive border-destructive/20',
      priority: 1,
    });
  }

  if (hasDietaryRestrictions) {
    flags.push({
      key: 'dietary',
      label: 'Dietary',
      icon: UtensilsCrossed,
      className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      priority: 2,
    });
  }

  if (isLateArrival) {
    flags.push({
      key: 'late-arrival',
      label: 'Late arrival',
      icon: Clock,
      className: 'bg-lagoon/10 text-lagoon border-lagoon/20',
      priority: 3,
    });
  }

  if (hasSpecialOccasion) {
    flags.push({
      key: 'occasion',
      label: 'Special occasion',
      icon: PartyPopper,
      className: 'bg-primary/10 text-primary border-primary/20',
      priority: 4,
    });
  }

  if (requiresTransfer) {
    flags.push({
      key: 'transfer',
      label: 'Transfer',
      icon: Car,
      className: 'bg-muted text-muted-foreground border-muted-foreground/30',
      priority: 5,
    });
  }

  if (hasKidsInParty) {
    flags.push({
      key: 'kids',
      label: 'Kids',
      icon: Baby,
      className: 'bg-muted text-muted-foreground border-muted-foreground/30',
      priority: 6,
    });
  }

  if (flags.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {flags.sort((a, b) => a.priority - b.priority).map(flag => {
        const Icon = flag.icon;
        return (
          <Badge
            key={flag.key}
            variant="outline"
            className={cn(
              flag.className,
              'text-xs cursor-pointer hover:opacity-80 transition-opacity'
            )}
            onClick={() => onFlagClick?.(flag.key)}
          >
            <Icon className="h-3 w-3 mr-1" />
            {flag.label}
          </Badge>
        );
      })}
    </div>
  );
}
