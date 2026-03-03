import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useMediaQuery } from '@/hooks/use-media-query';
import { BookingDetailsHero } from './BookingDetailsHero';
import { BookingDetailsQuickActions } from './BookingDetailsQuickActions';
import { BookingDetailsInfo } from './BookingDetailsInfo';
import { BookingDetailsPolicies } from './BookingDetailsPolicies';
import { BookingDetailsTimeline } from './BookingDetailsTimeline';
import { GuestBookingStatusTracker } from '@/components/guest/GuestBookingStatusTracker';
import type { BookingDisplayModel, BookingDetailsExtended } from '@/types/booking-display';

interface BookingDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingDisplayModel | null;
  extendedDetails?: BookingDetailsExtended | null;
  isLoadingDetails?: boolean;
  onCancel?: () => void;
  onEdit?: () => void;
  isCancelling?: boolean;
}

function BookingDetailsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Status skeleton */}
      <Skeleton className="h-20 w-full rounded-xl" />
      
      {/* Header skeleton */}
      <div className="flex gap-4">
        <Skeleton className="h-16 w-16 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>

      {/* Date card skeleton */}
      <Skeleton className="h-32 w-full rounded-xl" />

      {/* Actions skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-11 flex-1" />
        <Skeleton className="h-11 flex-1" />
      </div>

      {/* Details skeleton */}
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

function BookingDetailsContent({
  booking,
  extendedDetails,
  isLoadingDetails,
  onCancel,
  onEdit,
  isCancelling,
}: Omit<BookingDetailsSheetProps, 'open' | 'onOpenChange'>) {
  if (!booking) {
    return <BookingDetailsSkeleton />;
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Live Status Tracker (for activity bookings) */}
      {booking.type === 'activity' && (
        <>
          <GuestBookingStatusTracker booking={booking} />
          <Separator />
        </>
      )}

      {/* Hero Section */}
      <BookingDetailsHero booking={booking} />

      {/* Quick Actions */}
      <BookingDetailsQuickActions
        booking={booking}
        onCancel={onCancel}
        onEdit={onEdit}
        isCancelling={isCancelling}
      />

      <Separator />

      {/* Key Details */}
      {isLoadingDetails ? (
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : (
        <BookingDetailsInfo booking={booking} extendedDetails={extendedDetails} />
      )}

      <Separator />

      {/* Policies */}
      <BookingDetailsPolicies booking={booking} extendedDetails={extendedDetails} />

      {/* Timeline (fallback for restaurant bookings) */}
      {booking.type !== 'activity' && (
        <BookingDetailsTimeline booking={booking} />
      )}
    </div>
  );
}

export function BookingDetailsSheet({
  open,
  onOpenChange,
  booking,
  extendedDetails,
  isLoadingDetails = false,
  onCancel,
  onEdit,
  isCancelling = false,
}: BookingDetailsSheetProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  // Use Sheet on desktop, Drawer on mobile
  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-lg p-0 overflow-hidden"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{booking?.title || 'Booking Details'}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-full">
            <div className="p-6">
              <BookingDetailsContent
                booking={booking}
                extendedDetails={extendedDetails}
                isLoadingDetails={isLoadingDetails}
                onCancel={onCancel}
                onEdit={onEdit}
                isCancelling={isCancelling}
              />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  // Mobile drawer
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="sr-only">
          <DrawerTitle>{booking?.title || 'Booking Details'}</DrawerTitle>
        </DrawerHeader>
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-4 pb-8">
            <BookingDetailsContent
              booking={booking}
              extendedDetails={extendedDetails}
              isLoadingDetails={isLoadingDetails}
              onCancel={onCancel}
              onEdit={onEdit}
              isCancelling={isCancelling}
            />
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
