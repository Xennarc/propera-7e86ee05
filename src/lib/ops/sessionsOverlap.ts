/**
 * Checks whether two time ranges overlap.
 * Times are HH:MM or HH:MM:SS strings (lexicographic comparison works).
 */
export function sessionsOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return aStart < bEnd && bStart < aEnd;
}
