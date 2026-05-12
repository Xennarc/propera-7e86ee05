import { describe, it, expect } from 'vitest';
import { formatActivityBookingMessage } from './notifications';

describe('formatActivityBookingMessage', () => {
  it('formats correctly with all arguments provided', () => {
    const result = formatActivityBookingMessage(
      'Scuba Diving',
      '2023-11-20',
      '10:00 AM',
      'John Doe',
      '101'
    );

    expect(result).toEqual({
      guest: {
        pending: "We've received your request for Scuba Diving on 2023-11-20 at 10:00 AM. We'll confirm as soon as possible.",
        confirmed: "Your booking for Scuba Diving on 2023-11-20 at 10:00 AM is confirmed.",
        cancelled: "Your booking for Scuba Diving on 2023-11-20 at 10:00 AM has been cancelled. Please contact us if you need assistance.",
      },
      staff: {
        pending: "John Doe (Room 101) requested Scuba Diving on 2023-11-20 at 10:00 AM.",
      },
    });
  });

  it('formats correctly without optional arguments', () => {
    const result = formatActivityBookingMessage(
      'Spa Massage',
      '2023-12-01',
      '2:00 PM'
    );

    expect(result).toEqual({
      guest: {
        pending: "We've received your request for Spa Massage on 2023-12-01 at 2:00 PM. We'll confirm as soon as possible.",
        confirmed: "Your booking for Spa Massage on 2023-12-01 at 2:00 PM is confirmed.",
        cancelled: "Your booking for Spa Massage on 2023-12-01 at 2:00 PM has been cancelled. Please contact us if you need assistance.",
      },
      staff: {
        pending: "undefined (Room undefined) requested Spa Massage on 2023-12-01 at 2:00 PM.",
      },
    });
  });
});
