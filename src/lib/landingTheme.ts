import { useSyncExternalStore } from 'react';

export type LandingTheme = 'glass' | 'skeuo';

const STORAGE_KEY = 'propera_landing_theme';

export function getLandingTheme(): LandingTheme {
  if (typeof window === 'undefined') return 'glass';

  const params = new URLSearchParams(window.location.search);
  const paramTheme = params.get('theme');
  if (paramTheme === 'glass') return 'glass';

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'glass') return 'glass';
  } catch {
    // localStorage blocked
  }

  return 'skeuo';
}

export function setLandingTheme(theme: LandingTheme) {
  try {
    if (theme === 'glass') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, theme);
    }
  } catch {
    // localStorage blocked
  }
}

export function isThemeDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('debugTheme') === '1';
}

// Reactive hook — reads from body[data-landing-theme]
function subscribe(cb: () => void) {
  const observer = new MutationObserver(cb);
  observer.observe(document.body, { attributes: true, attributeFilter: ['data-landing-theme'] });
  return () => observer.disconnect();
}

function getSnapshot(): LandingTheme {
  return (document.body.getAttribute('data-landing-theme') as LandingTheme) || 'skeuo';
}

function getServerSnapshot(): LandingTheme {
  return 'skeuo';
}

export function useLandingTheme(): LandingTheme {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
