/**
 * Session Time Utilities
 * 
 * Utilities for comparing session times against resort timezone.
 * Used to filter out past sessions in the guest portal.
 *
 * NOTE: All "now" reads route through `getVirtualNow()` so the demo
 * sandbox's frozen clock is honored.
 */

import { getVirtualNow } from './virtual-clock';

/**
 * Get the current "wall clock" time in the given IANA timezone as numeric parts.
 * Uses Intl.DateTimeFormat to avoid double-shift bugs from date-fns-tz getters.
 */
function nowPartsInTimezone(timezone: string): {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
} {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(getVirtualNow());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  let hour = get('hour');
  if (hour === 24) hour = 0; // some engines emit 24 for midnight
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour,
    minute: get('minute'),
  };
}

/**
 * Check if a session has already started based on resort timezone.
 *
 * @param sessionDate - The session date (YYYY-MM-DD) — interpreted in resort tz
 * @param sessionStartTime - The session start time (HH:mm:ss or HH:mm) — in resort tz
 * @param resortTimezone - The resort's IANA timezone (e.g., 'Indian/Maldives')
 * @returns true if the session has already started
 */
export function isSessionPast(
  sessionDate: string,
  sessionStartTime: string,
  resortTimezone: string = 'UTC'
): boolean {
  try {
    const [sy, sm, sd] = sessionDate.split('-').map(Number);
    const [sh, smin] = sessionStartTime.split(':').map(Number);
    if (!sy || !sm || !sd || Number.isNaN(sh) || Number.isNaN(smin)) return false;

    const now = nowPartsInTimezone(resortTimezone);

    // Compare as numeric tuples (year, month, day, hour, minute)
    const sessionTuple = [sy, sm, sd, sh, smin];
    const nowTuple = [now.year, now.month, now.day, now.hour, now.minute];

    for (let i = 0; i < sessionTuple.length; i++) {
      if (sessionTuple[i] < nowTuple[i]) return true;
      if (sessionTuple[i] > nowTuple[i]) return false;
    }
    // Exactly equal — treat as just started (past)
    return true;
  } catch (error) {
    console.error('Error checking if session is past:', error);
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
