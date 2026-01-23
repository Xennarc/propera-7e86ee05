/**
 * Session Time Utilities
 * 
 * Utilities for comparing session times against resort timezone.
 * Used to filter out past sessions in the guest portal.
 */

import { toZonedTime } from 'date-fns-tz';

/**
 * Check if a session has already started based on resort timezone.
 * 
 * @param sessionDate - The session date (YYYY-MM-DD)
 * @param sessionStartTime - The session start time (HH:mm:ss or HH:mm)
 * @param resortTimezone - The resort's IANA timezone (e.g., 'Indian/Maldives')
 * @returns true if the session has already started
 */
export function isSessionPast(
  sessionDate: string,
  sessionStartTime: string,
  resortTimezone: string = 'UTC'
): boolean {
  try {
    // Combine date and time into a local datetime string
    const localDateTimeStr = `${sessionDate}T${sessionStartTime}`;
    
    // Parse as a Date in the browser's local timezone first
    // Then we need to compare against "now" in the resort timezone
    const sessionLocalDate = new Date(localDateTimeStr);
    
    // Get current time in resort timezone
    const nowInResort = toZonedTime(new Date(), resortTimezone);
    
    // The session date+time is already in resort local time, so we compare directly
    // We need to interpret the session datetime as being in the resort timezone
    // Since we can't directly parse with timezone, we compare the components
    const [year, month, day] = sessionDate.split('-').map(Number);
    const timeParts = sessionStartTime.split(':').map(Number);
    const [hours, minutes] = timeParts;
    
    // Create date object for session in resort timezone context
    // We're comparing local representations
    const sessionYear = year;
    const sessionMonth = month - 1; // JS months are 0-indexed
    const sessionDay = day;
    
    // Compare year, month, day, hour, minute
    const nowYear = nowInResort.getFullYear();
    const nowMonth = nowInResort.getMonth();
    const nowDay = nowInResort.getDate();
    const nowHours = nowInResort.getHours();
    const nowMinutes = nowInResort.getMinutes();
    
    // First compare date
    if (sessionYear < nowYear) return true;
    if (sessionYear > nowYear) return false;
    
    if (sessionMonth < nowMonth) return true;
    if (sessionMonth > nowMonth) return false;
    
    if (sessionDay < nowDay) return true;
    if (sessionDay > nowDay) return false;
    
    // Same day - compare time
    const sessionTotalMinutes = hours * 60 + minutes;
    const nowTotalMinutes = nowHours * 60 + nowMinutes;
    
    return sessionTotalMinutes <= nowTotalMinutes;
  } catch (error) {
    console.error('Error checking if session is past:', error);
    // If we can't parse, assume session is not past (safer for user experience)
    return false;
  }
}

/**
 * Filter an array of sessions to only include upcoming ones.
 * 
 * @param sessions - Array of sessions with date and start_time
 * @param resortTimezone - The resort's IANA timezone
 * @returns Filtered array of upcoming sessions
 */
export function filterUpcomingSessions<T extends { date: string; start_time: string }>(
  sessions: T[],
  resortTimezone: string = 'UTC'
): T[] {
  return sessions.filter(session => 
    !isSessionPast(session.date, session.start_time, resortTimezone)
  );
}

/**
 * Count how many sessions were filtered out as past.
 * 
 * @param sessions - Array of sessions with date and start_time
 * @param resortTimezone - The resort's IANA timezone
 * @returns Count of sessions that are in the past
 */
export function countPastSessions<T extends { date: string; start_time: string }>(
  sessions: T[],
  resortTimezone: string = 'UTC'
): number {
  return sessions.filter(session => 
    isSessionPast(session.date, session.start_time, resortTimezone)
  ).length;
}
