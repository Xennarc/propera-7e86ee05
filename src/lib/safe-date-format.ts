import { format, parseISO, isValid } from 'date-fns';

/**
 * Safely format a date string, returning a fallback if the date is invalid.
 * Prevents crashes from malformed date data in the database.
 */
export function safeFormatDate(
  dateStr: string | null | undefined,
  formatStr: string,
  fallback: string = 'Invalid date'
): string {
  if (!dateStr) return fallback;
  
  try {
    const parsed = parseISO(dateStr);
    if (!isValid(parsed)) return fallback;
    
    // Additional sanity check for year range (1900-2100)
    const year = parsed.getFullYear();
    if (year < 1900 || year > 2100) return fallback;
    
    return format(parsed, formatStr);
  } catch {
    return fallback;
  }
}

/**
 * Safely parse a date string, returning null if invalid.
 */
export function safeParseDateISO(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  
  try {
    const parsed = parseISO(dateStr);
    if (!isValid(parsed)) return null;
    
    // Additional sanity check for year range (1900-2100)
    const year = parsed.getFullYear();
    if (year < 1900 || year > 2100) return null;
    
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Validate that a date string represents a valid, reasonable date.
 */
export function isValidDateString(dateStr: string | null | undefined): boolean {
  return safeParseDateISO(dateStr) !== null;
}
