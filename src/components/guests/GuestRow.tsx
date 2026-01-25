import { memo, useCallback } from 'react';
import { 
  Eye, 
  ExternalLink, 
  Copy, 
  Phone, 
  Mail, 
  Key,
  Crown,
  Star,
  Edit,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Guest } from '@/types/database';
import { GuestPrearrivalStatus } from '@/hooks/usePrearrivalStatus';
import { GuestStatusInfo, getGuestStatusWithCountdown } from '@/hooks/useGuestFilters';
import { GuestPrearrivalQuickFlags } from './GuestPrearrivalQuickFlags';
import { safeFormatDate } from '@/lib/safe-date-format';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays } from 'date-fns';
import { safeParseDateISO } from '@/lib/safe-date-format';

interface GuestRowProps {
  guest: Guest;
  prearrivalStatus?: GuestPrearrivalStatus;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onPreview: () => void;
  onNavigate: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSendEmail?: () => void;
  showSelection: boolean;
  showPrearrival: boolean;
  isCompact: boolean;
  canResetPin?: boolean;
  isReadOnly?: boolean;
}

const statusVariantMap: Record<string, string> = {
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  pending: 'bg-primary/10 text-primary border-primary/20',
  confirmed: 'bg-lagoon/10 text-lagoon border-lagoon/20',
  secondary: 'bg-muted text-muted-foreground border-border',
  default: 'bg-muted text-muted-foreground border-border',
};

export const GuestRow = memo(function GuestRow({
  guest,
  prearrivalStatus,
  isSelected,
  onSelect,
  onPreview,
  onNavigate,
  onEdit,
  onDelete,
  onSendEmail,
  showSelection,
  showPrearrival,
  isCompact,
  canResetPin = false,
  isReadOnly = false,
}: GuestRowProps) {
  const { toast } = useToast();
  
  // CRITICAL: Guard against null guest prop
  if (!guest || !guest.id) {
    console.error('[GuestRow] Received null/invalid guest prop');
    return null;
  }
  
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

  const handleCopyBookingRef = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (guest.booking_reference) {
      navigator.clipboard.writeText(guest.booking_reference);
      toast({
        title: 'Copied',
        description: 'Booking reference copied to clipboard',
      });
    }
  }, [guest.booking_reference, toast]);

  return (
    <div
      onClick={onNavigate}
      className={cn(
        'group grid gap-3 items-center border-b border-border/50 cursor-pointer',
        'hover:bg-accent/50 transition-colors',
        isCompact ? 'py-2 px-3' : 'py-4 px-4',
        isSelected && 'bg-primary/5',
        // Grid columns
        showSelection ? 'grid-cols-[auto_1fr_auto_auto_auto_auto_auto]' : 'grid-cols-[1fr_auto_auto_auto_auto_auto]'
      )}
      role="row"
      aria-selected={isSelected}
    >
      {/* Selection checkbox */}
      {showSelection && (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            aria-label={`Select ${guest.full_name}`}
          />
        </div>
      )}

      {/* Guest name + badges + email */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn(
            'font-semibold text-foreground truncate',
            isCompact ? 'text-sm' : 'text-base'
          )}>
            {guest.full_name}
          </span>
          {guest.is_vip && (
            <Tooltip>
              <TooltipTrigger>
                <Crown className="h-4 w-4 text-amber-500 shrink-0" />
              </TooltipTrigger>
              <TooltipContent>VIP Guest</TooltipContent>
            </Tooltip>
          )}
          {guest.loyalty_tier && (
            <Tooltip>
              <TooltipTrigger>
                <Star className="h-4 w-4 text-primary shrink-0" />
              </TooltipTrigger>
              <TooltipContent>{guest.loyalty_tier} Member</TooltipContent>
            </Tooltip>
          )}
        </div>
        {!isCompact && guest.email && (
          <p className="text-sm text-muted-foreground truncate">{guest.email}</p>
        )}
      </div>

      {/* Room pill - click to copy */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleCopyRoom}
            className={cn(
              'font-mono text-sm bg-muted px-2 py-1 rounded',
              'hover:bg-muted/80 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-ring'
            )}
          >
            {guest.room_number || '-'}
          </button>
        </TooltipTrigger>
        <TooltipContent>Click to copy room</TooltipContent>
      </Tooltip>

      {/* Status pill with countdown */}
      <div className="flex items-center gap-1.5">
        <Badge 
          variant="outline"
          className={cn(
            'font-medium whitespace-nowrap',
            statusVariantMap[status.variant]
          )}
        >
          {status.label}
          {status.countdown && (
            <span className="ml-1 opacity-80">({status.countdown})</span>
          )}
        </Badge>
      </div>

      {/* Dates + nights */}
      <div className={cn(
        'text-muted-foreground whitespace-nowrap',
        isCompact ? 'text-xs' : 'text-sm'
      )}>
        <span>{safeFormatDate(guest.check_in_date, 'MMM d')}</span>
        <span className="mx-1">-</span>
        <span>{safeFormatDate(guest.check_out_date, 'MMM d')}</span>
        <span className="ml-1 text-muted-foreground/60">({nights}n)</span>
      </div>

      {/* Flags */}
      {showPrearrival && prearrivalStatus && (
        <GuestPrearrivalQuickFlags 
          status={prearrivalStatus} 
          compact 
        />
      )}

      {/* Actions - visible on hover */}
      <div 
        className={cn(
          'flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity',
          // Always visible on mobile/touch devices
          'lg:opacity-0 max-lg:opacity-100'
        )}
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

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onNavigate}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open details</TooltipContent>
        </Tooltip>

        {guest.booking_reference && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleCopyBookingRef}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy booking ref</TooltipContent>
          </Tooltip>
        )}

        {guest.phone && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                asChild
              >
                <a href={`tel:${guest.phone}`}>
                  <Phone className="h-4 w-4" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Call</TooltipContent>
          </Tooltip>
        )}

        {guest.email && onSendEmail && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onSendEmail}
              >
                <Mail className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Send pre-arrival email</TooltipContent>
          </Tooltip>
        )}

        {!isReadOnly && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onEdit}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </div>
  );
}, (prev, next) => {
  // Custom comparison for memo - only re-render if important props change
  return (
    prev.guest.id === next.guest.id &&
    prev.guest.updated_at === next.guest.updated_at &&
    prev.isSelected === next.isSelected &&
    prev.isCompact === next.isCompact &&
    prev.showSelection === next.showSelection &&
    prev.showPrearrival === next.showPrearrival &&
    prev.prearrivalStatus?.lastUpdatedAt === next.prearrivalStatus?.lastUpdatedAt
  );
});
