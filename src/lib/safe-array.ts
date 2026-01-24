/**
 * Safely coerce a value to a string array.
 * Handles: null, undefined, strings (wrap as single-item array), and actual arrays.
 */
export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }
  return [];
}
