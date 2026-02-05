import { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { TripRequestWithDetails } from '@/hooks/transport/useTripDetails';

export interface PassengerNotesIndicatorProps {
  request: TripRequestWithDetails;
  className?: string;
}

/**
 * Small "!" badge indicator that shows when a request has notes.
 * Tapping opens a dialog with the full notes text.
 */
export function PassengerNotesIndicator({
  request,
  className,
}: PassengerNotesIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Check if this request has any notes/instructions
  const hasNotes = Boolean(request.notes);
  const hasPickupDropoff = Boolean(request.pickup_text || request.dropoff_text);

  if (!hasNotes && !hasPickupDropoff) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent parent click handlers
    setIsOpen(true);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-7 w-7 rounded-full bg-amber-500/20 hover:bg-amber-500/30 shrink-0',
          className
        )}
        onClick={handleClick}
        aria-label="View special instructions"
      >
        <MessageSquare className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-amber-500" />
              Special Instructions
            </DialogTitle>
            <DialogDescription>
              {request.guest_name || 'Guest'}
              {request.room_number && ` • Room ${request.room_number}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Notes */}
            {request.notes && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Notes
                </p>
                <p className="text-sm whitespace-pre-wrap break-words bg-muted/50 p-3 rounded-lg">
                  {request.notes}
                </p>
              </div>
            )}

            {/* Pickup Text */}
            {request.pickup_text && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Pickup Location
                </p>
                <p className="text-sm bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 p-3 rounded-lg">
                  {request.pickup_text}
                </p>
              </div>
            )}

            {/* Dropoff Text */}
            {request.dropoff_text && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Dropoff Location
                </p>
                <p className="text-sm bg-blue-500/10 text-blue-700 dark:text-blue-300 p-3 rounded-lg">
                  {request.dropoff_text}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
