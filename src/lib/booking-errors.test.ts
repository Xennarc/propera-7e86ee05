import { describe, it, expect } from 'vitest';
import {
  getBookingErrorMessage,
  createValidationError,
  createValidationSuccess,
  type BookingErrorCode
} from './booking-errors';

describe('booking-errors', () => {
  describe('getBookingErrorMessage', () => {
    it('returns the correct staff message for a known error code', () => {
      const message = getBookingErrorMessage('SESSION_NOT_FOUND', 'staff');
      expect(message).toBe('Activity session not found.');
    });

    it('returns the correct guest message for a known error code', () => {
      const message = getBookingErrorMessage('SESSION_NOT_FOUND', 'guest');
      expect(message).toBe('This activity is no longer available.');
    });

    it('defaults to staff context if not specified', () => {
      const message = getBookingErrorMessage('SESSION_NOT_FOUND');
      expect(message).toBe('Activity session not found.');
    });

    it('falls back to UNKNOWN_ERROR message for an invalid error code in staff context', () => {
      const message = getBookingErrorMessage('NON_EXISTENT_CODE' as BookingErrorCode, 'staff');
      expect(message).toBe('An unexpected error occurred. Please try again.');
    });

    it('falls back to UNKNOWN_ERROR message for an invalid error code in guest context', () => {
      const message = getBookingErrorMessage('NON_EXISTENT_CODE' as BookingErrorCode, 'guest');
      expect(message).toBe('Something went wrong. Please try again or contact reception.');
    });

    it('works for other specific codes like SLOT_FULL', () => {
      expect(getBookingErrorMessage('SLOT_FULL', 'staff')).toBe('This time slot is fully booked. Please choose another time or reduce the party size.');
      expect(getBookingErrorMessage('SLOT_FULL', 'guest')).toBe('This time slot is fully booked. Please choose another time.');
    });
  });

  describe('createValidationError', () => {
    it('returns a validation result with ok: false and the given error code', () => {
      const result = createValidationError('SESSION_FULL');
      expect(result).toEqual({
        ok: false,
        errorCode: 'SESSION_FULL',
        details: undefined
      });
    });

    it('includes details in the result if provided', () => {
      const details = 'Only 2 spots left';
      const result = createValidationError('SESSION_FULL', details);
      expect(result).toEqual({
        ok: false,
        errorCode: 'SESSION_FULL',
        details
      });
    });
  });

  describe('createValidationSuccess', () => {
    it('returns a validation result with ok: true', () => {
      const result = createValidationSuccess();
      expect(result).toEqual({ ok: true });
    });
  });
});
