/**
 * Hook for staff-side booking cancellations with toast feedback.
 * Uses the centralized booking-service for actual cancellation logic.
 */

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  cancelActivityBooking, 
  cancelRestaurantReservation,
  type BookingResult 
} from '@/lib/booking-service';
import type { BookingStatus } from '@/types/database';
import { isBefore, parseISO } from 'date-fns';

export interface UseStaffBookingCancelReturn {
  cancelActivity: (bookingId: string, guestId: string) => Promise<BookingResult>;
  cancelReservation: (reservationId: string, guestId: string) => Promise<BookingResult>;
  isCancelling: boolean;
}

/**
 * Hook providing staff-side booking cancellation functionality.
 */
export function useStaffBookingCancel(): UseStaffBookingCancelReturn {
  const [isCancelling, setIsCancelling] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const cancelActivity = async (bookingId: string, guestId: string): Promise<BookingResult> => {
    setIsCancelling(true);
    try {
      const result = await cancelActivityBooking({
        bookingId,
        guestId,
        cancelledByUserId: user?.id,
      });

      if (result.success) {
        toast({
          title: 'Booking cancelled',
          description: 'The activity booking has been cancelled successfully.',
        });
      } else {
        toast({
          title: 'Cancellation failed',
          description: result.error || 'Could not cancel the booking.',
          variant: 'destructive',
        });
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast({
        title: 'Cancellation failed',
        description: message,
        variant: 'destructive',
      });
      return { success: false, error: message };
    } finally {
      setIsCancelling(false);
    }
  };

  const cancelReservation = async (reservationId: string, guestId: string): Promise<BookingResult> => {
    setIsCancelling(true);
    try {
      const result = await cancelRestaurantReservation({
        reservationId,
        guestId,
        cancelledByUserId: user?.id,
      });

      if (result.success) {
        toast({
          title: 'Reservation cancelled',
          description: 'The restaurant reservation has been cancelled successfully.',
        });
      } else {
        toast({
          title: 'Cancellation failed',
          description: result.error || 'Could not cancel the reservation.',
          variant: 'destructive',
        });
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast({
        title: 'Cancellation failed',
        description: message,
        variant: 'destructive',
      });
      return { success: false, error: message };
    } finally {
      setIsCancelling(false);
    }
  };

  return {
    cancelActivity,
    cancelReservation,
    isCancelling,
  };
}

/**
 * Check if a booking can be cancelled based on status and timing.
 * @param status - Current booking status
 * @param bookingDate - The date of the booking (YYYY-MM-DD)
 * @param bookingTime - The time of the booking (HH:MM:SS or HH:MM)
 * @param isPast - Whether the booking date is in the past
 * @returns true if cancellation is allowed
 */
export function canCancelBooking(
  status: BookingStatus | string,
  isPast: boolean = false
): boolean {
  // Only PENDING and CONFIRMED bookings can be cancelled
  const cancellableStatuses: Array<BookingStatus | string> = ['PENDING', 'CONFIRMED'];
  if (!cancellableStatuses.includes(status)) {
    return false;
  }

  // Past bookings cannot be cancelled
  if (isPast) {
    return false;
  }

  return true;
}
