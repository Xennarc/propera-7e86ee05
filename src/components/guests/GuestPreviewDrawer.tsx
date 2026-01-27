import { 
  Crown, 
  Star, 
  Phone, 
  Mail, 
  Copy, 
  ExternalLink,
  Calendar,
  MapPin,
  Hash,
  Building2,
  Key,
  Edit,
  Send,
  MessageSquarePlus
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Guest } from '@/types/database';
import { GuestPrearrivalStatus } from '@/hooks/usePrearrivalStatus';
import { getGuestStatusWithCountdown } from '@/hooks/useGuestFilters';
import { GuestPrearrivalQuickFlags } from './GuestPrearrivalQuickFlags';
import { safeFormatDate } from '@/lib/safe-date-format';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays } from 'date-fns';
import { safeParseDateISO } from '@/lib/safe-date-format';
import { useIsMobile } from '@/hooks/use-mobile';

interface GuestPreviewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: Guest | null;
  prearrivalStatus?: GuestPrearrivalStatus;
  onEdit: () => void;
  onNavigateToDetail: () => void;
  onSendEmail?: () => void;
  prearrivalEnabled: boolean;
  isFutureArrival: boolean;
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

export function GuestPreviewDrawer({
  open,
  onOpenChange,
  guest,
  prearrivalStatus,
  onEdit,
  onNavigateToDetail,
  onSendEmail,
  prearrivalEnabled,
  isFutureArrival,
  isReadOnly = false,
}: GuestPreviewDrawerProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  if (!guest) return null;

  const status = getGuestStatusWithCountdown(guest);
  
  // Calculate nights
  const checkIn = safeParseDateISO(guest.check_in_date);
  const checkOut = safeParseDateISO(guest.check_out_date);
  const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard`,
    });
  };

  const getPrearrivalBadge = () => {
    if (!prearrivalStatus) return null;

    switch (prearrivalStatus.prearrivalStatus) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'partial':
        return <Badge variant="warning">In Progress</Badge>;
      case 'not_started':
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  // Content shared between Sheet and Drawer
  const headerContent = (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xl font-semibold truncate">
            {guest.full_name}
          </span>
          {guest.is_vip && (
            <Tooltip>
              <TooltipTrigger>
                <Crown className="h-5 w-5 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent>VIP Guest</TooltipContent>
            </Tooltip>
          )}
          {guest.loyalty_tier && (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="text-primary border-primary/30">
                  <Star className="h-3 w-3 mr-1" />
                  {guest.loyalty_tier}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Loyalty member</TooltipContent>
            </Tooltip>
          )}
        </div>
        <Badge 
          variant="outline"
          className={cn('font-medium', statusVariantMap[status.variant])}
        >
          {status.label}
          {status.countdown && ` (${status.countdown})`}
        </Badge>
      </div>
    </div>
  );

  const bodyContent = (
    <div className="py-4 space-y-6">
      {/* Stay Info */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Stay Details</h3>
        
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm">Room</span>
            <button
              onClick={() => guest.room_number && handleCopy(guest.room_number, 'Room number')}
              className="ml-auto font-mono text-sm bg-muted px-2 py-1 rounded hover:bg-muted/80 flex items-center gap-1"
            >
              {guest.room_number || '-'}
              <Copy className="h-3 w-3 opacity-50" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm">
              {safeFormatDate(guest.check_in_date, 'EEE, MMM d')} → {safeFormatDate(guest.check_out_date, 'EEE, MMM d')}
            </span>
            <span className="ml-auto text-sm text-muted-foreground">{nights} nights</span>
          </div>

          {guest.booking_reference && (
            <div className="flex items-center gap-3">
              <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm">Booking Ref</span>
              <button
                onClick={() => handleCopy(guest.booking_reference!, 'Booking reference')}
                className="ml-auto font-mono text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                {guest.booking_reference}
                <Copy className="h-3 w-3 opacity-50" />
              </button>
            </div>
          )}

          {guest.channel && (
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm">Channel</span>
              <span className="ml-auto text-sm text-muted-foreground">{guest.channel}</span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Contact */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Contact</h3>
        
        <div className="flex gap-2">
          {guest.phone && (
            <Button variant="outline" size="sm" asChild className="flex-1">
              <a href={`tel:${guest.phone}`}>
                <Phone className="h-4 w-4 mr-2" />
                Call
              </a>
            </Button>
          )}
          {guest.email && (
            <Button variant="outline" size="sm" asChild className="flex-1">
              <a href={`mailto:${guest.email}`}>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </a>
            </Button>
          )}
        </div>

        {guest.email && (
          <p className="text-sm text-muted-foreground break-all">{guest.email}</p>
        )}
        {guest.phone && (
          <p className="text-sm text-muted-foreground">{guest.phone}</p>
        )}
      </div>

      <Separator />

      {/* Operational Flags */}
      {prearrivalEnabled && prearrivalStatus && (
        <>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Pre-Arrival Status</h3>
              {getPrearrivalBadge()}
            </div>
            
            <GuestPrearrivalQuickFlags 
              status={prearrivalStatus} 
              showUpdatedAt
            />
          </div>

          <Separator />
        </>
      )}

      {/* Notes */}
      {(guest.notes || guest.notes_internal) && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Notes</h3>
          
          {guest.notes && (
            <div className="text-sm p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Guest visible</p>
              <p>{guest.notes}</p>
            </div>
          )}
          
          {guest.notes_internal && (
            <div className="text-sm p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <p className="text-xs text-warning mb-1">Internal only</p>
              <p>{guest.notes_internal}</p>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      {!isReadOnly && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Quick Actions</h3>
          
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            
            {prearrivalEnabled && isFutureArrival && onSendEmail && (
              <Button variant="outline" size="sm" onClick={onSendEmail}>
                <Send className="h-4 w-4 mr-2" />
                Pre-Arrival
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const footerContent = (
    <Button 
      onClick={onNavigateToDetail} 
      className="w-full h-12"
    >
      <ExternalLink className="h-4 w-4 mr-2" />
      Open Full Profile
    </Button>
  );

  // Mobile: Bottom drawer (Vaul-style)
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="px-4 py-4 border-b">
            {headerContent}
          </DrawerHeader>
          
          <div className="flex-1 overflow-y-auto px-4">
            {bodyContent}
          </div>
          
          <DrawerFooter className="px-4 py-4 border-t" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
            {footerContent}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Side sheet
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b">
          {headerContent}
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          {bodyContent}
        </ScrollArea>

        <SheetFooter className="p-4 border-t">
          {footerContent}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
