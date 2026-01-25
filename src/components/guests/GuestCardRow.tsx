import { memo, useCallback } from 'react';
import { 
  Eye, 
  Crown,
  Star,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Guest } from '@/types/database';
import { GuestPrearrivalStatus } from '@/hooks/usePrearrivalStatus';
import { getGuestStatusWithCountdown } from '@/hooks/useGuestFilters';
import { GuestPrearrivalQuickFlags } from './GuestPrearrivalQuickFlags';
import { safeFormatDate } from '@/lib/safe-date-format';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays } from 'date-fns';
import { safeParseDateISO } from '@/lib/safe-date-format';

interface GuestCardRowProps {
  guest: Guest;
  prearrivalStatus?: GuestPrearrivalStatus;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onPreview: () => void;
  onNavigate: () => void;
  showSelection: boolean;
  showPrearrival: boolean;
}

const statusVariantMap: Record<string, string> = {
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  pending: 'bg-primary/10 text-primary border-primary/20',
  confirmed: 'bg-lagoon/10 text-lagoon border-lagoon/20',
  secondary: 'bg-muted text-muted-foreground border-border',
  default: 'bg-muted text-muted-foreground border-border',
};

export const GuestCardRow = memo(function GuestCardRow({
  guest,
  prearrivalStatus,
  isSelected,
  onSelect,
  onPreview,
  onNavigate,
  showSelection,
  showPrearrival,
}: GuestCardRowProps) {
  const { toast } = useToast();
  const status = getGuestStatusWithCountdown(guest);
  
  // Calculate nights
  const checkIn = safeParseDateISO(guest.check_in_date);
  const checkOut = safeParseDateISO(guest.check_out_date);
  const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;

  const handleCopyRoom = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (guest.room_number) {
      navigator.clipboard.writeText(guest.room_number);
      toast({
        title: 'Copied',
        description: `Room ${guest.room_number} copied to clipboard`,
      });
    }
  }, [guest.room_number, toast]);

  return (
    <div
      onClick={onNavigate}
      className={cn(
        'relative p-4 bg-card border border-border/50 rounded-lg cursor-pointer',
        'hover:bg-accent/30 hover:border-border transition-all',
        'active:scale-[0.99]',
        isSelected && 'ring-2 ring-primary/30 bg-primary/5'
      )}
      role="article"
      aria-label={`Guest: ${guest.full_name}`}
    >
      {/* Selection checkbox (top-left) */}
      {showSelection && (
        <div 
          className="absolute top-3 left-3"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            aria-label={`Select ${guest.full_name}`}
          />
        </div>
      )}

      {/* Preview button (top-right) */}
      <div 
        className="absolute top-3 right-3 flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onPreview}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Quick preview</TooltipContent>
        </Tooltip>
      </div>

      {/* Main content */}
      <div className={cn('space-y-2', showSelection && 'pl-8')}>
        {/* Name + VIP + Room */}
        <div className="flex items-center gap-2 flex-wrap pr-16">
          <span className="font-semibold text-foreground">{guest.full_name}</span>
          {guest.is_vip && (
            <Crown className="h-4 w-4 text-amber-500 shrink-0" />
          )}
          {guest.loyalty_tier && (
            <Star className="h-4 w-4 text-primary shrink-0" />
          )}
          <button
            onClick={handleCopyRoom}
            className="font-mono text-sm bg-muted px-2 py-0.5 rounded hover:bg-muted/80 transition-colors"
          >
            Room {guest.room_number || '-'}
          </button>
        </div>

        {/* Status + Dates */}
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <Badge 
            variant="outline"
            className={cn(
              'font-medium',
              statusVariantMap[status.variant]
            )}
          >
            {status.label}
            {status.countdown && ` (${status.countdown})`}
          </Badge>
          <span className="text-muted-foreground">
            {safeFormatDate(guest.check_in_date, 'MMM d')} - {safeFormatDate(guest.check_out_date, 'MMM d')}
            <span className="ml-1 opacity-60">({nights}n)</span>
          </span>
        </div>

        {/* Flags row */}
        {showPrearrival && prearrivalStatus && (
          <GuestPrearrivalQuickFlags 
            status={prearrivalStatus} 
            compact 
          />
        )}
      </div>

      {/* Chevron indicator */}
      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
    </div>
  );
}, (prev, next) => {
  return (
    prev.guest.id === next.guest.id &&
    prev.guest.updated_at === next.guest.updated_at &&
    prev.isSelected === next.isSelected &&
    prev.showSelection === next.showSelection &&
    prev.showPrearrival === next.showPrearrival &&
    prev.prearrivalStatus?.lastUpdatedAt === next.prearrivalStatus?.lastUpdatedAt
  );
});
