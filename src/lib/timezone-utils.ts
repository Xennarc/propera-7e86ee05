/**
 * Timezone utilities for Propera
 * 
 * Core principle: Store all timestamps in UTC, display in resort timezone.
 * This ensures consistency across the platform and prevents timezone-related bugs.
 */

import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format, parseISO, isValid } from 'date-fns';
import { getVirtualNow } from './virtual-clock';

/**
 * Format a UTC timestamp for display in a specific timezone
 */
export function formatInResortTimezone(
  utcDate: Date | string | null | undefined,
  timezone: string,
  formatStr: string,
  fallback: string = 'Invalid date'
): string {
  if (!utcDate) return fallback;
  
  try {
    const date = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
    if (!isValid(date)) return fallback;
    
    return formatInTimeZone(date, timezone, formatStr);
  } catch {
    return fallback;
  }
}

/**
 * Convert a UTC timestamp to a Date object in the resort's timezone
 * Useful for comparisons and calculations in local time
 */
export function utcToResortTime(
  utcDate: Date | string | null | undefined,
  timezone: string
): Date | null {
  if (!utcDate) return null;
  
  try {
    const date = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
    if (!isValid(date)) return null;
    
    return toZonedTime(date, timezone);
  } catch {
    return null;
  }
}

/**
 * Convert a local resort time to UTC for storage
 * Use this when user inputs a time in their local timezone
 */
export function resortTimeToUtc(
  localDate: Date,
  timezone: string
): Date {
  return fromZonedTime(localDate, timezone);
}

/**
 * Get current time in a specific timezone.
 * Honors the demo sandbox's frozen clock when active.
 */
export function nowInTimezone(timezone: string): Date {
  return toZonedTime(getVirtualNow(), timezone);
}

/**
 * Format a date with time for display (e.g., "Jan 3, 2025 2:30 PM")
 */
export function formatResortDateTime(
  utcDate: Date | string | null | undefined,
  timezone: string,
  fallback: string = '--'
): string {
  return formatInResortTimezone(utcDate, timezone, 'MMM d, yyyy h:mm a', fallback);
}

/**
 * Format just the time for display (e.g., "2:30 PM")
 */
export function formatResortTime(
  utcDate: Date | string | null | undefined,
  timezone: string,
  fallback: string = '--'
): string {
  return formatInResortTimezone(utcDate, timezone, 'h:mm a', fallback);
}

/**
 * Format just the date for display (e.g., "Jan 3, 2025")
 */
export function formatResortDate(
  utcDate: Date | string | null | undefined,
  timezone: string,
  fallback: string = '--'
): string {
  return formatInResortTimezone(utcDate, timezone, 'MMM d, yyyy', fallback);
}

/**
 * Format a time string (HH:mm:ss) for display
 * Time strings are already in resort local time (from date + time columns)
 */
export function formatTimeString(
  timeStr: string | null | undefined,
  fallback: string = '--'
): string {
  if (!timeStr) return fallback;
  
  try {
    // Parse HH:mm:ss or HH:mm format
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch {
    return fallback;
  }
}

/**
 * Combine a date (YYYY-MM-DD) and time (HH:mm:ss) in resort timezone to UTC
 */
export function combineDateTimeToUtc(
  dateStr: string,
  timeStr: string,
  timezone: string
): Date {
  // Create a local datetime string
  const localDateTimeStr = `${dateStr}T${timeStr}`;
  const localDate = new Date(localDateTimeStr);
  
  return fromZonedTime(localDate, timezone);
}

/**
 * Get timezone abbreviation (e.g., "PST", "EST", "UTC+8")
 */
export function getTimezoneAbbreviation(timezone: string): string {
  try {
    return formatInTimeZone(new Date(), timezone, 'zzz');
  } catch {
    return timezone;
  }
}

/**
 * Common timezone options for resort configuration
 */
export const COMMON_TIMEZONES = [
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)' },
  { value: 'America/Denver', label: 'Mountain Time (MST/MDT)' },
  { value: 'America/Chicago', label: 'Central Time (CST/CDT)' },
  { value: 'America/New_York', label: 'Eastern Time (EST/EDT)' },
  { value: 'America/Sao_Paulo', label: 'Brasilia (BRT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European (CET/CEST)' },
  { value: 'Europe/Athens', label: 'Eastern European (EET/EEST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Indian/Maldives', label: 'Maldives (MVT)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Bangkok', label: 'Bangkok (ICT)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Pacific/Auckland', label: 'New Zealand (NZST/NZDT)' },
  { value: 'Pacific/Fiji', label: 'Fiji (FJT)' },
] as const;

/**
 * Validate a timezone string
 */
export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
