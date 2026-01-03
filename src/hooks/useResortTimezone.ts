/**
 * Resort Timezone Hook
 * 
 * Provides timezone-aware date formatting for the current resort context.
 * All timestamps in the database are stored in UTC.
 * This hook provides helpers to display them in the resort's local timezone.
 */

import { useMemo, useCallback } from 'react';
import { useResortScope } from './sync/useResortScope';
import {
  formatInResortTimezone,
  formatResortDateTime,
  formatResortDate,
  formatResortTime,
  formatTimeString,
  utcToResortTime,
  resortTimeToUtc,
  nowInTimezone,
  combineDateTimeToUtc,
  getTimezoneAbbreviation,
} from '@/lib/timezone-utils';

export interface ResortTimezoneHelpers {
  /** The current resort's timezone (e.g., 'Asia/Singapore') */
  timezone: string;
  
  /** Timezone abbreviation (e.g., 'SGT', 'PST') */
  timezoneAbbr: string;
  
  /** Format a UTC date with custom format string */
  format: (date: Date | string | null | undefined, formatStr: string, fallback?: string) => string;
  
  /** Format as "Jan 3, 2025 2:30 PM" */
  formatDateTime: (date: Date | string | null | undefined, fallback?: string) => string;
  
  /** Format as "Jan 3, 2025" */
  formatDate: (date: Date | string | null | undefined, fallback?: string) => string;
  
  /** Format as "2:30 PM" */
  formatTime: (date: Date | string | null | undefined, fallback?: string) => string;
  
  /** Format a time string (HH:mm:ss) as "2:30 PM" */
  formatTimeStr: (timeStr: string | null | undefined, fallback?: string) => string;
  
  /** Convert UTC to resort local Date */
  toLocal: (utcDate: Date | string | null | undefined) => Date | null;
  
  /** Convert resort local Date to UTC */
  toUtc: (localDate: Date) => Date;
  
  /** Get current time in resort timezone */
  now: () => Date;
  
  /** Combine date (YYYY-MM-DD) and time (HH:mm:ss) to UTC */
  combineDateTimeToUtc: (dateStr: string, timeStr: string) => Date;
}

/**
 * Hook providing timezone-aware formatting helpers
 * 
 * Usage:
 * const { formatDateTime, formatDate, timezone } = useResortTimezone();
 * 
 * // Display a booking time
 * <span>{formatDateTime(booking.created_at)}</span>
 * 
 * // Show timezone indicator
 * <span className="text-muted-foreground">({timezoneAbbr})</span>
 */
export function useResortTimezone(): ResortTimezoneHelpers {
  const { timezone } = useResortScope();
  
  const timezoneAbbr = useMemo(
    () => getTimezoneAbbreviation(timezone),
    [timezone]
  );
  
  const format = useCallback(
    (date: Date | string | null | undefined, formatStr: string, fallback = '--') =>
      formatInResortTimezone(date, timezone, formatStr, fallback),
    [timezone]
  );
  
  const formatDateTimeFn = useCallback(
    (date: Date | string | null | undefined, fallback = '--') =>
      formatResortDateTime(date, timezone, fallback),
    [timezone]
  );
  
  const formatDateFn = useCallback(
    (date: Date | string | null | undefined, fallback = '--') =>
      formatResortDate(date, timezone, fallback),
    [timezone]
  );
  
  const formatTimeFn = useCallback(
    (date: Date | string | null | undefined, fallback = '--') =>
      formatResortTime(date, timezone, fallback),
    [timezone]
  );
  
  const toLocal = useCallback(
    (utcDate: Date | string | null | undefined) =>
      utcToResortTime(utcDate, timezone),
    [timezone]
  );
  
  const toUtc = useCallback(
    (localDate: Date) =>
      resortTimeToUtc(localDate, timezone),
    [timezone]
  );
  
  const now = useCallback(
    () => nowInTimezone(timezone),
    [timezone]
  );
  
  const combineDateTimeFn = useCallback(
    (dateStr: string, timeStr: string) =>
      combineDateTimeToUtc(dateStr, timeStr, timezone),
    [timezone]
  );
  
  return useMemo(
    () => ({
      timezone,
      timezoneAbbr,
      format,
      formatDateTime: formatDateTimeFn,
      formatDate: formatDateFn,
      formatTime: formatTimeFn,
      formatTimeStr: formatTimeString,
      toLocal,
      toUtc,
      now,
      combineDateTimeToUtc: combineDateTimeFn,
    }),
    [
      timezone,
      timezoneAbbr,
      format,
      formatDateTimeFn,
      formatDateFn,
      formatTimeFn,
      toLocal,
      toUtc,
      now,
      combineDateTimeFn,
    ]
  );
}
