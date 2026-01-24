/**
 * Safe rendering utilities to prevent React error #300
 * ("Objects are not valid as a React child")
 */

/**
 * Safely convert any value to a renderable string.
 * Prevents React error #300 by ensuring objects/arrays are stringified.
 */
export function safeRenderValue(
  value: unknown,
  fallback: string = ''
): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(String).join(', ');
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return String(value);
}

/**
 * Safe string coercion with fallback.
 */
export function safeString(
  value: unknown,
  fallback: string = ''
): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
}

/**
 * Safe number extraction with fallback.
 */
export function safeNumber(
  value: unknown,
  fallback: number = 0
): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}
