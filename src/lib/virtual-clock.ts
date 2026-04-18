/**
 * Virtual Clock
 *
 * Per-visitor frozen "now" for the demo sandbox time capsule.
 *
 * - In demo: returns the timestamp the visitor entered. Never advances.
 * - Outside demo: returns real `Date.now()`.
 *
 * The frozen instant is set by `useDemoEnter` (from the `demo-enter` edge
 * function payload) and cleared by `useDemoExit` / `clearStoredDemoSlot`.
 *
 * Usage: every "is this in the past?" / "what is today?" decision-point
 * inside the app should call `getVirtualNow()` instead of `new Date()`.
 */

const VIRTUAL_NOW_KEY = 'propera_demo_virtual_now';

function readStoredVirtualNow(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(VIRTUAL_NOW_KEY);
    if (!raw) return null;
    const ms = Date.parse(raw);
    return Number.isFinite(ms) ? ms : null;
  } catch {
    return null;
  }
}

/** Return current "now" as a Date — frozen in demo, live otherwise. */
export function getVirtualNow(): Date {
  const frozen = readStoredVirtualNow();
  if (frozen != null) return new Date(frozen);
  return new Date();
}

/** Same as getVirtualNow() but returns epoch ms — useful for math. */
export function getVirtualNowMs(): number {
  return getVirtualNow().getTime();
}

/** Persist a frozen ISO timestamp (called once on demo entry). */
export function setVirtualNow(iso: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  try {
    if (!iso) {
      window.localStorage.removeItem(VIRTUAL_NOW_KEY);
      return;
    }
    window.localStorage.setItem(VIRTUAL_NOW_KEY, iso);
  } catch {
    /* ignore */
  }
}

/** Clear the frozen clock (called on demo exit). */
export function clearVirtualNow(): void {
  setVirtualNow(null);
}

/** Are we currently inside a demo session with a frozen clock? */
export function hasFrozenClock(): boolean {
  return readStoredVirtualNow() != null;
}
