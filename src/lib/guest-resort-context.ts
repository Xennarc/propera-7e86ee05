/**
 * Guest Resort Context Persistence
 *
 * Stores the last-used resort slug/id in localStorage so that
 * signed-out guests can be routed back to the correct resort login
 * page (instead of the generic "Find Resort" flow).
 *
 * This data survives logout intentionally.
 */

const STORAGE_KEY = 'propera_last_resort';

export interface LastResortContext {
  slug: string;
  id: string;
  name?: string;
}

/** Persist resort context (called after login / find-resort selection). */
export function saveLastResort(slug: string, id: string, name?: string): void {
  try {
    const ctx: LastResortContext = { slug, id, name };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
  } catch {
    // localStorage may be unavailable in some environments
  }
}

/** Retrieve saved resort context, or null if none. */
export function getLastResort(): LastResortContext | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastResortContext;
    if (parsed.slug && parsed.id) return parsed;
    return null;
  } catch {
    return null;
  }
}

/** Explicitly clear resort context (rarely needed). */
export function clearLastResort(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
